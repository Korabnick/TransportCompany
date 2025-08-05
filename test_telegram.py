#!/usr/bin/env python3
"""
Тестовый скрипт для проверки работы телеграм бота
"""

import os
import sys
import requests
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def test_telegram_api():
    """Тест подключения к Telegram API"""
    print("🔍 Тестирование подключения к Telegram API...")
    
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        print("❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения")
        return False
    
    try:
        # Тестируем API
        url = f"https://api.telegram.org/bot{bot_token}/getMe"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            bot_info = response.json()
            if bot_info.get('ok'):
                bot_data = bot_info['result']
                print(f"✅ Бот подключен успешно!")
                print(f"   Имя: {bot_data.get('first_name')}")
                print(f"   Username: @{bot_data.get('username')}")
                print(f"   ID: {bot_data.get('id')}")
                return True
            else:
                print(f"❌ Ошибка API: {bot_info.get('description')}")
                return False
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Таймаут подключения к Telegram API")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка подключения: {e}")
        return False

def test_chat_access():
    """Тест доступа к чату"""
    print("\n🔍 Тестирование доступа к чату...")
    
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    
    if not chat_id:
        print("❌ TELEGRAM_CHAT_ID не найден в переменных окружения")
        return False
    
    try:
        # Тестируем отправку сообщения
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        test_message = f"🧪 Тестовое сообщение от {datetime.now().strftime('%H:%M:%S')}"
        
        data = {
            'chat_id': chat_id,
            'text': test_message,
            'parse_mode': 'HTML'
        }
        
        response = requests.post(url, json=data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                print(f"✅ Сообщение отправлено в чат {chat_id}")
                print(f"   Message ID: {result['result']['message_id']}")
                return True
            else:
                print(f"❌ Ошибка отправки: {result.get('description')}")
                return False
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Таймаут отправки сообщения")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка отправки: {e}")
        return False

def test_webhook_endpoint():
    """Тест веб-хука (если используется)"""
    print("\n🔍 Тестирование веб-хука...")
    
    try:
        # Тестируем локальный API
        url = "http://localhost:5000/api/v2/telegram/test"
        test_data = {
            "customer_name": "Тест Клиент",
            "customer_phone": "+7 999 123-45-67",
            "from_address": "Санкт-Петербург, Невский пр. 1",
            "to_address": "Санкт-Петербург, Московский пр. 1",
            "pickup_time": (datetime.now() + timedelta(hours=1)).isoformat(),
            "duration_hours": 2,
            "passengers": 1,
            "loaders": 2,
            "selected_vehicle": {
                "name": "Газель Тент",
                "type": "gazel",
                "capacity": 12.0
            },
            "total_cost": 2500.0,
            "order_notes": "Тестовая заявка для проверки бота"
        }
        
        response = requests.post(url, json=test_data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ Тестовое сообщение отправлено через API")
                print(f"   Telegram отправлен: {result.get('telegram_sent')}")
                return True
            else:
                print(f"❌ Ошибка API: {result.get('error')}")
                return False
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
            print(f"   Ответ: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Не удалось подключиться к локальному API (сервер не запущен?)")
        return False
    except requests.exceptions.Timeout:
        print("❌ Таймаут запроса к API")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка запроса: {e}")
        return False

def check_environment():
    """Проверка переменных окружения"""
    print("🔍 Проверка переменных окружения...")
    
    required_vars = [
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_CHAT_ID'
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            # Скрываем токен в выводе
            if 'TOKEN' in var:
                display_value = value[:10] + "..." if len(value) > 10 else "***"
            else:
                display_value = value
            print(f"   ✅ {var}: {display_value}")
    
    if missing_vars:
        print(f"   ❌ Отсутствуют переменные: {', '.join(missing_vars)}")
        return False
    
    return True

def test_bot_commands():
    """Тест команд бота"""
    print("\n🔍 Тестирование команд бота...")
    
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    
    commands = [
        ('/start', 'Приветственное сообщение'),
        ('/help', 'Справка по командам'),
        ('/status', 'Статус бота'),
        ('/ping', 'Проверка соединения')
    ]
    
    for command, description in commands:
        try:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            data = {
                'chat_id': chat_id,
                'text': f"🧪 Тест команды: {command}"
            }
            
            response = requests.post(url, json=data, timeout=5)
            if response.status_code == 200:
                print(f"   ✅ {command} - {description}")
            else:
                print(f"   ❌ {command} - ошибка {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ {command} - ошибка: {e}")

def main():
    """Основная функция тестирования"""
    print("🚀 Тестирование Telegram Bot для Проф.Экипаж")
    print("=" * 50)
    
    # Проверяем переменные окружения
    if not check_environment():
        print("\n❌ Не все переменные окружения настроены")
        print("Создайте файл .env с необходимыми переменными")
        return
    
    # Тестируем API
    if not test_telegram_api():
        print("\n❌ Не удалось подключиться к Telegram API")
        return
    
    # Тестируем доступ к чату
    if not test_chat_access():
        print("\n❌ Не удалось отправить сообщение в чат")
        print("Проверьте Chat ID и права бота в группе")
        return
    
    # Тестируем веб-хук (опционально)
    test_webhook_endpoint()
    
    # Тестируем команды
    test_bot_commands()
    
    print("\n" + "=" * 50)
    print("✅ Тестирование завершено!")
    print("\n📋 Рекомендации:")
    print("1. Убедитесь, что бот добавлен в группу как администратор")
    print("2. Проверьте права бота на отправку сообщений")
    print("3. Для полного тестирования запустите бота: python run_telegram_bot.py")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Тестирование прервано пользователем")
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        sys.exit(1) 