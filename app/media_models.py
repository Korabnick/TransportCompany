from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
from enum import Enum
import os
from datetime import datetime

class MediaType(Enum):
    IMAGE = "image"
    VIDEO = "video"

class MediaCategory(Enum):
    TRANSPORT = "transport"
    LOADING = "loading"
    DELIVERY = "delivery"
    EQUIPMENT = "equipment"
    TEAM = "team"

@dataclass
class MediaItem:
    """Модель медиа-элемента (изображение или видео)"""
    id: str
    title: str
    description: str
    media_type: MediaType
    category: MediaCategory
    file_path: str
    thumbnail_path: Optional[str] = None
    duration: Optional[int] = None  # для видео в секундах
    file_size: Optional[int] = None  # размер файла в байтах
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: datetime = None
    is_active: bool = True
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование в словарь"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat() if self.created_at else None
        data['media_type'] = self.media_type.value
        data['category'] = self.category.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MediaItem':
        """Создание из словаря"""
        # Преобразуем строки обратно в enum
        if 'media_type' in data and isinstance(data['media_type'], str):
            data['media_type'] = MediaType(data['media_type'])
        if 'category' in data and isinstance(data['category'], str):
            data['category'] = MediaCategory(data['category'])
        
        # Преобразуем строку времени обратно в datetime
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
        
        return cls(**data)

class MediaDatabase:
    """База данных медиа-контента"""
    
    def __init__(self):
        self._media_items = self._initialize_media()
    
    def _initialize_media(self) -> List[MediaItem]:
        """Инициализация медиа-базы с демо-данными"""
        return [
            # Изображения
            MediaItem(
                id="img_001",
                title="Грузоперевозка мебели",
                description="Профессиональная перевозка мебели с упаковкой и сборкой",
                media_type=MediaType.IMAGE,
                category=MediaCategory.TRANSPORT,
                file_path="/static/media/images/furniture_transport.jpg",
                thumbnail_path="/static/media/thumbnails/furniture_transport_thumb.jpg",
                width=1920,
                height=1080
            ),
            MediaItem(
                id="img_002",
                title="Перевозка бытовой техники",
                description="Безопасная транспортировка холодильников, стиральных машин",
                media_type=MediaType.IMAGE,
                category=MediaCategory.TRANSPORT,
                file_path="/static/media/images/appliance_transport.jpg",
                thumbnail_path="/static/media/thumbnails/appliance_transport_thumb.jpg",
                width=1920,
                height=1080
            ),
            MediaItem(
                id="img_003",
                title="Работа грузчиков",
                description="Профессиональная команда грузчиков за работой",
                media_type=MediaType.IMAGE,
                category=MediaCategory.LOADING,
                file_path="/static/media/images/loaders_work.jpg",
                thumbnail_path="/static/media/thumbnails/loaders_work_thumb.jpg",
                width=1920,
                height=1080
            ),
            MediaItem(
                id="img_004",
                title="Специальное оборудование",
                description="Использование спецтехники для сложных перевозок",
                media_type=MediaType.IMAGE,
                category=MediaCategory.EQUIPMENT,
                file_path="/static/media/images/special_equipment.jpg",
                thumbnail_path="/static/media/thumbnails/special_equipment_thumb.jpg",
                width=1920,
                height=1080
            ),
            MediaItem(
                id="img_005",
                title="Доставка в офис",
                description="Быстрая доставка грузов в офисные помещения",
                media_type=MediaType.IMAGE,
                category=MediaCategory.DELIVERY,
                file_path="/static/media/images/office_delivery.jpg",
                thumbnail_path="/static/media/thumbnails/office_delivery_thumb.jpg",
                width=1920,
                height=1080
            ),
            MediaItem(
                id="img_006",
                title="Наша команда",
                description="Профессиональная команда водителей и грузчиков",
                media_type=MediaType.IMAGE,
                category=MediaCategory.TEAM,
                file_path="/static/media/images/team_photo.jpg",
                thumbnail_path="/static/media/thumbnails/team_photo_thumb.jpg",
                width=1920,
                height=1080
            ),
            
            # Видео (используем placeholder изображения вместо видео файлов)
            MediaItem(
                id="vid_001",
                title="Процесс погрузки",
                description="Демонстрация профессиональной погрузки мебели",
                media_type=MediaType.VIDEO,
                category=MediaCategory.LOADING,
                file_path="/static/media/images/loaders_work.jpg",  # Используем изображение как placeholder
                thumbnail_path="/static/media/thumbnails/loaders_work_thumb.jpg",
                duration=120,  # 2 минуты
                width=1920,
                height=1080
            ),
            MediaItem(
                id="vid_002",
                title="Перевозка пианино",
                description="Специальная перевозка музыкальных инструментов",
                media_type=MediaType.VIDEO,
                category=MediaCategory.TRANSPORT,
                file_path="/static/media/videos/piano_transport.mp4",  # Реальный видео файл
                thumbnail_path="/static/media/thumbnails/furniture_transport_thumb.jpg",
                duration=180,  # 3 минуты
                width=1920,
                height=1080
            )
        ]
    
    def get_all_media(self) -> List[MediaItem]:
        """Получить все активные медиа-элементы"""
        return [item for item in self._media_items if item.is_active]
    
    def get_media_by_type(self, media_type: MediaType) -> List[MediaItem]:
        """Получить медиа-элементы по типу"""
        return [item for item in self._media_items if item.media_type == media_type and item.is_active]
    
    def get_media_by_category(self, category: MediaCategory) -> List[MediaItem]:
        """Получить медиа-элементы по категории"""
        return [item for item in self._media_items if item.category == category and item.is_active]
    
    def get_media_by_id(self, media_id: str) -> Optional[MediaItem]:
        """Получить медиа-элемент по ID"""
        for item in self._media_items:
            if item.id == media_id and item.is_active:
                return item
        return None
    
    def get_images(self) -> List[MediaItem]:
        """Получить все изображения"""
        return self.get_media_by_type(MediaType.IMAGE)
    
    def get_videos(self) -> List[MediaItem]:
        """Получить все видео"""
        return self.get_media_by_type(MediaType.VIDEO)
    
    def search_media(self, query: str) -> List[MediaItem]:
        """Поиск медиа-элементов по запросу"""
        query_lower = query.lower()
        results = []
        
        for item in self._media_items:
            if not item.is_active:
                continue
                
            if (query_lower in item.title.lower() or 
                query_lower in item.description.lower() or
                query_lower in item.category.value.lower()):
                results.append(item)
        
        return results

# Глобальный экземпляр базы данных медиа
media_database = MediaDatabase() 