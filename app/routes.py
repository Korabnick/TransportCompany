from flask import Response, render_template, request, jsonify
from app import app, metrics, cache
from app.calculator import CalculatorServiceV2, rate_limit, get_client_id
from app.models import (
    RouteRequest, TimeRequest, VehicleRequest, BodyType, 
    VehicleDatabase, CalculationResult
)
import json
from datetime import datetime
from typing import Dict, Any

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
        distance = data.get('distance')  # Опционально
        pickup_time = data.get('pickup_time')
        duration_hours = data.get('duration_hours', 1)
        urgent_pickup = data.get('urgent_pickup', False)
        
        # Валидация обязательных полей
        if not from_address or not to_address:
            return jsonify({'error': 'From and to addresses are required'}), 400
        
        if not pickup_time:
            return jsonify({'error': 'Pickup time is required'}), 400
        
        if not isinstance(duration_hours, int) or duration_hours < 1 or duration_hours > 24:
            return jsonify({'error': 'Duration must be between 1 and 24 hours'}), 400
        
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
        passengers = data.get('passengers', 0)
        loaders = data.get('loaders', 0)
        height = data.get('height')
        length = data.get('length')
        body_type_str = data.get('body_type', 'any')
        
        # Валидация
        if not isinstance(passengers, int) or passengers < 0 or passengers > 20:
            return jsonify({'error': 'Passengers must be between 0 and 20'}), 400
        
        if not isinstance(loaders, int) or loaders < 0 or loaders > 10:
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
        selected_vehicle_id = data.get('selected_vehicle_id')
        loaders = data.get('loaders', 0)
        duration_hours = data.get('duration_hours', 1)
        
        # Валидация
        if not step1_result or not isinstance(step1_result, dict):
            return jsonify({'error': 'Step1 result is required'}), 400
        
        if not selected_vehicle_id or not isinstance(selected_vehicle_id, int):
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