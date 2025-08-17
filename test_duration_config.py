#!/usr/bin/env python3
"""
Тестовый файл для проверки конфигурации длительности
"""

import json
import sys
import os

# Добавляем путь к проекту
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

def test_config_loading():
    """Тестирует загрузку конфигурации"""
    try:
        from config_manager import config_manager
        
        print("✅ Config manager imported successfully")
        
        # Получаем лимиты
        limits = config_manager.get_calculator_limits()
        print(f"✅ Calculator limits loaded: {limits}")
        
        # Проверяем длительность
        min_duration = limits.get('min_duration_hours')
        max_duration = limits.get('max_duration_hours')
        
        print(f"✅ Duration limits:")
        print(f"   Min: {min_duration} hours")
        print(f"   Max: {max_duration} hours")
        
        if min_duration and max_duration:
            if min_duration < max_duration:
                print("✅ Duration limits are valid (min < max)")
            else:
                print("❌ Duration limits are invalid (min >= max)")
        else:
            print("❌ Duration limits are missing")
            
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_config_file():
    """Тестирует файл конфигурации"""
    config_path = os.path.join(os.path.dirname(__file__), 'config', 'calculator_config.json')
    
    if not os.path.exists(config_path):
        print(f"❌ Config file not found: {config_path}")
        return False
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        print("✅ Config file loaded successfully")
        
        # Проверяем структуру
        if 'calculator_limits' not in config:
            print("❌ 'calculator_limits' section missing")
            return False
        
        limits = config['calculator_limits']
        
        if 'min_duration_hours' not in limits:
            print("❌ 'min_duration_hours' missing")
            return False
            
        if 'max_duration_hours' not in limits:
            print("❌ 'max_duration_hours' missing")
            return False
        
        min_duration = limits['min_duration_hours']
        max_duration = limits['max_duration_hours']
        
        print(f"✅ Config file duration limits:")
        print(f"   Min: {min_duration} hours")
        print(f"   Max: {max_duration} hours")
        
        if min_duration < max_duration:
            print("✅ Duration limits are valid (min < max)")
        else:
            print("❌ Duration limits are invalid (min >= max)")
            
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error reading config: {e}")
        return False

def main():
    """Основная функция тестирования"""
    print("🧪 Testing Duration Configuration")
    print("=" * 50)
    
    # Тестируем файл конфигурации
    print("\n1. Testing config file...")
    config_ok = test_config_file()
    
    # Тестируем загрузку через config manager
    print("\n2. Testing config manager...")
    manager_ok = test_config_loading()
    
    # Итоговый результат
    print("\n" + "=" * 50)
    if config_ok and manager_ok:
        print("🎉 All tests passed! Duration configuration is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the configuration.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
