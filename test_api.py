#!/usr/bin/env python3
"""
Простой тест API для отправки уведомлений в Telegram
"""

import requests
import json
from datetime import datetime, timedelta

def test_telegram_api():
    """Тест отправки уведомления через API"""
    
    # Тестовые данные
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
        "order_notes": "Тестовая заявка для проверки бота",
        "payment_method": "online"
    }
    
    try:
        print("🚀 Тестирование API отправки в Telegram...")
        
        # Отправляем запрос
        response = requests.post(
            "http://localhost/api/v2/telegram/test",
            headers={"Content-Type": "application/json"},
            json=test_data,
            timeout=10
        )
        
        print(f"📡 HTTP статус: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Ответ API:")
            print(f"   Успех: {result.get('success')}")
            print(f"   Telegram отправлен: {result.get('telegram_sent')}")
            print(f"   Сообщение: {result.get('message')}")
            
            if result.get('telegram_sent'):
                print("🎉 Уведомление успешно отправлено в Telegram!")
            else:
                print("❌ Не удалось отправить уведомление в Telegram")
        else:
            print(f"❌ Ошибка API: {response.status_code}")
            print(f"   Ответ: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Не удалось подключиться к серверу")
        print("   Убедитесь, что приложение запущено: docker-compose up")
    except requests.exceptions.Timeout:
        print("❌ Таймаут запроса")
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    test_telegram_api() 