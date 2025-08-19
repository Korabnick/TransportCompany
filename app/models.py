from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from enum import Enum
import json
from app.config_manager import config_manager

class BodyType(Enum):
    TENT = "tent"
    VAN = "van"
    BOARD = "board"
    ANY = "any"

class VehicleType(Enum):
    GAZEL = "gazel"
    TRUCK = "truck"
    MINIBUS = "minibus"
    SPECIAL = "special"

@dataclass
class Vehicle:
    id: int
    name: str
    type: VehicleType
    body_type: BodyType
    price_per_hour: float
    price_per_km: float
    base_price: float
    max_passengers: int
    max_loaders: int
    dimensions: Dict[str, float]  # height, length, width
    capacity: float  # в кубометрах
    image_url: str
    description: str
    is_available: bool = True
    min_base_duration_hours: int = 1
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type.value,
            'body_type': self.body_type.value,
            'price_per_hour': self.price_per_hour,
            'price_per_km': self.price_per_km,
            'base_price': self.base_price,
            'max_passengers': self.max_passengers,
            'max_loaders': self.max_loaders,
            'dimensions': self.dimensions,
            'capacity': self.capacity,
            'image_url': self.image_url,
            'description': self.description,
            'is_available': self.is_available,
            'min_base_duration_hours': self.min_base_duration_hours
        }

@dataclass
class RouteRequest:
    from_address: str
    to_address: str
    distance: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'from_address': self.from_address,
            'to_address': self.to_address,
            'distance': self.distance
        }

@dataclass
class TimeRequest:
    pickup_time: str  # ISO format
    duration_hours: int
    urgent_pickup: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'pickup_time': self.pickup_time,
            'duration_hours': self.duration_hours,
            'urgent_pickup': self.urgent_pickup
        }

@dataclass
class VehicleRequest:
    passengers: int
    loaders: int
    height: Optional[float] = None
    length: Optional[float] = None
    body_type: BodyType = BodyType.ANY
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'passengers': self.passengers,
            'loaders': self.loaders,
            'height': self.height,
            'length': self.length,
            'body_type': self.body_type.value
        }

@dataclass
class CalculationResult:
    step1_price: float
    step2_vehicles: List[Vehicle]
    step3_total: float
    breakdown: Dict[str, float]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'step1_price': self.step1_price,
            'step2_vehicles': [v.to_dict() for v in self.step2_vehicles],
            'step3_total': self.step3_total,
            'breakdown': self.breakdown
        }

class VehicleDatabase:
    """База данных транспорта с кэшированием"""
    
    def __init__(self):
        self._vehicles = self._initialize_vehicles()
    
    def _initialize_vehicles(self) -> List[Vehicle]:
        """Инициализация базы транспорта из конфигурации"""
        vehicles = []
        config_vehicles = config_manager.get_vehicles()
        
        for vehicle_data in config_vehicles:
            try:
                # Преобразуем тип транспорта
                vehicle_type = VehicleType(vehicle_data['type'])
                body_type = BodyType(vehicle_data['body_type'])
                
                vehicle = Vehicle(
                    id=vehicle_data['id'],
                    name=vehicle_data['name'],
                    type=vehicle_type,
                    body_type=body_type,
                    price_per_hour=vehicle_data['price_per_hour'],
                    price_per_km=vehicle_data['price_per_km'],
                    base_price=vehicle_data['base_price'],
                    max_passengers=vehicle_data['max_passengers'],
                    max_loaders=vehicle_data['max_loaders'],
                    dimensions=vehicle_data['dimensions'],
                    capacity=vehicle_data['capacity'],
                    image_url=vehicle_data['image_url'],
                    description=vehicle_data['description'],
                    min_base_duration_hours=vehicle_data.get('min_base_duration_hours', 1)
                )
                vehicles.append(vehicle)
                
            except (KeyError, ValueError) as e:
                print(f"Error creating vehicle from config: {e}, vehicle data: {vehicle_data}")
                continue
        
        return vehicles
    
    def get_all_vehicles(self) -> List[Vehicle]:
        """Получить все доступные транспортные средства"""
        return [v for v in self._vehicles if v.is_available]
    
    def filter_vehicles(self, request: VehicleRequest) -> List[Vehicle]:
        """Фильтрация транспорта по параметрам"""
        filtered = []
        
        for vehicle in self._vehicles:
            if not vehicle.is_available:
                continue
                
            # Проверка пассажиров и грузчиков
            if vehicle.max_passengers < request.passengers:
                continue
            if vehicle.max_loaders < request.loaders:
                continue
            
            # Проверка типа кузова
            if request.body_type != BodyType.ANY and vehicle.body_type != request.body_type:
                continue
            
            # Проверка размеров (если указаны)
            if request.height and vehicle.dimensions['height'] < request.height:
                continue
            if request.length and vehicle.dimensions['length'] < request.length:
                continue
            
            filtered.append(vehicle)
        
        return filtered
    
    def get_vehicle_by_id(self, vehicle_id: int) -> Optional[Vehicle]:
        """Получить транспорт по ID"""
        for vehicle in self._vehicles:
            if vehicle.id == vehicle_id:
                return vehicle
        return None 