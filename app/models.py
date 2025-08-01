from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from enum import Enum
import json

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
            'is_available': self.is_available
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
        """Инициализация базы транспорта"""
        return [
            Vehicle(
                id=1,
                name="Газель Тент",
                type=VehicleType.GAZEL,
                body_type=BodyType.TENT,
                price_per_hour=800,
                price_per_km=25,
                base_price=500,
                max_passengers=2,
                max_loaders=1,
                dimensions={'height': 2.0, 'length': 3.0, 'width': 2.0},
                capacity=12.0,
                image_url="/static/img/gazel-tent.jpg",
                description="Идеально для перевозки мебели и бытовой техники"
            ),
            Vehicle(
                id=2,
                name="Газель Фургон",
                type=VehicleType.GAZEL,
                body_type=BodyType.VAN,
                price_per_hour=900,
                price_per_km=28,
                base_price=600,
                max_passengers=2,
                max_loaders=1,
                dimensions={'height': 1.8, 'length': 3.0, 'width': 2.0},
                capacity=10.8,
                image_url="/static/img/gazel-van.jpg",
                description="Защищенный кузов для ценных грузов"
            ),
            Vehicle(
                id=3,
                name="Грузовик 5 тонн",
                type=VehicleType.TRUCK,
                body_type=BodyType.BOARD,
                price_per_hour=1200,
                price_per_km=35,
                base_price=800,
                max_passengers=3,
                max_loaders=2,
                dimensions={'height': 2.2, 'length': 5.0, 'width': 2.4},
                capacity=26.4,
                image_url="/static/img/truck-5t.jpg",
                description="Для крупных перевозок и строительных материалов"
            ),
            Vehicle(
                id=4,
                name="Микроавтобус",
                type=VehicleType.MINIBUS,
                body_type=BodyType.VAN,
                price_per_hour=1000,
                price_per_km=30,
                base_price=700,
                max_passengers=8,
                max_loaders=2,
                dimensions={'height': 1.9, 'length': 4.5, 'width': 2.0},
                capacity=17.1,
                image_url="/static/img/minibus.jpg",
                description="Комфортная перевозка пассажиров с грузом"
            ),
            Vehicle(
                id=5,
                name="Спецтранспорт",
                type=VehicleType.SPECIAL,
                body_type=BodyType.VAN,
                price_per_hour=1500,
                price_per_km=40,
                base_price=1000,
                max_passengers=2,
                max_loaders=3,
                dimensions={'height': 2.5, 'length': 6.0, 'width': 2.5},
                capacity=37.5,
                image_url="/static/img/special.jpg",
                description="Для особо крупных и тяжелых грузов"
            )
        ]
    
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