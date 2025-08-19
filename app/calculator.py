# Новый оптимизированный калькулятор (бывший calculator_v2.py)
import time
import hashlib
import json
import os
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import requests
from shapely.geometry import shape, Point, Polygon
from functools import wraps
from flask import current_app, request
from app import cache
from app.models import (
    Vehicle, VehicleRequest, RouteRequest, TimeRequest, 
    CalculationResult, VehicleDatabase, BodyType
)
from app.config_manager import config_manager

class RateLimiter:
    """Система ограничения частоты запросов"""
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    def _get_client_key(self, client_id: str) -> str:
        """Генерация ключа для клиента"""
        return f"rate_limit:{client_id}"
    
    def is_allowed(self, client_id: str) -> bool:
        """Проверка, разрешен ли запрос"""
        key = self._get_client_key(client_id)
        current_time = int(time.time())
        window_start = current_time - self.window_seconds
        
        # Получаем список запросов из кэша
        requests = cache.get(key) or []
        
        # Удаляем старые запросы
        requests = [req_time for req_time in requests if req_time > window_start]
        
        # Проверяем лимит
        if len(requests) >= self.max_requests:
            return False
        
        # Добавляем текущий запрос
        requests.append(current_time)
        cache.set(key, requests, timeout=self.window_seconds)
        
        return True
    
    def get_remaining_requests(self, client_id: str) -> int:
        """Получить количество оставшихся запросов"""
        key = self._get_client_key(client_id)
        current_time = int(time.time())
        window_start = current_time - self.window_seconds
        
        requests = cache.get(key) or []
        requests = [req_time for req_time in requests if req_time > window_start]
        
        return max(0, self.max_requests - len(requests))

def get_client_id() -> str:
    """Получение идентификатора клиента"""
    # Используем IP адрес или X-Forwarded-For
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    user_agent = request.headers.get('User-Agent', '')
    
    # Создаем уникальный идентификатор
    identifier = f"{client_ip}:{user_agent}"
    return hashlib.md5(identifier.encode()).hexdigest()

def rate_limit(max_requests: int = 10, window_seconds: int = 60):
    """Декоратор для ограничения частоты запросов"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Проверяем FLASK_DEBUG - если TRUE, пропускаем rate limiting
            if os.environ.get('FLASK_DEBUG', 'FALSE').upper() == 'TRUE':
                return f(*args, **kwargs)
            
            limiter = RateLimiter(max_requests, window_seconds)
            client_id = get_client_id()
            
            if not limiter.is_allowed(client_id):
                remaining = limiter.get_remaining_requests(client_id)
                return {
                    'error': 'Rate limit exceeded',
                    'remaining_requests': remaining,
                    'retry_after': window_seconds
                }, 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

class DistanceService:
    """Сервис для получения расстояний между адресами"""
    
    @staticmethod
    @cache.memoize(timeout=3600)  # Кэширование на 1 час
    def get_distance(from_address: str, to_address: str) -> float:
        """
        Получение расстояния между адресами
        В реальности здесь будет интеграция с API карт
        """
        # [ИСПРАВЛЕНО] Проверка на одинаковые адреса
        if from_address.strip().lower() == to_address.strip().lower():
            return 0.0  # Нулевая дистанция для одинаковых адресов
        
        # Заглушка - возвращаем фиксированное расстояние
        # В реальности здесь будет запрос к Google Maps API или аналогичному сервису
        
        # Простая логика для демонстрации
        if "спб" in from_address.lower() or "спб" in to_address.lower():
            return 15.0  # В пределах города
        elif "область" in from_address.lower() or "область" in to_address.lower():
            return 45.0  # За городом
        else:
            return 30.0  # По умолчанию
    
    @staticmethod
    def calculate_route_price(distance: float, duration_hours: int, urgent_pickup: bool = False) -> Dict[str, float]:
        """Расчет стоимости маршрута - точно как на фронтенде"""
        # [ИСПРАВЛЕНО] Проверка на нулевую дистанцию
        if distance <= 0:
            # При нулевой дистанции стоимость за путь = 0
            distance_cost = 0.0
            # Логируем нулевую дистанцию
            try:
                if hasattr(current_app, 'logger'):
                    current_app.logger.info(f"DistanceService: Zero distance detected, setting distance_cost to 0")
            except AttributeError:
                pass
        else:
            # Получаем цены из конфигурации
            pricing = config_manager.get_pricing()
            base_cost_per_km = pricing['base_cost_per_km']
            # Шаг 1: Расчет стоимости за расстояние
            distance_cost = distance * base_cost_per_km
        
        # Получаем цены из конфигурации (если не получили ранее)
        if distance > 0:
            pricing = config_manager.get_pricing()
            duration_cost_per_hour = pricing['duration_cost_per_hour']
            urgent_multiplier = pricing['urgent_pickup_multiplier'] if urgent_pickup else 1.0
        else:
            # При нулевой дистанции используем дефолтные значения
            pricing = config_manager.get_pricing()
            duration_cost_per_hour = pricing['duration_cost_per_hour']
            urgent_multiplier = pricing['urgent_pickup_multiplier'] if urgent_pickup else 1.0
        
        # Шаг 2: Расчет стоимости за длительность
        duration_cost = duration_hours * duration_cost_per_hour
        
        # Шаг 3: Общая стоимость без срочной подачи
        base_total_cost = distance_cost + duration_cost
        
        # Шаг 4: Применяем срочную подачу
        total = round(base_total_cost * urgent_multiplier)
        
        return {
            'distance_cost': distance_cost,
            'duration_cost': duration_cost,
            'base_total_cost': base_total_cost,
            'urgent_multiplier': urgent_multiplier,
            'total': total
        }

class ZoneDistanceService:
    """Сервис для расчёта расстояний с учётом зон (город/за КАДом)"""
    _kad_polygon: Optional[Polygon] = None
    _kad_polygon_loaded: bool = False
    _user_agent: str = "TransportCompany/1.0 (zone-segmentation)"
    
    @staticmethod
    @cache.memoize(timeout=3600)  # Кэширование на 1 час
    def get_distance_with_zones(from_address: str, to_address: str) -> Dict[str, Any]:
        """
        Получение расстояния между адресами с определением зон
        """
        # [ИСПРАВЛЕНО] Проверка на одинаковые адреса
        if from_address.strip().lower() == to_address.strip().lower():
            return {
                'total_distance': 0.0,
                'city_distance': 0.0,
                'outside_distance': 0.0,
                'from_zone': 'city',
                'to_zone': 'city',
                'route_type': 'city_only',
                'kad_toll_applied': False
            }
        
        # Получаем координаты адресов
        from_coords = ZoneDistanceService._get_coordinates(from_address)
        to_coords = ZoneDistanceService._get_coordinates(to_address)
        
        if not from_coords or not to_coords:
            # Fallback к простому расчёту
            return ZoneDistanceService._fallback_calculation(from_address, to_address)
        
        # Определяем зоны
        from_zone = ZoneDistanceService._determine_zone(from_coords, from_address)
        to_zone = ZoneDistanceService._determine_zone(to_coords, to_address)

        # Если есть полигон КАДа и удалось получить геометрию маршрута через OSRM — используем посегментную разбивку
        kad_polygon = ZoneDistanceService._get_kad_polygon()
        coordinates = ZoneDistanceService._fetch_osrm_geometry(from_coords, to_coords)
        if kad_polygon and coordinates:
            city_km, outside_km, total_km = ZoneDistanceService._segment_route_by_polygon(coordinates, kad_polygon)
            route_type = 'city_only'
            if city_km > 0 and outside_km > 0:
                route_type = 'mixed'
            elif outside_km > 0 and city_km == 0:
                route_type = 'outside_only'

            route_analysis = {
                'total_distance': round(total_km, 1),
                'city_distance': round(city_km, 1),
                'outside_distance': round(outside_km, 1),
                'from_zone': from_zone,
                'to_zone': to_zone,
                'route_type': route_type,
                'kad_toll_applied': outside_km > 0
            }
        else:
            # Fallback к приближённому анализу
            route_analysis = ZoneDistanceService._analyze_route(from_coords, to_coords, from_zone, to_zone)
        
        return route_analysis
    
    @staticmethod
    def _get_coordinates(address: str) -> Optional[Dict[str, float]]:
        """Получение координат адреса через Nominatim (прямой запрос)."""
        try:
            import urllib.parse
            encoded = urllib.parse.quote(address)
            nominatim_url = f"https://nominatim.openstreetmap.org/search?format=json&limit=1&q={encoded}"
            headers = {"User-Agent": ZoneDistanceService._user_agent}
            resp = requests.get(nominatim_url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    lat = float(data[0]['lat'])
                    lon = float(data[0]['lon'])
                    return {"lat": lat, "lng": lon}
        except Exception as e:
            print(f"Error getting coordinates for {address}: {e}")
        # Заглушка как резерв
        if "спб" in address.lower() or "петербург" in address.lower():
            return {"lat": 59.9311, "lng": 30.3609}
        elif "область" in address.lower():
            return {"lat": 60.0, "lng": 30.5}
        else:
            return {"lat": 59.95, "lng": 30.35}
    
    @staticmethod
    def _determine_zone(coords: Dict[str, float], address: str) -> str:
        """Определение зоны по координатам и адресу с приоритетом полигона КАДа."""
        try:
            kad_polygon = ZoneDistanceService._get_kad_polygon()
            if kad_polygon and coords:
                # Shapely ожидает (x=lon, y=lat)
                pt = Point(coords['lng'], coords['lat'])
                return 'city' if kad_polygon.contains(pt) else 'outside'
        except Exception:
            pass

        # Fallback: ключевые слова и расстояние от центра
        zone_config = config_manager.get_pricing().get('zone_detection', {})
        kad_keywords = zone_config.get('kad_keywords', [])
        address_lower = address.lower()
        for keyword in kad_keywords:
            if keyword.lower() in address_lower:
                return 'outside'
        city_center = zone_config.get('city_center', {'lat': 59.9311, 'lng': 30.3609})
        city_radius = zone_config.get('city_radius_km', 25.0)
        distance_from_center = ZoneDistanceService._calculate_distance(
            coords['lat'], coords['lng'], city_center['lat'], city_center['lng']
        )
        return 'city' if distance_from_center <= city_radius else 'outside'
    
    @staticmethod
    def _calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Расчёт расстояния между двумя точками (формула гаверсинуса)"""
        import math
        
        R = 6371  # Радиус Земли в километрах
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * 
             math.sin(delta_lng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    @staticmethod
    def _analyze_route(from_coords: Dict[str, float], to_coords: Dict[str, float], 
                      from_zone: str, to_zone: str) -> Dict[str, Any]:
        """Анализ маршрута с разбивкой по зонам"""
        total_distance = ZoneDistanceService._calculate_distance(
            from_coords['lat'], from_coords['lng'],
            to_coords['lat'], to_coords['lng']
        )
        
        # Определяем тип маршрута
        if from_zone == 'city' and to_zone == 'city':
            route_type = 'city_only'
            city_distance = total_distance
            outside_distance = 0.0
            kad_toll_applied = False
        elif from_zone == 'outside' and to_zone == 'outside':
            route_type = 'outside_only'
            city_distance = 0.0
            outside_distance = total_distance
            kad_toll_applied = True
        else:
            route_type = 'mixed'
            # Для смешанных маршрутов используем приближённый расчёт
            city_distance = total_distance * 0.6  # 60% по городу
            outside_distance = total_distance * 0.4  # 40% за городом
            kad_toll_applied = True
        
        return {
            'total_distance': round(total_distance, 1),
            'city_distance': round(city_distance, 1),
            'outside_distance': round(outside_distance, 1),
            'from_zone': from_zone,
            'to_zone': to_zone,
            'route_type': route_type,
            'kad_toll_applied': kad_toll_applied
        }

    @staticmethod
    def _get_kad_polygon() -> Optional[Polygon]:
        """Ленивая загрузка полигона КАД из GeoJSON (config/kad_polygon.geojson)."""
        if ZoneDistanceService._kad_polygon_loaded:
            return ZoneDistanceService._kad_polygon
        try:
            base_dir = Path(__file__).parent.parent
            geojson_path = base_dir / 'config' / 'kad_polygon.geojson'
            if geojson_path.exists():
                with open(geojson_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # В GeoJSON координаты идут как [lon, lat], shapely shape это учитывает корректно
                    features = data.get('features', [])
                    if features:
                        geom = features[0].get('geometry')
                        if geom:
                            ZoneDistanceService._kad_polygon = shape(geom)
            ZoneDistanceService._kad_polygon_loaded = True
        except Exception as e:
            print(f"Error loading KAD polygon: {e}")
            ZoneDistanceService._kad_polygon_loaded = True
            ZoneDistanceService._kad_polygon = None
        return ZoneDistanceService._kad_polygon

    @staticmethod
    def _fetch_osrm_geometry(from_coords: Dict[str, float], to_coords: Dict[str, float]) -> Optional[List[List[float]]]:
        """Запрос к OSRM для получения геометрии маршрута (список [lon, lat])."""
        try:
            lon1, lat1 = from_coords['lng'], from_coords['lat']
            lon2, lat2 = to_coords['lng'], to_coords['lat']
            url = f"https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}"
            params = {
                'overview': 'full',
                'geometries': 'geojson'
            }
            headers = {"User-Agent": ZoneDistanceService._user_agent}
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                routes = data.get('routes', [])
                if routes:
                    geom = routes[0].get('geometry')
                    if geom and geom.get('type') == 'LineString':
                        coords = geom.get('coordinates', [])  # [[lon, lat], ...]
                        if isinstance(coords, list) and len(coords) >= 2:
                            return coords
        except Exception as e:
            print(f"OSRM fetch geometry error: {e}")
        return None

    @staticmethod
    def _segment_route_by_polygon(coordinates: List[List[float]], polygon: Polygon) -> Tuple[float, float, float]:
        """Разбивка маршрута по сегментам с классификацией внутри/вне полигона.
        Возвращает (city_km, outside_km, total_km).
        """
        def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            import math
            R = 6371.0
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return R * c

        city_km = 0.0
        outside_km = 0.0
        total_km = 0.0

        for i in range(len(coordinates) - 1):
            lon1, lat1 = coordinates[i]
            lon2, lat2 = coordinates[i + 1]
            seg_km = haversine_km(lat1, lon1, lat2, lon2)
            total_km += seg_km

            # Классифицируем по средней точке сегмента
            mid_lon = (lon1 + lon2) / 2.0
            mid_lat = (lat1 + lat2) / 2.0
            inside = False
            try:
                inside = polygon.contains(Point(mid_lon, mid_lat))
            except Exception:
                pass
            if inside:
                city_km += seg_km
            else:
                outside_km += seg_km

        return city_km, outside_km, total_km
    
    @staticmethod
    def _fallback_calculation(from_address: str, to_address: str) -> Dict[str, Any]:
        """Fallback расчёт при ошибках геокодирования"""
        # Простая логика для демонстрации
        if "спб" in from_address.lower() or "спб" in to_address.lower():
            total_distance = 15.0
            route_type = 'city_only'
            city_distance = total_distance
            outside_distance = 0.0
            kad_toll_applied = False
        elif "область" in from_address.lower() or "область" in to_address.lower():
            total_distance = 45.0
            route_type = 'outside_only'
            city_distance = 0.0
            outside_distance = total_distance
            kad_toll_applied = True
        else:
            total_distance = 30.0
            route_type = 'mixed'
            city_distance = total_distance * 0.6
            outside_distance = total_distance * 0.4
            kad_toll_applied = True
        
        return {
            'total_distance': total_distance,
            'city_distance': round(city_distance, 1),
            'outside_distance': round(outside_distance, 1),
            'from_zone': 'city' if 'спб' in from_address.lower() else 'outside',
            'to_zone': 'city' if 'спб' in to_address.lower() else 'outside',
            'route_type': route_type,
            'kad_toll_applied': kad_toll_applied
        }
    
    @staticmethod
    def calculate_route_price_with_zones(route_analysis: Dict[str, Any], 
                                       duration_hours: int, 
                                       urgent_pickup: bool = False) -> Dict[str, float]:
        """Расчёт стоимости маршрута с учётом зон"""
        pricing = config_manager.get_pricing()
        
        # Расчёт стоимости за расстояние по зонам
        city_cost_per_km = pricing.get('city_cost_per_km', pricing['base_cost_per_km'])
        outside_cost_per_km = pricing.get('outside_cost_per_km', pricing['base_cost_per_km'])
        
        city_cost = route_analysis['city_distance'] * city_cost_per_km
        outside_cost = route_analysis['outside_distance'] * outside_cost_per_km
        
        # Стоимость за длительность
        duration_cost_per_hour = pricing['duration_cost_per_hour']
        duration_cost = duration_hours * duration_cost_per_hour
        
        # Стоимость проезда по КАД
        kad_cost = 0.0
        if route_analysis['kad_toll_applied']:
            kad_cost = pricing.get('kad_toll_cost', 0.0)
        
        # Общая стоимость без срочной подачи
        base_total_cost = city_cost + outside_cost + duration_cost + kad_cost
        
        # Применяем срочную подачу
        urgent_multiplier = pricing['urgent_pickup_multiplier'] if urgent_pickup else 1.0
        total = round(base_total_cost * urgent_multiplier)
        
        return {
            'city_cost': city_cost,
            'outside_cost': outside_cost,
            'duration_cost': duration_cost,
            'kad_cost': kad_cost,
            'base_total_cost': base_total_cost,
            'urgent_multiplier': urgent_multiplier,
            'total': total,
            'route_analysis': route_analysis
        }

class CalculatorServiceV2:
    """Оптимизированный сервис калькулятора"""
    
    def __init__(self):
        self.vehicle_db = VehicleDatabase()
        self.distance_service = DistanceService()
    
    @staticmethod
    @cache.memoize(timeout=300)  # Кэширование на 5 минут
    def calculate_step1(route_request: RouteRequest, time_request: TimeRequest) -> Dict[str, float]:
        """Расчет стоимости этапа 1 (маршрут и время) с учётом зон"""
        start_time = time.time()
        
        # Получаем анализ маршрута с зонами
        route_analysis = ZoneDistanceService.get_distance_with_zones(
            route_request.from_address, 
            route_request.to_address
        )
        
        # [ИСПРАВЛЕНО] Дополнительная проверка на нулевую дистанцию
        if route_analysis['total_distance'] <= 0:
            # При нулевой дистанции создаем результат с нулевой стоимостью за путь
            pricing = config_manager.get_pricing()
            duration_cost_per_hour = pricing['duration_cost_per_hour']
            urgent_multiplier = pricing['urgent_pickup_multiplier'] if time_request.urgent_pickup else 1.0
            
            duration_cost = time_request.duration_hours * duration_cost_per_hour
            total = round(duration_cost * urgent_multiplier)
            
            # Логируем нулевую дистанцию
            try:
                if hasattr(current_app, 'logger'):
                    current_app.logger.info(f"Zero distance calculation: distance={route_analysis['total_distance']}, duration_cost={duration_cost}, total={total}")
            except AttributeError:
                pass
            
            result = {
                'distance_cost': 0.0,
                'duration_cost': duration_cost,
                'base_total_cost': duration_cost,
                'urgent_multiplier': urgent_multiplier,
                'total': total,
                'route_analysis': route_analysis
            }
        else:
            # Рассчитываем стоимость через зональный метод
            result = ZoneDistanceService.calculate_route_price_with_zones(
                route_analysis,
                time_request.duration_hours, 
                time_request.urgent_pickup
            )
        
        # Добавляем информацию о маршруте для совместимости
        result['distance'] = route_analysis['total_distance']
        
        # Мониторинг производительности
        try:
            if hasattr(current_app, 'metrics'):
                current_app.metrics.histogram(
                    'calculator_step1_duration_seconds', 
                    time.time() - start_time
                )
        except AttributeError:
            pass
        
        return result
    
    @staticmethod
    @cache.memoize(timeout=300)
    def calculate_step2(vehicle_request: VehicleRequest) -> List[Dict]:
        """Расчет доступного транспорта для этапа 2"""
        start_time = time.time()
        
        # Получаем отфильтрованный список транспорта
        vehicle_db = VehicleDatabase()
        vehicles = vehicle_db.filter_vehicles(vehicle_request)
        
        # Конвертируем в словари для JSON
        result = [vehicle.to_dict() for vehicle in vehicles]
        
        # Мониторинг производительности
        try:
            if hasattr(current_app, 'metrics'):
                current_app.metrics.histogram(
                    'calculator_step2_duration_seconds', 
                    time.time() - start_time
                )
        except AttributeError:
            pass
        
        return result
    
    @staticmethod
    def calculate_step3(
        step1_result: Dict[str, float],
        selected_vehicle: Optional[Vehicle],
        loaders: int,
        duration_hours: int,
        additional_services_cost: float = 0.0
    ) -> Dict[str, float]:
        """Расчет итоговой стоимости"""
        start_time = time.time()
        
        # Базовая стоимость из шага 1
        base_cost = step1_result['total']
        
        # Стоимость транспорта
        vehicle_cost = 0
        if selected_vehicle:
            # Получаем минимальную длительность из конфигурации
            limits = config_manager.get_calculator_limits()
            min_duration_hours = limits.get('min_duration_hours', 1)
            
            # Базовая цена + почасовая цена только для часов, превышающих минимальную длительность
            extra_hours = max(0, duration_hours - min_duration_hours)
            vehicle_cost = selected_vehicle.base_price + (
                selected_vehicle.price_per_hour * extra_hours
            )
        
        # Стоимость грузчиков
        pricing = config_manager.get_pricing()
        loader_price_per_hour = pricing['loader_price_per_hour']
        loaders_cost = loaders * loader_price_per_hour * duration_hours
        
        # Итоговая стоимость
        total = base_cost + vehicle_cost + loaders_cost + additional_services_cost
        
        # Детализация
        breakdown = {
            'route_cost': base_cost,
            'vehicle_cost': vehicle_cost,
            'loaders_cost': loaders_cost,
            'additional_services_cost': additional_services_cost,
            'total': total
        }
        
        # Мониторинг производительности
        try:
            if hasattr(current_app, 'metrics'):
                current_app.metrics.histogram(
                    'calculator_step3_duration_seconds', 
                    time.time() - start_time
                )
        except AttributeError:
            pass
        
        return breakdown
    
    @staticmethod
    def calculate_complete(
        route_request: RouteRequest,
        time_request: TimeRequest,
        vehicle_request: VehicleRequest,
        selected_vehicle_id: int
    ) -> CalculationResult:
        """Полный расчет всех этапов"""
        start_time = time.time()
        
        # Шаг 1: Маршрут и время
        step1_result = CalculatorServiceV2.calculate_step1(route_request, time_request)
        
        # Шаг 2: Доступный транспорт
        available_vehicles = CalculatorServiceV2.calculate_step2(vehicle_request)
        
        # Получаем выбранный транспорт
        vehicle_db = VehicleDatabase()
        selected_vehicle = vehicle_db.get_vehicle_by_id(selected_vehicle_id)
        
        if not selected_vehicle:
            raise ValueError(f"Vehicle with ID {selected_vehicle_id} not found")
        
        # Шаг 3: Итоговая стоимость
        step3_result = CalculatorServiceV2.calculate_step3(
            step1_result,
            selected_vehicle,
            vehicle_request.loaders,
            time_request.duration_hours,
            0.0  # additional_services_cost - по умолчанию 0
        )
        
        # Создаем результат
        result = CalculationResult(
            step1_price=step1_result['total'],
            step2_vehicles=[selected_vehicle],
            step3_total=step3_result['total'],
            breakdown=step3_result
        )
        
        # Мониторинг производительности
        try:
            if hasattr(current_app, 'metrics'):
                current_app.metrics.histogram(
                    'calculator_complete_duration_seconds', 
                    time.time() - start_time
                )
        except AttributeError:
            pass
        
        return result

# Глобальный экземпляр сервиса
calculator_service = CalculatorServiceV2()