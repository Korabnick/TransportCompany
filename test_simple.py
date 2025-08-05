#!/usr/bin/env python3
"""
Простой тест API для отправки уведомлений в Telegram
"""

import requests
import json
from datetime import datetime, timedelta

def test_telegram_api():
    """Тест отправки уведомления через API"""
    
    # Тестовые данные (без кириллицы для избежания проблем с кодировкой)
    test_data = {
        "customer_name": "Test Client",
        "customer_phone": "+7 999 123-45-67",
        "from_address": "Saint Petersburg, Nevsky pr. 1",
        "to_address": "Saint Petersburg, Moskovsky pr. 1",
        "pickup_time": (datetime.now() + timedelta(hours=1)).isoformat(),
        "duration_hours": 2,
        "passengers": 1,
        "loaders": 2,
        "selected_vehicle": {
            "name": "Gazel Tent",
            "type": "gazel",
            "capacity": 12.0
        },
        "total_cost": 2500.0,
        "order_notes": "Test order for bot verification",
        "payment_method": "online"
    }
    
    try:
        print("🚀 Testing Telegram API...")
        
        # Отправляем запрос
        response = requests.post(
            "http://localhost/api/v2/telegram/test",
            headers={"Content-Type": "application/json"},
            json=test_data,
            timeout=10
        )
        
        print(f"📡 HTTP Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API Response:")
            print(f"   Success: {result.get('success')}")
            print(f"   Telegram sent: {result.get('telegram_sent')}")
            print(f"   Message: {result.get('message')}")
            
            if result.get('telegram_sent'):
                print("🎉 Notification successfully sent to Telegram!")
            else:
                print("❌ Failed to send notification to Telegram")
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server")
        print("   Make sure the application is running: docker-compose up")
    except requests.exceptions.Timeout:
        print("❌ Request timeout")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_telegram_api() 