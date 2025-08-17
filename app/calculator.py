# Новый оптимизированный калькулятор (бывший calculator_v2.py)
import time
import hashlib
import json
import os
from typing import Dict, List, Optional, Tuple
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
        # Получаем цены из конфигурации
        pricing = config_manager.get_pricing()
        base_cost_per_km = pricing['base_cost_per_km']
        duration_cost_per_hour = pricing['duration_cost_per_hour']
        urgent_multiplier = pricing['urgent_pickup_multiplier'] if urgent_pickup else 1.0
        
        # Шаг 1: Расчет стоимости за расстояние
        distance_cost = distance * base_cost_per_km
        
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

class CalculatorServiceV2:
    """Оптимизированный сервис калькулятора"""
    
    def __init__(self):
        self.vehicle_db = VehicleDatabase()
        self.distance_service = DistanceService()
    
    @staticmethod
    @cache.memoize(timeout=300)  # Кэширование на 5 минут
    def calculate_step1(route_request: RouteRequest, time_request: TimeRequest) -> Dict[str, float]:
        """Расчет стоимости этапа 1 (маршрут и время)"""
        start_time = time.time()
        
        # Получаем расстояние
        distance = route_request.distance
        if not distance:
            distance = DistanceService.get_distance(
                route_request.from_address, 
                route_request.to_address
            )
        
        # [НОВОЕ] Округляем расстояние до 1 знака после запятой
        distance = round(distance, 1)
        
        # Рассчитываем стоимость
        result = DistanceService.calculate_route_price(
            distance, 
            time_request.duration_hours, 
            time_request.urgent_pickup
        )
        
        # Добавляем информацию о маршруте
        result['distance'] = distance
        
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
            vehicle_cost = selected_vehicle.base_price + (
                selected_vehicle.price_per_hour * duration_hours
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