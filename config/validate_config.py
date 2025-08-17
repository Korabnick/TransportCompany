#!/usr/bin/env python3
"""
Скрипт для валидации конфигурации калькулятора
"""

import json
import sys
from pathlib import Path

def validate_config(config_path):
    """Валидация конфигурации калькулятора"""
    
    try:
        # Загружаем конфигурацию
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        print("✅ Конфигурация загружена успешно")
        
        # Проверяем обязательные секции
        required_sections = ['pricing', 'vehicles', 'calculator_limits']
        for section in required_sections:
            if section not in config:
                print(f"❌ Отсутствует обязательная секция: {section}")
                return False
            print(f"✅ Секция '{section}' найдена")
        
        # Валидация цен
        pricing = config['pricing']
        required_prices = ['base_cost_per_km', 'duration_cost_per_hour', 'urgent_pickup_multiplier', 'loader_price_per_hour']
        
        for price_key in required_prices:
            if price_key not in pricing:
                print(f"❌ Отсутствует цена: {price_key}")
                return False
            
            if not isinstance(pricing[price_key], (int, float)):
                print(f"❌ Неверный тип для цены {price_key}: {type(pricing[price_key])}")
                return False
            
            if pricing[price_key] < 0:
                print(f"❌ Отрицательная цена для {price_key}: {pricing[price_key]}")
                return False
        
        print("✅ Цены валидны")
        
        # Валидация транспорта
        vehicles = config['vehicles']
        if not isinstance(vehicles, list):
            print(f"❌ Транспорт должен быть списком, получен: {type(vehicles)}")
            return False
        
        if len(vehicles) == 0:
            print("❌ Список транспорта пуст")
            return False
        
        print(f"✅ Найдено {len(vehicles)} транспортных средств")
        
        required_vehicle_fields = ['id', 'name', 'type', 'body_type', 'price_per_hour', 'price_per_km', 'base_price', 'max_passengers', 'max_loaders', 'dimensions', 'capacity', 'image_url', 'description']
        
        vehicle_ids = set()
        for i, vehicle in enumerate(vehicles):
            print(f"  Проверка транспорта {i+1}: {vehicle.get('name', 'Без названия')}")
            
            # Проверяем обязательные поля
            for field in required_vehicle_fields:
                if field not in vehicle:
                    print(f"    ❌ Отсутствует поле: {field}")
                    return False
            
            # Проверяем уникальность ID
            vehicle_id = vehicle['id']
            if vehicle_id in vehicle_ids:
                print(f"    ❌ Дублирующийся ID: {vehicle_id}")
                return False
            vehicle_ids.add(vehicle_id)
            
            # Проверяем типы данных
            if not isinstance(vehicle['price_per_hour'], (int, float)) or vehicle['price_per_hour'] < 0:
                print(f"    ❌ Неверная цена за час: {vehicle['price_per_hour']}")
                return False
            
            if not isinstance(vehicle['price_per_km'], (int, float)) or vehicle['price_per_km'] < 0:
                print(f"    ❌ Неверная цена за км: {vehicle['price_per_km']}")
                return False
            
            if not isinstance(vehicle['base_price'], (int, float)) or vehicle['base_price'] < 0:
                print(f"    ❌ Неверная базовая цена: {vehicle['base_price']}")
                return False
            
            if not isinstance(vehicle['max_passengers'], int) or vehicle['max_passengers'] < 0:
                print(f"    ❌ Неверное количество пассажиров: {vehicle['max_passengers']}")
                return False
            
            if not isinstance(vehicle['max_loaders'], int) or vehicle['max_loaders'] < 0:
                print(f"    ❌ Неверное количество грузчиков: {vehicle['max_loaders']}")
                return False
            
            # Проверяем размеры
            dimensions = vehicle['dimensions']
            if not isinstance(dimensions, dict):
                print(f"    ❌ Размеры должны быть словарем")
                return False
            
            required_dimensions = ['height', 'length', 'width']
            for dim in required_dimensions:
                if dim not in dimensions:
                    print(f"    ❌ Отсутствует размер: {dim}")
                    return False
                
                if not isinstance(dimensions[dim], (int, float)) or dimensions[dim] <= 0:
                    print(f"    ❌ Неверный размер {dim}: {dimensions[dim]}")
                    return False
            
            # Проверяем вместимость
            if not isinstance(vehicle['capacity'], (int, float)) or vehicle['capacity'] <= 0:
                print(f"    ❌ Неверная вместимость: {vehicle['capacity']}")
                return False
            
            # Проверяем изображение
            image_path = Path(__file__).parent.parent / 'app' / vehicle['image_url'].lstrip('/')
            if not image_path.exists():
                print(f"    ⚠️  Изображение не найдено: {vehicle['image_url']}")
            else:
                print(f"    ✅ Изображение найдено: {vehicle['image_url']}")
            
            print(f"    ✅ Транспорт {i+1} валиден")
        
        # Валидация лимитов
        limits = config['calculator_limits']
        required_limits = ['max_passengers', 'max_loaders', 'max_duration_hours', 'min_duration_hours']
        
        for limit_key in required_limits:
            if limit_key not in limits:
                print(f"❌ Отсутствует лимит: {limit_key}")
                return False
            
            if not isinstance(limits[limit_key], int) or limits[limit_key] < 0:
                print(f"❌ Неверный лимит {limit_key}: {limits[limit_key]}")
                return False
        
        # Проверяем логику лимитов
        if limits['min_duration_hours'] >= limits['max_duration_hours']:
            print(f"❌ Минимальная длительность должна быть меньше максимальной: {limits['min_duration_hours']} >= {limits['max_duration_hours']}")
            return False
        
        print("✅ Лимиты валидны")
        
        # Валидация дополнительных услуг (опционально)
        if 'additional_services' in config:
            services = config['additional_services']
            if isinstance(services, dict):
                for service_key, service_data in services.items():
                    if not isinstance(service_data, dict):
                        print(f"❌ Неверный формат услуги {service_key}")
                        continue
                    
                    if 'name' not in service_data or 'price' not in service_data:
                        print(f"❌ Услуга {service_key} не содержит обязательные поля")
                        continue
                    
                    if not isinstance(service_data['price'], (int, float)) or service_data['price'] < 0:
                        print(f"❌ Неверная цена для услуги {service_key}: {service_data['price']}")
                        continue
                    
                    print(f"✅ Услуга {service_key} валидна")
        
        print("\n🎉 Конфигурация полностью валидна!")
        return True
        
    except FileNotFoundError:
        print(f"❌ Файл конфигурации не найден: {config_path}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга JSON: {e}")
        return False
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        return False

def main():
    """Основная функция"""
    config_path = Path(__file__).parent / 'calculator_config.json'
    
    print("🔍 Валидация конфигурации калькулятора")
    print(f"📁 Файл: {config_path}")
    print("-" * 50)
    
    if validate_config(config_path):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
