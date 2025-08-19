#!/usr/bin/env python3
"""
Тестовый скрипт для проверки зонального расчёта расстояний
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.calculator import ZoneDistanceService
from app.config_manager import config_manager

def test_zone_detection():
    """Тестирование определения зон"""
    print("=== Тестирование определения зон ===")
    
    test_addresses = [
        ("Невский проспект, 1, Санкт-Петербург", "city"),
        ("Московский проспект, 100, СПб", "city"),
        ("КАД, 50 км, Ленинградская область", "outside"),
        ("Кольцевая автодорога, 25 км", "outside"),
        ("Пушкин, Ленинградская область", "outside"),
        ("Петродворец, Санкт-Петербург", "city"),
    ]
    
    for address, expected_zone in test_addresses:
        # Симулируем получение координат
        if "спб" in address.lower() or "петербург" in address.lower():
            coords = {"lat": 59.9311, "lng": 30.3609}
        elif "область" in address.lower() or "кад" in address.lower() or "кольцевая" in address.lower():
            coords = {"lat": 60.0, "lng": 30.5}
        else:
            coords = {"lat": 59.95, "lng": 30.35}
        
        zone = ZoneDistanceService._determine_zone(coords, address)
        status = "✅" if zone == expected_zone else "❌"
        print(f"{status} {address} -> {zone} (ожидалось: {expected_zone})")

def test_route_analysis():
    """Тестирование анализа маршрутов"""
    print("\n=== Тестирование анализа маршрутов ===")
    
    test_routes = [
        ("Невский проспект, 1", "Московский проспект, 100", "city_only"),
        ("КАД, 50 км", "Кольцевая автодорога, 25 км", "outside_only"),
        ("Невский проспект, 1", "Пушкин, Ленинградская область", "mixed"),
        ("Петродворец", "КАД, 30 км", "mixed"),
    ]
    
    for from_addr, to_addr, expected_type in test_routes:
        analysis = ZoneDistanceService.get_distance_with_zones(from_addr, to_addr)
        status = "✅" if analysis['route_type'] == expected_type else "❌"
        print(f"{status} {from_addr} -> {to_addr}")
        print(f"   Тип: {analysis['route_type']} (ожидалось: {expected_type})")
        print(f"   Общее расстояние: {analysis['total_distance']} км")
        print(f"   По городу: {analysis['city_distance']} км")
        print(f"   За КАД: {analysis['outside_distance']} км")
        print(f"   КАД: {'Да' if analysis['kad_toll_applied'] else 'Нет'}")

def test_pricing():
    """Тестирование расчёта стоимости"""
    print("\n=== Тестирование расчёта стоимости ===")
    
    test_cases = [
        ("Невский проспект, 1", "Московский проспект, 100", 2, False),
        ("КАД, 50 км", "Кольцевая автодорога, 25 км", 3, True),
        ("Невский проспект, 1", "Пушкин, Ленинградская область", 4, False),
    ]
    
    for from_addr, to_addr, duration, urgent in test_cases:
        analysis = ZoneDistanceService.get_distance_with_zones(from_addr, to_addr)
        pricing = ZoneDistanceService.calculate_route_price_with_zones(analysis, duration, urgent)
        
        print(f"\n📍 {from_addr} -> {to_addr}")
        print(f"⏱️ Длительность: {duration} ч, Срочно: {'Да' if urgent else 'Нет'}")
        print(f"💰 Стоимость по городу: {pricing['city_cost']} ₽")
        print(f"🛣️ Стоимость за КАД: {pricing['outside_cost']} ₽")
        print(f"⏰ Стоимость времени: {pricing['duration_cost']} ₽")
        if pricing['kad_cost'] > 0:
            print(f"🚧 Стоимость КАД: {pricing['kad_cost']} ₽")
        print(f"📊 Базовая стоимость: {pricing['base_total_cost']} ₽")
        if urgent:
            print(f"⚡ Множитель срочности: {pricing['urgent_multiplier']}x")
        print(f"💳 Итого: {pricing['total']} ₽")

def test_config():
    """Тестирование конфигурации"""
    print("\n=== Тестирование конфигурации ===")
    
    pricing = config_manager.get_pricing()
    print(f"Базовая стоимость за км: {pricing.get('base_cost_per_km')} ₽")
    print(f"Стоимость по городу за км: {pricing.get('city_cost_per_km')} ₽")
    print(f"Стоимость за КАД за км: {pricing.get('outside_cost_per_km')} ₽")
    print(f"Стоимость проезда по КАД: {pricing.get('kad_toll_cost')} ₽")
    
    zone_config = pricing.get('zone_detection', {})
    print(f"Центр города: {zone_config.get('city_center')}")
    print(f"Радиус города: {zone_config.get('city_radius_km')} км")
    print(f"Ключевые слова КАД: {zone_config.get('kad_keywords')}")

def main():
    """Основная функция тестирования"""
    print("🚛 Тестирование зонального расчёта расстояний")
    print("=" * 50)
    
    try:
        test_config()
        test_zone_detection()
        test_route_analysis()
        test_pricing()
        
        print("\n✅ Все тесты завершены!")
        
    except Exception as e:
        print(f"\n❌ Ошибка при тестировании: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
