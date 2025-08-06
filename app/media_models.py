from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
from enum import Enum
import os
from datetime import datetime
import subprocess
from PIL import Image

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
    
    def _generate_image_thumbnail(self, src_path, thumb_path):
        try:
            with Image.open(src_path) as img:
                img.thumbnail((400, 400))
                img.save(thumb_path, "JPEG")
        except Exception as e:
            print(f"Ошибка генерации thumbnail для {src_path}: {e}")

    def _generate_video_thumbnail(self, src_path, thumb_path):
        try:
            # ffmpeg должен быть установлен в системе
            subprocess.run([
                'ffmpeg', '-y', '-i', src_path, '-ss', '00:00:01.000', '-vframes', '1', thumb_path
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            print(f"Ошибка генерации thumbnail для видео {src_path}: {e}")

    def _initialize_media(self) -> List[MediaItem]:
        """Динамическая инициализация медиа-базы по содержимому папок"""
        media_items = []
        images_dir = os.path.join(os.path.dirname(__file__), 'static', 'media', 'images')
        videos_dir = os.path.join(os.path.dirname(__file__), 'static', 'media', 'videos')
        thumbs_dir = os.path.join(os.path.dirname(__file__), 'static', 'media', 'thumbnails')
        os.makedirs(thumbs_dir, exist_ok=True)

        # Изображения
        for fname in os.listdir(images_dir):
            if not fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')):
                continue
            file_path = f"/static/media/images/{fname}"
            abs_file_path = os.path.join(images_dir, fname)
            thumb_name = os.path.splitext(fname)[0] + '_thumb.jpg'
            abs_thumb_path = os.path.join(thumbs_dir, thumb_name)
            thumb_path = f"/static/media/thumbnails/{thumb_name}" if os.path.exists(abs_thumb_path) else None
            if not os.path.exists(abs_thumb_path):
                self._generate_image_thumbnail(abs_file_path, abs_thumb_path)
                thumb_path = f"/static/media/thumbnails/{thumb_name}" if os.path.exists(abs_thumb_path) else None
            media_items.append(MediaItem(
                id=f"img_{os.path.splitext(fname)[0]}",
                title=os.path.splitext(fname)[0].replace('_', ' ').capitalize(),
                description="",  # Описание пустое
                media_type=MediaType.IMAGE,
                category=MediaCategory.TRANSPORT,  # Можно доработать автоопределение
                file_path=file_path,
                thumbnail_path=thumb_path
            ))

        # Видео
        for fname in os.listdir(videos_dir):
            if not fname.lower().endswith(('.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm')):
                continue
            file_path = f"/static/media/videos/{fname}"
            abs_file_path = os.path.join(videos_dir, fname)
            thumb_name = os.path.splitext(fname)[0] + '_thumb.jpg'
            abs_thumb_path = os.path.join(thumbs_dir, thumb_name)
            thumb_path = f"/static/media/thumbnails/{thumb_name}" if os.path.exists(abs_thumb_path) else None
            if not os.path.exists(abs_thumb_path):
                self._generate_video_thumbnail(abs_file_path, abs_thumb_path)
                thumb_path = f"/static/media/thumbnails/{thumb_name}" if os.path.exists(abs_thumb_path) else None
            media_items.append(MediaItem(
                id=f"vid_{os.path.splitext(fname)[0]}",
                title=os.path.splitext(fname)[0].replace('_', ' ').capitalize(),
                description="",  # Описание пустое
                media_type=MediaType.VIDEO,
                category=MediaCategory.TRANSPORT,  # Можно доработать автоопределение
                file_path=file_path,
                thumbnail_path=thumb_path
            ))
        return media_items
    
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