#!/usr/bin/env python3
"""
Скрипт для быстрого обновления цен в конфигурации калькулятора
"""

import json
import argparse
from pathlib import Path
from typing import Dict, Any

def load_config(config_path: Path) -> Dict[str, Any]:
    """Загрузка конфигурации"""
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Ошибка загрузки конфигурации: {e}")
        return None

def save_config(config: Dict[str, Any], config_path: Path) -> bool:
    """Сохранение конфигурации"""
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"❌ Ошибка сохранения конфигурации: {e}")
        return False

def update_pricing(config: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    """Обновление цен"""
    if 'pricing' not in config:
        config['pricing'] = {}
    
    pricing = config['pricing']
    
    # Обновляем только переданные цены
    if 'base_cost_per_km' in kwargs:
        pricing['base_cost_per_km'] = float(kwargs['base_cost_per_km'])
        print(f"💰 Базовая стоимость за км: {pricing['base_cost_per_km']} ₽")
    
    if 'duration_cost_per_hour' in kwargs:
        pricing['duration_cost_per_hour'] = float(kwargs['duration_cost_per_hour'])
        print(f"⏰ Стоимость за час: {pricing['duration_cost_per_hour']} ₽")
    
    if 'urgent_pickup_multiplier' in kwargs:
        pricing['urgent_pickup_multiplier'] = float(kwargs['urgent_pickup_multiplier'])
        print(f"🚨 Множитель срочной подачи: {pricing['urgent_pickup_multiplier']}x")
    
    if 'loader_price_per_hour' in kwargs:
        pricing['loader_price_per_hour'] = float(kwargs['loader_price_per_hour'])
        print(f"👷 Стоимость грузчика за час: {pricing['loader_price_per_hour']} ₽")
    
    return config

def update_vehicle_prices(config: Dict[str, Any], vehicle_id: int = None, **kwargs) -> Dict[str, Any]:
    """Обновление цен транспорта"""
    if 'vehicles' not in config:
        print("❌ Секция vehicles не найдена в конфигурации")
        return config
    
    vehicles = config['vehicles']
    
    if vehicle_id is not None:
        # Обновляем конкретный транспорт
        for vehicle in vehicles:
            if vehicle['id'] == vehicle_id:
                if 'price_per_hour' in kwargs:
                    vehicle['price_per_hour'] = int(kwargs['price_per_hour'])
                    print(f"🚗 {vehicle['name']} - цена за час: {vehicle['price_per_hour']} ₽")
                
                if 'price_per_km' in kwargs:
                    vehicle['price_per_km'] = int(kwargs['price_per_km'])
                    print(f"🚗 {vehicle['name']} - цена за км: {vehicle['price_per_km']} ₽")
                
                if 'base_price' in kwargs:
                    vehicle['base_price'] = int(kwargs['base_price'])
                    print(f"🚗 {vehicle['name']} - базовая цена: {vehicle['base_price']} ₽")
                
                break
        else:
            print(f"❌ Транспорт с ID {vehicle_id} не найден")
    else:
        # Обновляем все транспортные средства
        for vehicle in vehicles:
            if 'price_per_hour' in kwargs:
                vehicle['price_per_hour'] = int(vehicle['price_per_hour'] * float(kwargs['price_per_hour']))
                print(f"🚗 {vehicle['name']} - новая цена за час: {vehicle['price_per_hour']} ₽")
            
            if 'price_per_km' in kwargs:
                vehicle['price_per_km'] = int(vehicle['price_per_km'] * float(kwargs['price_per_km']))
                print(f"🚗 {vehicle['name']} - новая цена за км: {vehicle['price_per_km']} ₽")
            
            if 'base_price' in kwargs:
                vehicle['base_price'] = int(vehicle['base_price'] * float(kwargs['base_price']))
                print(f"🚗 {vehicle['name']} - новая базовая цена: {vehicle['base_price']} ₽")
    
    return config

def update_service_prices(config: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    """Обновление цен дополнительных услуг"""
    if 'additional_services' not in config:
        print("❌ Секция additional_services не найдена в конфигурации")
        return config
    
    services = config['additional_services']
    
    for service_key, new_price in kwargs.items():
        if service_key in services:
            services[service_key]['price'] = float(new_price)
            print(f"🔧 {services[service_key]['name']} - новая цена: {new_price} ₽")
        else:
            print(f"⚠️  Услуга {service_key} не найдена")
    
    return config

def show_current_prices(config: Dict[str, Any]):
    """Показать текущие цены"""
    print("\n📊 Текущие цены:")
    print("-" * 40)
    
    if 'pricing' in config:
        pricing = config['pricing']
        print(f"💰 Базовая стоимость за км: {pricing.get('base_cost_per_km', 'N/A')} ₽")
        print(f"⏰ Стоимость за час: {pricing.get('duration_cost_per_hour', 'N/A')} ₽")
        print(f"🚨 Множитель срочной подачи: {pricing.get('urgent_pickup_multiplier', 'N/A')}x")
        print(f"👷 Стоимость грузчика за час: {pricing.get('loader_price_per_hour', 'N/A')} ₽")
    
    if 'vehicles' in config:
        print("\n🚗 Транспорт:")
        for vehicle in config['vehicles']:
            print(f"  {vehicle['name']}:")
            print(f"    - За час: {vehicle['price_per_hour']} ₽")
            print(f"    - За км: {vehicle['price_per_km']} ₽")
            print(f"    - Базовая: {vehicle['base_price']} ₽")
    
    if 'additional_services' in config:
        print("\n🔧 Дополнительные услуги:")
        for service_key, service in config['additional_services'].items():
            print(f"  {service['name']}: {service['price']} ₽")

def main():
    parser = argparse.ArgumentParser(description='Обновление цен в конфигурации калькулятора')
    parser.add_argument('--config', default='calculator_config.json', help='Путь к файлу конфигурации')
    parser.add_argument('--show', action='store_true', help='Показать текущие цены')
    
    # Цены
    parser.add_argument('--base-cost-per-km', type=float, help='Базовая стоимость за км')
    parser.add_argument('--duration-cost-per-hour', type=float, help='Стоимость за час')
    parser.add_argument('--urgent-pickup-multiplier', type=float, help='Множитель срочной подачи')
    parser.add_argument('--loader-price-per-hour', type=float, help='Стоимость грузчика за час')
    
    # Цены транспорта
    parser.add_argument('--vehicle-id', type=int, help='ID транспорта для обновления (если не указан, обновляются все)')
    parser.add_argument('--vehicle-price-per-hour', type=float, help='Множитель цены за час для транспорта')
    parser.add_argument('--vehicle-price-per-km', type=float, help='Множитель цены за км для транспорта')
    parser.add_argument('--vehicle-base-price', type=float, help='Множитель базовой цены для транспорта')
    
    # Цены услуг
    parser.add_argument('--service-packaging', type=float, help='Цена услуги "Упаковка"')
    parser.add_argument('--service-insurance', type=float, help='Цена услуги "Страхование"')
    parser.add_argument('--service-loading-equipment', type=float, help='Цена услуги "Погрузочное оборудование"')
    
    args = parser.parse_args()
    
    config_path = Path(__file__).parent / args.config
    
    if not config_path.exists():
        print(f"❌ Файл конфигурации не найден: {config_path}")
        return
    
    # Загружаем конфигурацию
    config = load_config(config_path)
    if config is None:
        return
    
    # Показываем текущие цены
    if args.show:
        show_current_prices(config)
        return
    
    # Обновляем цены
    pricing_updates = {}
    if args.base_cost_per_km is not None:
        pricing_updates['base_cost_per_km'] = args.base_cost_per_km
    if args.duration_cost_per_hour is not None:
        pricing_updates['duration_cost_per_hour'] = args.duration_cost_per_hour
    if args.urgent_pickup_multiplier is not None:
        pricing_updates['urgent_pickup_multiplier'] = args.urgent_pickup_multiplier
    if args.loader_price_per_hour is not None:
        pricing_updates['loader_price_per_hour'] = args.loader_price_per_hour
    
    if pricing_updates:
        config = update_pricing(config, **pricing_updates)
    
    # Обновляем цены транспорта
    vehicle_updates = {}
    if args.vehicle_price_per_hour is not None:
        vehicle_updates['price_per_hour'] = args.vehicle_price_per_hour
    if args.vehicle_price_per_km is not None:
        vehicle_updates['price_per_km'] = args.vehicle_price_per_km
    if args.vehicle_base_price is not None:
        vehicle_updates['base_price'] = args.vehicle_base_price
    
    if vehicle_updates:
        config = update_vehicle_prices(config, args.vehicle_id, **vehicle_updates)
    
    # Обновляем цены услуг
    service_updates = {}
    if args.service_packaging is not None:
        service_updates['packaging'] = args.service_packaging
    if args.service_insurance is not None:
        service_updates['insurance'] = args.service_insurance
    if args.service_loading_equipment is not None:
        service_updates['loading_equipment'] = args.service_loading_equipment
    
    if service_updates:
        config = update_service_prices(config, **service_updates)
    
    # Сохраняем конфигурацию
    if save_config(config, config_path):
        print("\n✅ Конфигурация успешно обновлена!")
        print("🔄 Перезагрузите конфигурацию через API: POST /api/v2/config/reload")
    else:
        print("\n❌ Ошибка сохранения конфигурации")

if __name__ == "__main__":
    main()
