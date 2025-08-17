from flask import Response, render_template, request, jsonify
from app import app, metrics, cache
from app.calculator import CalculatorServiceV2, rate_limit, get_client_id
from app.models import (
    RouteRequest, TimeRequest, VehicleRequest, BodyType, 
    VehicleDatabase, CalculationResult
)
from app.order_models import order_storage, OrderStatus, PaymentMethod, Order
from app.media_models import media_database, MediaType, MediaCategory
from app.config_manager import config_manager

def validate_duration_hours(duration_hours: int) -> tuple[bool, str]:
    """Валидация длительности на основе конфигурации"""
    try:
        limits = config_manager.get_calculator_limits()
        min_duration = limits.get('min_duration_hours', 1)
        max_duration = limits.get('max_duration_hours', 24)
        
        if duration_hours < min_duration or duration_hours > max_duration:
            return False, f'Duration must be between {min_duration} and {max_duration} hours'
        
        return True, ''
    except Exception as e:
        app.logger.error(f"Error validating duration: {e}")
        # Fallback к старым значениям
        if duration_hours < 1 or duration_hours > 24:
            return False, 'Duration must be between 1 and 24 hours'
        return True, ''
# Импорт функции для отправки в телеграм (опционально)
try:
    from telegram_service.telegram_bot_standalone import send_order_to_telegram
except ImportError:
    # Если модуль недоступен, создаем заглушку
    def send_order_to_telegram(order_data):
        print(f"Telegram bot not available, would send: {order_data}")
        return False

import json
import requests
from datetime import datetime
from typing import Dict, Any
import os
import logging

logger = logging.getLogger(__name__)

@app.route('/')
def index():
    """Главная страница приложения"""
    return render_template('index.html')

@app.route('/health')
def health():
    """Простая проверка здоровья приложения"""
    return jsonify({'status': 'healthy', 'message': 'Application is running'})

@app.route('/api/v2/calculator/step1', methods=['POST'])
@rate_limit(max_requests=20, window_seconds=60)
def api_step1_v2():
    """API для расчета стоимости маршрута и времени"""
    try:
        data = request.get_json()
        
        # Валидация входных данных
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Извлечение данных
        from_address = data.get('from_address', '').strip()
        to_address = data.get('to_address', '').strip()
        
        # [ИСПРАВЛЕНО] Преобразование типов для числовых полей
        distance_raw = data.get('distance')
        if distance_raw is not None and distance_raw != '':
            try:
                distance = float(distance_raw)
            except (ValueError, TypeError):
                distance = None
        else:
            distance = None
            
        pickup_time = data.get('pickup_time')
        
        try:
            duration_hours = int(data.get('duration_hours', 1))
        except (ValueError, TypeError):
            duration_hours = 1
            
        urgent_pickup = bool(data.get('urgent_pickup', False))
        
        # Валидация обязательных полей
        if not from_address or not to_address:
            return jsonify({'error': 'From and to addresses are required'}), 400
        
        if not pickup_time:
            return jsonify({'error': 'Pickup time is required'}), 400
        
        # Валидация длительности на основе конфигурации
        is_valid, error_message = validate_duration_hours(duration_hours)
        if not is_valid:
            return jsonify({'error': error_message}), 400
        
        # Создание объектов запроса
        route_request = RouteRequest(
            from_address=from_address,
            to_address=to_address,
            distance=distance
        )
        
        time_request = TimeRequest(
            pickup_time=pickup_time,
            duration_hours=duration_hours,
            urgent_pickup=urgent_pickup
        )
        
        # Расчет стоимости
        result = CalculatorServiceV2.calculate_step1(route_request, time_request)
        
        # Логирование запроса
        app.logger.info(f"Step1 calculation: {from_address} -> {to_address}, duration: {duration_hours}h")
        
        return jsonify({
            'success': True,
            'data': result,
            'client_id': get_client_id()
        })
        
    except Exception as e:
        app.logger.error(f"Step1 error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/calculator/step2', methods=['POST'])
@rate_limit(max_requests=30, window_seconds=60)
def api_step2_v2():
    """API для получения доступного транспорта"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Извлечение данных
        try:
            passengers = int(data.get('passengers', 0))
        except (ValueError, TypeError):
            passengers = 0
            
        try:
            loaders = int(data.get('loaders', 0))
        except (ValueError, TypeError):
            loaders = 0
            
        # Преобразование height и length в float или None
        height_raw = data.get('height')
        if height_raw is not None and height_raw != '' and height_raw != 'any':
            try:
                height = float(height_raw)
            except (ValueError, TypeError):
                height = None
        else:
            height = None
            
        length_raw = data.get('length')
        if length_raw is not None and length_raw != '' and length_raw != 'any':
            try:
                length = float(length_raw)
            except (ValueError, TypeError):
                length = None
        else:
            length = None
            
        body_type_str = data.get('body_type', 'any')
        
        # Валидация
        if passengers < 0 or passengers > 20:
            return jsonify({'error': 'Passengers must be between 0 and 20'}), 400
        
        if loaders < 0 or loaders > 10:
            return jsonify({'error': 'Loaders must be between 0 and 10'}), 400
        
        # Преобразование типа кузова
        try:
            body_type = BodyType(body_type_str)
        except ValueError:
            body_type = BodyType.ANY
        
        # Создание объекта запроса
        vehicle_request = VehicleRequest(
            passengers=passengers,
            loaders=loaders,
            height=height,
            length=length,
            body_type=body_type
        )
        
        # Получение доступного транспорта
        vehicles = CalculatorServiceV2.calculate_step2(vehicle_request)
        
        # Логирование
        app.logger.info(f"Step2 vehicles found: {len(vehicles)} for {passengers} passengers, {loaders} loaders")
        
        return jsonify({
            'success': True,
            'data': {
                'vehicles': vehicles,
                'count': len(vehicles)
            },
            'client_id': get_client_id()
        })
        
    except Exception as e:
        app.logger.error(f"Step2 error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/calculator/step3', methods=['POST'])
@rate_limit(max_requests=15, window_seconds=60)
def api_step3_v2():
    """API для расчета итоговой стоимости"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Извлечение данных
        step1_result = data.get('step1_result')
        
        # [ИСПРАВЛЕНО] Преобразование типов для числовых полей
        try:
            selected_vehicle_id = int(data.get('selected_vehicle_id'))
        except (ValueError, TypeError):
            selected_vehicle_id = None
            
        try:
            loaders = int(data.get('loaders', 0))
        except (ValueError, TypeError):
            loaders = 0
            
        try:
            duration_hours = int(data.get('duration_hours', 1))
        except (ValueError, TypeError):
            duration_hours = 1
        
        # Валидация
        if not step1_result or not isinstance(step1_result, dict):
            return jsonify({'error': 'Step1 result is required'}), 400
        
        if not selected_vehicle_id:
            return jsonify({'error': 'Valid vehicle ID is required'}), 400
        
        # Получение выбранного транспорта
        vehicle_db = VehicleDatabase()
        selected_vehicle = vehicle_db.get_vehicle_by_id(selected_vehicle_id)
        
        if not selected_vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404
        
        # Расчет итоговой стоимости
        breakdown = CalculatorServiceV2.calculate_step3(
            step1_result,
            selected_vehicle,
            loaders,
            duration_hours
        )
        
        # Логирование
        app.logger.info(f"Step3 calculation: vehicle {selected_vehicle_id}, total: {breakdown['total']}")
        
        return jsonify({
            'success': True,
            'data': {
                'breakdown': breakdown,
                'selected_vehicle': selected_vehicle.to_dict()
            },
            'client_id': get_client_id()
        })
        
    except Exception as e:
        app.logger.error(f"Step3 error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/calculator/complete', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=60)
def api_complete_calculation():
    """API для полного расчета всех этапов"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Извлечение данных для всех этапов
        # Шаг 1
        from_address = data.get('from_address', '').strip()
        to_address = data.get('to_address', '').strip()
        distance = data.get('distance')
        pickup_time = data.get('pickup_time')
        duration_hours = data.get('duration_hours', 1)
        urgent_pickup = data.get('urgent_pickup', False)
        
        # Шаг 2
        passengers = data.get('passengers', 0)
        loaders = data.get('loaders', 0)
        height = data.get('height')
        length = data.get('length')
        body_type_str = data.get('body_type', 'any')
        
        # Шаг 3
        selected_vehicle_id = data.get('selected_vehicle_id')
        
        # Валидация
        if not all([from_address, to_address, pickup_time, selected_vehicle_id]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Валидация длительности на основе конфигурации
        try:
            duration_hours = int(duration_hours)
        except (ValueError, TypeError):
            duration_hours = 1
        
        is_valid, error_message = validate_duration_hours(duration_hours)
        if not is_valid:
            return jsonify({'error': error_message}), 400
        
        # Создание объектов запроса
        route_request = RouteRequest(
            from_address=from_address,
            to_address=to_address,
            distance=distance
        )
        
        time_request = TimeRequest(
            pickup_time=pickup_time,
            duration_hours=duration_hours,
            urgent_pickup=urgent_pickup
        )
        
        try:
            body_type = BodyType(body_type_str)
        except ValueError:
            body_type = BodyType.ANY
        
        vehicle_request = VehicleRequest(
            passengers=passengers,
            loaders=loaders,
            height=height,
            length=length,
            body_type=body_type
        )
        
        # Полный расчет
        result = CalculatorServiceV2.calculate_complete(
            route_request,
            time_request,
            vehicle_request,
            selected_vehicle_id
        )
        
        # Логирование
        app.logger.info(f"Complete calculation: {from_address} -> {to_address}, total: {result.step3_total}")
        
        return jsonify({
            'success': True,
            'data': result.to_dict(),
            'client_id': get_client_id()
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        app.logger.error(f"Complete calculation error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/vehicles', methods=['GET'])
@rate_limit(max_requests=50, window_seconds=60)
def api_get_vehicles():
    """API для получения всех доступных транспортных средств"""
    try:
        vehicle_db = VehicleDatabase()
        vehicles = vehicle_db.get_all_vehicles()
        
        return jsonify({
            'success': True,
            'data': {
                'vehicles': [v.to_dict() for v in vehicles],
                'count': len(vehicles)
            }
        })
        
    except Exception as e:
        app.logger.error(f"Get vehicles error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/vehicles/<int:vehicle_id>', methods=['GET'])
@rate_limit(max_requests=50, window_seconds=60)
def api_get_vehicle(vehicle_id: int):
    """API для получения конкретного транспортного средства"""
    try:
        vehicle_db = VehicleDatabase()
        vehicle = vehicle_db.get_vehicle_by_id(vehicle_id)
        
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404
        
        return jsonify({
            'success': True,
            'data': vehicle.to_dict()
        })
        
    except Exception as e:
        app.logger.error(f"Get vehicle error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/calculator/rate-limit-status', methods=['GET'])
def api_rate_limit_status():
    """API для проверки статуса ограничения запросов"""
    try:
        client_id = get_client_id()
        
        # Создаем временный лимитер для проверки
        from app.calculator import RateLimiter
        limiter = RateLimiter(max_requests=10, window_seconds=60)
        remaining = limiter.get_remaining_requests(client_id)
        
        return jsonify({
            'success': True,
            'data': {
                'client_id': client_id,
                'remaining_requests': remaining,
                'max_requests': 10,
                'window_seconds': 60
            }
        })
        
    except Exception as e:
        app.logger.error(f"Rate limit status error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/health', methods=['GET'])
def api_health_v2():
    """API для проверки здоровья системы"""
    try:
        # Проверяем доступность кэша
        cache_status = "healthy"
        try:
            cache.set('health_check', 'ok', timeout=10)
            test_value = cache.get('health_check')
            if test_value != 'ok':
                cache_status = "unhealthy"
        except Exception:
            cache_status = "unhealthy"
        
        # Проверяем базу транспорта
        vehicle_db = VehicleDatabase()
        vehicles_count = len(vehicle_db.get_all_vehicles())
        
        return jsonify({
            'status': 'healthy',
            'version': '2.0',
            'services': {
                'cache': cache_status,
                'vehicle_database': 'healthy' if vehicles_count > 0 else 'unhealthy'
            },
            'metrics': {
                'vehicles_count': vehicles_count
            }
        })
        
    except Exception as e:
        app.logger.error(f"Health check error: {str(e)}")
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

@app.route('/api/v2/proxy/osrm', methods=['GET'])
@rate_limit(max_requests=50, window_seconds=60)
def api_proxy_osrm():
    """Прокси для OSRM API для избежания CORS проблем"""
    try:
        # Получаем параметры из запроса
        coordinates = request.args.get('coordinates')
        profile = request.args.get('profile', 'driving')
        overview = request.args.get('overview', 'false')
        steps = request.args.get('steps', 'false')
        
        if not coordinates:
            return jsonify({'error': 'Coordinates parameter is required'}), 400
        
        # Формируем URL для OSRM API
        osrm_url = f"https://router.project-osrm.org/route/v1/{profile}/{coordinates}"
        
        # Добавляем параметры запроса
        params = {
            'overview': overview,
            'steps': steps
        }
        
        # Выполняем запрос к OSRM API
        response = requests.get(osrm_url, params=params, timeout=10)
        
        # Проверяем статус ответа
        if response.status_code != 200:
            app.logger.error(f"OSRM API error: {response.status_code} - {response.text}")
            return jsonify({'error': f'OSRM API error: {response.status_code}'}), response.status_code
        
        # Возвращаем данные от OSRM API
        return Response(
            response.content,
            status=200,
            headers={'Content-Type': 'application/json'}
        )
        
    except requests.exceptions.Timeout:
        app.logger.error("OSRM API timeout")
        return jsonify({'error': 'OSRM API timeout'}), 504
    except requests.exceptions.RequestException as e:
        app.logger.error(f"OSRM API request error: {str(e)}")
        return jsonify({'error': 'OSRM API request failed'}), 502
    except Exception as e:
        app.logger.error(f"OSRM proxy error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/proxy/nominatim', methods=['GET'])
@rate_limit(max_requests=50, window_seconds=60)
def api_proxy_nominatim():
    """Прокси для Nominatim API для геокодирования"""
    try:
        # Получаем параметры из запроса
        q = request.args.get('q')  # Поиск по адресу
        lat = request.args.get('lat')  # Обратное геокодирование
        lon = request.args.get('lon')  # Обратное геокодирование
        format_type = request.args.get('format', 'json')
        
        if not q and not (lat and lon):
            return jsonify({'error': 'Either q parameter or lat/lon parameters are required'}), 400
        
        # Формируем URL для Nominatim API
        nominatim_url = "https://nominatim.openstreetmap.org/search"
        
        # Добавляем параметры запроса
        params = {
            'format': format_type,
            'limit': 5,
            'addressdetails': 1
        }
        
        if q:
            params['q'] = q
        else:
            params['lat'] = lat
            params['lon'] = lon
            nominatim_url = "https://nominatim.openstreetmap.org/reverse"
        
        # Добавляем User-Agent для соблюдения правил использования Nominatim
        headers = {
            'User-Agent': 'TransportCompany/1.0 (https://transportcompany.com)'
        }
        
        # Выполняем запрос к Nominatim API
        response = requests.get(nominatim_url, params=params, headers=headers, timeout=10)
        
        # Проверяем статус ответа
        if response.status_code != 200:
            app.logger.error(f"Nominatim API error: {response.status_code} - {response.text}")
            return jsonify({'error': f'Nominatim API error: {response.status_code}'}), response.status_code
        
        # Возвращаем данные от Nominatim API
        return Response(
            response.content,
            status=200,
            headers={'Content-Type': 'application/json'}
        )
        
    except requests.exceptions.Timeout:
        app.logger.error("Nominatim API timeout")
        return jsonify({'error': 'Nominatim API timeout'}), 504
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Nominatim API request error: {str(e)}")
        return jsonify({'error': 'Nominatim API request failed'}), 502
    except Exception as e:
        app.logger.error(f"Nominatim proxy error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/callback-request', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=60)
def api_create_callback_request():
    """API для создания заявки на перезвон"""
    try:
        data = request.get_json()
        app.logger.info(f"CALLBACK REQUEST DATA: {data}")
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Извлечение данных клиента
        customer_name = data.get('customer_name', '').strip()
        customer_phone = data.get('customer_phone', '').strip()

        # Валидация обязательных полей
        if not customer_name:
            return jsonify({'error': 'Customer name is required'}), 400
        if not customer_phone:
            return jsonify({'error': 'Customer phone is required'}), 400

        # Создаем заявку на перезвон
        callback_order = Order(
            customer_name=customer_name,
            customer_phone=customer_phone,
            from_address='Заявка на перезвон',
            to_address='Заявка на перезвон',
            pickup_time=datetime.now().isoformat(),
            duration_hours=0,
            passengers=0,
            loaders=0,
            selected_vehicle={},
            total_cost=0,
            order_notes='Заявка на перезвон в течение 8 секунд',
            payment_method=PaymentMethod.CASH,
            status=OrderStatus.NEW
        )

        # Добавляем тип заявки
        callback_order.order_type = 'callback'

        # Сохраняем заявку
        order_id = order_storage.add_order(callback_order)
        callback_order.id = order_id

        # Отправляем в телеграм
        order_data = callback_order.to_dict()
        order_data['order_type'] = 'callback'
        
        telegram_sent = send_telegram_message_direct(order_data)
        if telegram_sent:
            callback_order.mark_telegram_sent()
            order_storage.update_order(callback_order)

        app.logger.info(f"Callback request created: {order_id}")
        
        return jsonify({
            'success': True,
            'order_id': order_id,
            'message': 'Заявка на перезвон успешно создана'
        }), 201

    except Exception as e:
        app.logger.error(f"Error creating callback request: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/orders', methods=['POST'])
@rate_limit(max_requests=20, window_seconds=60)
def api_create_order():
    """API для создания новой заявки (теперь с серверным перерасчётом)"""
    try:
        data = request.get_json()
        app.logger.info(f"RAW ORDER DATA: {data}")
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Извлечение данных клиента
        customer_name = data.get('customer_name', '').strip()
        customer_phone = data.get('customer_phone', '').strip()
        order_notes = data.get('order_notes', '').strip()
        payment_method_str = data.get('payment_method', 'online')

        # Извлечение исходных параметров заказа (теперь только snake_case)
        from_address = data.get('from_address', '').strip()
        to_address = data.get('to_address', '').strip()
        pickup_time = data.get('pickup_time')
        
        # [ИСПРАВЛЕНО] Преобразование типов для числовых полей
        try:
            duration_hours = int(data.get('duration_hours', 1))
        except (ValueError, TypeError):
            duration_hours = 1
            
        urgent_pickup = bool(data.get('urgent_pickup', False))
        
        try:
            passengers = int(data.get('passengers', 0))
        except (ValueError, TypeError):
            passengers = 0
            
        try:
            loaders = int(data.get('loaders', 0))
        except (ValueError, TypeError):
            loaders = 0
            
        # Преобразование height и length в float или None
        height_raw = data.get('height')
        if height_raw is not None and height_raw != '' and height_raw != 'any':
            try:
                height = float(height_raw)
            except (ValueError, TypeError):
                height = None
        else:
            height = None
            
        length_raw = data.get('length')
        if length_raw is not None and length_raw != '' and length_raw != 'any':
            try:
                length = float(length_raw)
            except (ValueError, TypeError):
                length = None
        else:
            length = None
            
        body_type_str = data.get('body_type', 'any')
        
        try:
            selected_vehicle_id = int(data.get('selected_vehicle_id'))
        except (ValueError, TypeError):
            selected_vehicle_id = None
            
        # [НОВОЕ] Добавляем извлечение стоимости дополнительных услуг
        try:
            additional_services_cost = float(data.get('additional_services_cost', 0))
        except (ValueError, TypeError):
            additional_services_cost = 0.0
            
        # [ИСПРАВЛЕНО] Добавляем извлечение расстояния от фронтенда
        distance_raw = data.get('distance')
        if distance_raw is not None and distance_raw != '':
            try:
                distance = float(distance_raw)
            except (ValueError, TypeError):
                distance = None
        else:
            distance = None

        # Валидация обязательных полей
        if not customer_name:
            return jsonify({'error': 'Customer name is required'}), 400
        if not customer_phone:
            return jsonify({'error': 'Customer phone is required'}), 400
        if not from_address or not to_address:
            return jsonify({'error': 'From and to addresses are required'}), 400
        if not pickup_time:
            return jsonify({'error': 'Pickup time is required'}), 400
        if not selected_vehicle_id:
            return jsonify({'error': 'Selected vehicle is required'}), 400
        
        # Валидация длительности на основе конфигурации
        is_valid, error_message = validate_duration_hours(duration_hours)
        if not is_valid:
            return jsonify({'error': error_message}), 400

        # Валидация метода оплаты
        try:
            payment_method = PaymentMethod(payment_method_str)
        except ValueError:
            return jsonify({'error': 'Invalid payment method'}), 400

        # Преобразование типа кузова
        try:
            body_type = BodyType(body_type_str)
        except ValueError:
            body_type = BodyType.ANY

        # Создание объектов запроса
        route_request = RouteRequest(
            from_address=from_address,
            to_address=to_address,
            distance=distance  # [ИСПРАВЛЕНО] Используем расстояние от фронтенда
        )
        time_request = TimeRequest(
            pickup_time=pickup_time,
            duration_hours=duration_hours,
            urgent_pickup=urgent_pickup
        )
        vehicle_request = VehicleRequest(
            passengers=passengers,
            loaders=loaders,
            height=height,
            length=length,
            body_type=body_type
        )

        # Серверный перерасчёт заказа
        try:
            # [НОВОЕ] Сначала получаем step1 и step2 результаты
            step1_result = CalculatorServiceV2.calculate_step1(route_request, time_request)
            step2_result = CalculatorServiceV2.calculate_step2(vehicle_request)
            
            # Получаем выбранный транспорт
            vehicle_db = VehicleDatabase()
            selected_vehicle = vehicle_db.get_vehicle_by_id(selected_vehicle_id)
            
            if not selected_vehicle:
                raise ValueError(f"Vehicle with ID {selected_vehicle_id} not found")
            
            # [НОВОЕ] Выполняем step3 с учётом дополнительных услуг
            step3_result = CalculatorServiceV2.calculate_step3(
                step1_result,
                selected_vehicle,
                loaders,
                duration_hours,
                additional_services_cost  # Передаём стоимость дополнительных услуг
            )
            
            # Создаём результат вручную
            calculation_result = CalculationResult(
                step1_price=step1_result['total'],
                step2_vehicles=[selected_vehicle],
                step3_total=step3_result['total'],
                breakdown=step3_result
            )
            
        except Exception as e:
            app.logger.error(f"Order calculation error: {str(e)}")
            return jsonify({'error': 'Order calculation failed', 'details': str(e)}), 400

        # Определяем тип заявки
        order_type = "urgent" if urgent_pickup else "regular"
        
        # Формируем Order только на основе серверного расчёта
        from app.order_models import Order
        order = Order(
            id=None,
            customer_name=customer_name,
            customer_phone=customer_phone,
            from_address=from_address,
            to_address=to_address,
            pickup_time=pickup_time,
            duration_hours=duration_hours,
            passengers=passengers,
            loaders=loaders,
            selected_vehicle=calculation_result.step2_vehicles[0].to_dict() if calculation_result.step2_vehicles else {},
            total_cost=calculation_result.step3_total,  # Используем валидированную цену от backend
            order_notes=order_notes,
            payment_method=payment_method,
            order_type=order_type
        )

        # Сохраняем заявку
        order_id = order_storage.add_order(order)

        # [ИСПРАВЛЕНО] Отправляем уведомление в телеграм с валидированной ценой
        order_data = order.to_dict()
        order_data['order_type'] = order_type  # Добавляем тип заявки
        app.logger.info(f"Attempting to send order {order_id} to Telegram. Order data: {order_data}")
        app.logger.info(f"✅ Using validated total_cost: {calculation_result.step3_total} for Telegram")
        
        telegram_sent = send_telegram_message_direct(order_data)

        if telegram_sent:
            order.mark_telegram_sent()
            order_storage.update_order(order)
            app.logger.info(f"✅ Telegram notification sent successfully for order {order_id}")
        else:
            app.logger.error(f"❌ Failed to send Telegram notification for order {order_id}")

        # Логирование
        app.logger.info(f"Order created: {order_id}, customer: {customer_name}, phone: {customer_phone}, total_cost: {order.total_cost}")

        return jsonify({
            'success': True,
            'order_id': order_id,
            'telegram_sent': telegram_sent,
            'message': 'Order created successfully',
            # [НОВОЕ] Возвращаем валидированную цену frontend
            'validated_total_cost': calculation_result.step3_total
        })

    except Exception as e:
        app.logger.error(f"Order creation error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/orders/<order_id>', methods=['GET'])
@rate_limit(max_requests=20, window_seconds=60)
def api_get_order(order_id):
    """API для получения заявки по ID"""
    try:
        order = order_storage.get_order(order_id)
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        return jsonify({
            'success': True,
            'order': order.to_dict()
        })
        
    except Exception as e:
        app.logger.error(f"Get order error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/orders/<order_id>/status', methods=['PUT'])
@rate_limit(max_requests=10, window_seconds=60)
def api_update_order_status(order_id):
    """API для обновления статуса заявки"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        new_status_str = data.get('status')
        if not new_status_str:
            return jsonify({'error': 'Status is required'}), 400
        
        # Валидация статуса
        try:
            new_status = OrderStatus(new_status_str)
        except ValueError:
            return jsonify({'error': 'Invalid status'}), 400
        
        # Получаем заявку
        order = order_storage.get_order(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Обновляем статус
        order.update_status(new_status)
        order_storage.update_order(order)
        
        app.logger.info(f"Order {order_id} status updated to {new_status.value}")
        
        return jsonify({
            'success': True,
            'order_id': order_id,
            'status': new_status.value,
            'message': 'Order status updated successfully'
        })
        
    except Exception as e:
        app.logger.error(f"Update order status error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/orders', methods=['GET'])
@rate_limit(max_requests=30, window_seconds=60)
def api_get_orders():
    """API для получения списка заявок с фильтрацией"""
    try:
        # Параметры фильтрации
        status = request.args.get('status')
        customer_phone = request.args.get('customer_phone')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Получаем заявки
        if status:
            try:
                status_enum = OrderStatus(status)
                orders = order_storage.get_orders_by_status(status_enum)
            except ValueError:
                return jsonify({'error': 'Invalid status'}), 400
        elif customer_phone:
            orders = order_storage.get_orders_by_customer(customer_phone)
        else:
            orders = order_storage.get_all_orders()
        
        # Сортируем по дате создания (новые сначала)
        orders.sort(key=lambda x: x.created_at, reverse=True)
        
        # Применяем пагинацию
        total_count = len(orders)
        orders = orders[offset:offset + limit]
        
        return jsonify({
            'success': True,
            'orders': [order.to_dict() for order in orders],
            'total_count': total_count,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        app.logger.error(f"Get orders error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/orders/stats', methods=['GET'])
@rate_limit(max_requests=20, window_seconds=60)
def api_get_orders_stats():
    """API для получения статистики по заявкам"""
    try:
        all_orders = order_storage.get_all_orders()
        recent_orders = order_storage.get_recent_orders(24)  # За последние 24 часа
        
        # Статистика по статусам
        status_stats = {}
        for status in OrderStatus:
            status_stats[status.value] = len([o for o in all_orders if o.status == status])
        
        # Статистика по методам оплаты
        payment_stats = {}
        for payment in PaymentMethod:
            payment_stats[payment.value] = len([o for o in all_orders if o.payment_method == payment])
        
        # Общая статистика
        total_orders = len(all_orders)
        total_recent = len(recent_orders)
        total_revenue = sum(order.total_cost for order in all_orders)
        recent_revenue = sum(order.total_cost for order in recent_orders)
        
        return jsonify({
            'success': True,
            'stats': {
                'total_orders': total_orders,
                'recent_orders_24h': total_recent,
                'total_revenue': total_revenue,
                'recent_revenue_24h': recent_revenue,
                'status_distribution': status_stats,
                'payment_distribution': payment_stats
            }
        })
        
    except Exception as e:
        app.logger.error(f"Get orders stats error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/telegram/test', methods=['POST'])
@rate_limit(max_requests=3, window_seconds=60)
def api_test_telegram():
    """API для тестирования отправки в телеграм"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Отправляем тестовое сообщение
        telegram_sent = send_telegram_message_direct(data)
        
        return jsonify({
            'success': True,
            'telegram_sent': telegram_sent,
            'message': 'Test message sent to Telegram' if telegram_sent else 'Failed to send test message'
        })
        
    except Exception as e:
        app.logger.error(f"Telegram test error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def send_telegram_message_direct(order_data: Dict[str, Any]) -> bool:
    """Прямая отправка сообщения в Telegram через HTTP API"""
    try:
        bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        
        # Определяем chat_id в зависимости от типа заявки
        order_type = order_data.get('order_type', 'regular')
        
        if order_type == 'urgent':
            chat_id = os.getenv('TELEGRAM_URGENT_CHAT_ID')
        elif order_type == 'callback':
            chat_id = os.getenv('TELEGRAM_CALLBACK_CHAT_ID')
        else:
            chat_id = os.getenv('TELEGRAM_CHAT_ID')
        
        app.logger.info(f"Telegram sending - Bot token: {'SET' if bot_token else 'NOT SET'}, Chat ID: {'SET' if chat_id else 'NOT SET'}, Order type: {order_type}")
        
        if not bot_token or not chat_id:
            logger.error(f"TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не установлены для типа заявки: {order_type}")
            return False
        
        # Формируем сообщение
        message = format_order_message(order_data)
        app.logger.info(f"Formatted Telegram message length: {len(message)} characters")
        
        # Отправляем через Telegram API
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        data = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        
        app.logger.info(f"Sending Telegram request to: {url}")
        response = requests.post(url, json=data, timeout=10)
        
        app.logger.info(f"Telegram API response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                app.logger.info(f"Telegram сообщение отправлено успешно. Message ID: {result['result']['message_id']}")
                return True
            else:
                app.logger.error(f"Ошибка Telegram API: {result.get('description')}")
                return False
        else:
            app.logger.error(f"HTTP ошибка при отправке в Telegram: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        app.logger.error(f"Ошибка при отправке в Telegram: {e}")
        return False

def format_order_message(order_data: Dict[str, Any]) -> str:
    """Форматирование сообщения о заказе"""
    try:
        # Извлекаем данные заказа
        order_id = order_data.get('id', 'Новый')
        customer_name = order_data.get('customer_name', 'Не указано')
        customer_phone = order_data.get('customer_phone', 'Не указано')
        from_address = order_data.get('from_address', 'Не указано')
        to_address = order_data.get('to_address', 'Не указано')
        pickup_time = order_data.get('pickup_time', 'Не указано')
        duration_hours = order_data.get('duration_hours', 0)
        passengers = order_data.get('passengers', 0)
        loaders = order_data.get('loaders', 0)
        selected_vehicle = order_data.get('selected_vehicle', {})
        total_cost = order_data.get('total_cost', 0)
        order_notes = order_data.get('order_notes', '')
        payment_method = order_data.get('payment_method', 'Не указано')
        order_type = order_data.get('order_type', 'regular')
        
        # Форматируем время
        if pickup_time and pickup_time != 'Не указано':
            try:
                # Проверяем, является ли pickup_time уже datetime объектом
                if isinstance(pickup_time, datetime):
                    pickup_str = pickup_time.strftime('%d.%m.%Y в %H:%M')
                else:
                    # Пытаемся парсить строку
                    pickup_str = pickup_time
                    # Если это ISO формат, конвертируем
                    if 'T' in pickup_time or '-' in pickup_time:
                        pickup_dt = datetime.fromisoformat(pickup_time.replace('Z', '+00:00'))
                        pickup_str = pickup_dt.strftime('%d.%m.%Y в %H:%M')
            except Exception as e:
                app.logger.warning(f"Failed to format pickup_time '{pickup_time}': {e}")
                pickup_str = str(pickup_time) if pickup_time else 'Не указано'
        else:
            pickup_str = 'Не указано'
        
        # Формируем сообщение в зависимости от типа заявки
        if order_type == 'callback':
            message = f"""
📞 <b>ЗАЯВКА НА ПЕРЕЗВОН #{order_id}</b>

👤 <b>Клиент:</b> {customer_name}
📞 <b>Телефон:</b> {customer_phone}

📝 <b>Примечания:</b> {order_notes if order_notes else 'Заявка на перезвон в течение 8 секунд'}

🕐 <i>Создано: {datetime.now().strftime('%d.%m.%Y в %H:%M:%S')}</i>
            """
        elif order_type == 'urgent':
            message = f"""
🚨 <b>СРОЧНАЯ ЗАЯВКА #{order_id}</b>

👤 <b>Клиент:</b> {customer_name}
📞 <b>Телефон:</b> {customer_phone}

📍 <b>Откуда:</b> {from_address}
🎯 <b>Куда:</b> {to_address}

⏰ <b>Время подачи:</b> {pickup_str}
⏱ <b>Длительность:</b> {duration_hours} ч.

🚗 <b>Транспорт:</b> {selected_vehicle.get('name', 'Не выбран')}
👥 <b>Пассажиры:</b> {passengers}
🏋️ <b>Грузчики:</b> {loaders}

💰 <b>Стоимость:</b> {total_cost:,} ₽
💳 <b>Оплата:</b> {payment_method}

📝 <b>Примечания:</b> {order_notes if order_notes else 'Нет'}

🕐 <i>Создано: {datetime.now().strftime('%d.%m.%Y в %H:%M:%S')}</i>
            """
        else:
            message = f"""
🚛 <b>НОВАЯ ЗАЯВКА #{order_id}</b>

👤 <b>Клиент:</b> {customer_name}
📞 <b>Телефон:</b> {customer_phone}

📍 <b>Откуда:</b> {from_address}
🎯 <b>Куда:</b> {to_address}

⏰ <b>Время подачи:</b> {pickup_str}
⏱ <b>Длительность:</b> {duration_hours} ч.

🚗 <b>Транспорт:</b> {selected_vehicle.get('name', 'Не выбран')}
👥 <b>Пассажиры:</b> {passengers}
🏋️ <b>Грузчики:</b> {loaders}

💰 <b>Стоимость:</b> {total_cost:,} ₽
💳 <b>Оплата:</b> {payment_method}

📝 <b>Примечания:</b> {order_notes if order_notes else 'Нет'}

🕐 <i>Создано: {datetime.now().strftime('%d.%m.%Y в %H:%M:%S')}</i>
            """
        
        return message.strip()
        
    except Exception as e:
        app.logger.error(f"Ошибка форматирования сообщения: {e}")
        return f"🚛 Новая заявка #{order_data.get('id', 'Новый')} от {order_data.get('customer_name', 'Клиента')}"

@app.route('/api/v2/calculate-price', methods=['POST'])
@rate_limit(max_requests=30, window_seconds=60)
def api_calculate_price():
    """API для пересчета цены от backend (используется для обновления цены на фронтенде)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Извлечение данных
        from_address = data.get('from_address', '').strip()
        to_address = data.get('to_address', '').strip()
        pickup_time = data.get('pickup_time')
        
        # [ИСПРАВЛЕНО] Преобразование типов для числовых полей
        try:
            duration_hours = int(data.get('duration_hours', 1))
        except (ValueError, TypeError):
            duration_hours = 1
            
        urgent_pickup = bool(data.get('urgent_pickup', False))
        
        # Преобразование distance в float или None
        distance_raw = data.get('distance')
        if distance_raw is not None and distance_raw != '':
            try:
                distance = float(distance_raw)
            except (ValueError, TypeError):
                distance = None
        else:
            distance = None
            
        try:
            additional_services_cost = float(data.get('additional_services_cost', 0))
        except (ValueError, TypeError):
            additional_services_cost = 0.0
            
        try:
            passengers = int(data.get('passengers', 0))
        except (ValueError, TypeError):
            passengers = 0
            
        try:
            loaders = int(data.get('loaders', 0))
        except (ValueError, TypeError):
            loaders = 0
            
        # Преобразование height и length в float или None
        height_raw = data.get('height')
        if height_raw is not None and height_raw != '' and height_raw != 'any':
            try:
                height = float(height_raw)
            except (ValueError, TypeError):
                height = None
        else:
            height = None
            
        length_raw = data.get('length')
        if length_raw is not None and length_raw != '' and length_raw != 'any':
            try:
                length = float(length_raw)
            except (ValueError, TypeError):
                length = None
        else:
            length = None
            
        body_type = data.get('body_type', 'any')
        
        try:
            selected_vehicle_id = int(data.get('selected_vehicle_id'))
        except (ValueError, TypeError):
            selected_vehicle_id = None
        
        # Валидация обязательных полей
        if not from_address or not to_address:
            return jsonify({'error': 'From and to addresses are required'}), 400
        
        if not pickup_time:
            return jsonify({'error': 'Pickup time is required'}), 400
        
        # Валидация длительности на основе конфигурации
        is_valid, error_message = validate_duration_hours(duration_hours)
        if not is_valid:
            return jsonify({'error': error_message}), 400
        
        # Создание объектов запроса
        route_request = RouteRequest(
            from_address=from_address,
            to_address=to_address,
            distance=distance  # Используем расстояние от фронтенда
        )
        
        time_request = TimeRequest(
            pickup_time=pickup_time,
            duration_hours=duration_hours,
            urgent_pickup=urgent_pickup
        )
        
        vehicle_request = VehicleRequest(
            passengers=passengers,
            loaders=loaders,
            height=height,
            length=length,
            body_type=body_type
        )
        
        # [ИСПРАВЛЕНО] Дополнительная проверка на нулевую дистанцию перед расчетом
        if distance is not None and distance <= 0:
            app.logger.info(f"Zero distance detected: {from_address} -> {to_address}, distance: {distance}")
        
        # Полный расчет стоимости (все шаги)
        step1_result = CalculatorServiceV2.calculate_step1(route_request, time_request)
        step2_result = CalculatorServiceV2.calculate_step2(vehicle_request)
        
        # Если выбран конкретный транспорт, используем его
        if selected_vehicle_id:
            vehicle_db = VehicleDatabase()
            selected_vehicle = vehicle_db.get_vehicle_by_id(selected_vehicle_id)
            if selected_vehicle:
                step3_result = CalculatorServiceV2.calculate_step3(step1_result, selected_vehicle, loaders, duration_hours, additional_services_cost)
            else:
                step3_result = CalculatorServiceV2.calculate_step3(step1_result, None, loaders, duration_hours, additional_services_cost)
        else:
            step3_result = CalculatorServiceV2.calculate_step3(step1_result, None, loaders, duration_hours, additional_services_cost)
        
        # Логирование запроса
        app.logger.info(f"Price recalculation: {from_address} -> {to_address}, total: {step3_result['total']}")
        
        return jsonify({
            'success': True,
            'calculated_total': step3_result['total'],
            'step1_cost': step1_result['total'],
            'step2_cost': 0,  # step2_result - это список транспорта, не стоимость
            'step3_cost': step3_result['total'],
            'breakdown': step3_result
        })
        
    except Exception as e:
        app.logger.error(f"Price calculation error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# MEDIA API ENDPOINTS
# ============================================================================

@app.route('/api/v2/media', methods=['GET'])
@rate_limit(max_requests=50, window_seconds=60)
def api_get_media():
    """API для получения всех медиа-элементов"""
    try:
        # Параметры фильтрации
        media_type = request.args.get('type')
        category = request.args.get('category')
        search = request.args.get('search')
        
        # Получаем медиа-элементы
        if search:
            media_items = media_database.search_media(search)
        elif media_type:
            try:
                media_type_enum = MediaType(media_type)
                media_items = media_database.get_media_by_type(media_type_enum)
            except ValueError:
                return jsonify({'error': 'Invalid media type'}), 400
        elif category:
            try:
                category_enum = MediaCategory(category)
                media_items = media_database.get_media_by_category(category_enum)
            except ValueError:
                return jsonify({'error': 'Invalid category'}), 400
        else:
            media_items = media_database.get_all_media()
        
        return jsonify({
            'success': True,
            'data': {
                'media': [item.to_dict() for item in media_items],
                'count': len(media_items)
            }
        })
        
    except Exception as e:
        app.logger.error(f"Get media error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/media/images', methods=['GET'])
@rate_limit(max_requests=50, window_seconds=60)
def api_get_images():
    """API для получения всех изображений"""
    try:
        images = media_database.get_images()
        
        return jsonify({
            'success': True,
            'data': {
                'images': [item.to_dict() for item in images],
                'count': len(images)
            }
        })
        
    except Exception as e:
        app.logger.error(f"Get images error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/media/videos', methods=['GET'])
@rate_limit(max_requests=50, window_seconds=60)
def api_get_videos():
    """API для получения всех видео"""
    try:
        videos = media_database.get_videos()
        
        return jsonify({
            'success': True,
            'data': {
                'videos': [item.to_dict() for item in videos],
                'count': len(videos)
            }
        })
        
    except Exception as e:
        app.logger.error(f"Get videos error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/media/<media_id>', methods=['GET'])
@rate_limit(max_requests=50, window_seconds=60)
def api_get_media_item(media_id):
    """API для получения конкретного медиа-элемента"""
    try:
        media_item = media_database.get_media_by_id(media_id)
        
        if not media_item:
            return jsonify({'error': 'Media item not found'}), 404
        
        return jsonify({
            'success': True,
            'data': media_item.to_dict()
        })
        
    except Exception as e:
        app.logger.error(f"Get media item error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/media/categories', methods=['GET'])
@rate_limit(max_requests=50, window_seconds=60)
def api_get_categories():
    """API для получения всех категорий медиа"""
    try:
        categories = [category.value for category in MediaCategory]
        
        return jsonify({
            'success': True,
            'data': {
                'categories': categories
            }
        })
        
    except Exception as e:
        app.logger.error(f"Get categories error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/config/calculator', methods=['GET'])
@rate_limit(max_requests=100, window_seconds=60)
def api_get_calculator_config():
    """API для получения конфигурации калькулятора"""
    try:
        # Проверяем валидность конфигурации
        if not config_manager.validate_config():
            return jsonify({'error': 'Invalid configuration'}), 500
        
        # Экспортируем конфигурацию для фронтенда
        config_data = config_manager.export_config_for_frontend()
        
        return jsonify({
            'success': True,
            'data': config_data
        })
        
    except Exception as e:
        app.logger.error(f"Get calculator config error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/v2/config/reload', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=60)
def api_reload_config():
    """API для перезагрузки конфигурации (только для админов)"""
    try:
        # Здесь можно добавить проверку авторизации
        # Пока что просто перезагружаем конфигурацию
        
        config_manager.reload_config()
        
        # Проверяем валидность после перезагрузки
        if not config_manager.validate_config():
            return jsonify({'error': 'Invalid configuration after reload'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Configuration reloaded successfully'
        })
        
    except Exception as e:
        app.logger.error(f"Reload config error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500