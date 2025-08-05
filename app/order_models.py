from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
import uuid

class OrderStatus(Enum):
    NEW = "new"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    IN_PROCESS = "in_process"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentMethod(Enum):
    CASH = "cash"
    ONLINE = "online"
    CARD = "card"

@dataclass
class Order:
    """Модель заявки на грузоперевозку"""
    id: str
    customer_name: str
    customer_phone: str
    from_address: str
    to_address: str
    pickup_time: str
    duration_hours: int
    passengers: int
    loaders: int
    selected_vehicle: Dict[str, Any]
    total_cost: float
    order_notes: str = ""
    payment_method: PaymentMethod = PaymentMethod.ONLINE
    status: OrderStatus = OrderStatus.NEW
    created_at: datetime = None
    updated_at: datetime = None
    telegram_sent: bool = False
    telegram_message_id: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
        if self.id is None:
            self.id = str(uuid.uuid4())
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование в словарь"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat() if self.created_at else None
        data['updated_at'] = self.updated_at.isoformat() if self.updated_at else None
        data['status'] = self.status.value
        data['payment_method'] = self.payment_method.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Order':
        """Создание из словаря"""
        # Преобразуем строки обратно в enum
        if 'status' in data and isinstance(data['status'], str):
            data['status'] = OrderStatus(data['status'])
        if 'payment_method' in data and isinstance(data['payment_method'], str):
            data['payment_method'] = PaymentMethod(data['payment_method'])
        
        # Преобразуем строки времени обратно в datetime
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
        
        return cls(**data)
    
    def update_status(self, new_status: OrderStatus):
        """Обновление статуса заявки"""
        self.status = new_status
        self.updated_at = datetime.now()
    
    def mark_telegram_sent(self, message_id: Optional[str] = None):
        """Отметка о том, что заявка отправлена в телеграм"""
        self.telegram_sent = True
        self.telegram_message_id = message_id
        self.updated_at = datetime.now()

class OrderStorage:
    """Простое хранилище заявок в памяти (в продакшене лучше использовать БД)"""
    
    def __init__(self):
        self.orders: Dict[str, Order] = {}
    
    def add_order(self, order: Order) -> str:
        """Добавление новой заявки"""
        self.orders[order.id] = order
        return order.id
    
    def get_order(self, order_id: str) -> Optional[Order]:
        """Получение заявки по ID"""
        return self.orders.get(order_id)
    
    def update_order(self, order: Order) -> bool:
        """Обновление заявки"""
        if order.id in self.orders:
            order.updated_at = datetime.now()
            self.orders[order.id] = order
            return True
        return False
    
    def delete_order(self, order_id: str) -> bool:
        """Удаление заявки"""
        if order_id in self.orders:
            del self.orders[order_id]
            return True
        return False
    
    def get_all_orders(self) -> List[Order]:
        """Получение всех заявок"""
        return list(self.orders.values())
    
    def get_orders_by_status(self, status: OrderStatus) -> List[Order]:
        """Получение заявок по статусу"""
        return [order for order in self.orders.values() if order.status == status]
    
    def get_recent_orders(self, hours: int = 24) -> List[Order]:
        """Получение заявок за последние N часов"""
        cutoff_time = datetime.now().replace(hour=datetime.now().hour - hours)
        return [
            order for order in self.orders.values() 
            if order.created_at and order.created_at >= cutoff_time
        ]
    
    def get_orders_by_customer(self, phone: str) -> List[Order]:
        """Получение заявок по номеру телефона клиента"""
        return [order for order in self.orders.values() if order.customer_phone == phone]

# Глобальный экземпляр хранилища
order_storage = OrderStorage()

def create_order_from_calculation(
    customer_name: str,
    customer_phone: str,
    calculation_result: Dict[str, Any],
    order_notes: str = "",
    payment_method: PaymentMethod = PaymentMethod.ONLINE
) -> Order:
    """Создание заявки из результата расчета"""
    
    # Извлекаем данные из результата расчета
    route_data = calculation_result.get('route', {})
    vehicle_data = calculation_result.get('selected_vehicle', {})
    
    order = Order(
        id=str(uuid.uuid4()),
        customer_name=customer_name,
        customer_phone=customer_phone,
        from_address=route_data.get('from_address', ''),
        to_address=route_data.get('to_address', ''),
        pickup_time=route_data.get('pickup_time', ''),
        duration_hours=route_data.get('duration_hours', 1),
        passengers=vehicle_data.get('passengers', 0),
        loaders=vehicle_data.get('loaders', 0),
        selected_vehicle=vehicle_data,
        total_cost=calculation_result.get('total_cost', 0),
        order_notes=order_notes,
        payment_method=payment_method
    )
    
    return order 