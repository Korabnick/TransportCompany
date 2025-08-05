#!/usr/bin/env python3
"""
Скрипт для проверки статуса телеграм бота
"""

import os
import sys
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def check_bot_status():
    """Проверка статуса бота"""
    print("🔍 Проверка статуса Telegram Bot...")
    
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    
    if not bot_token:
        print("❌ TELEGRAM_BOT_TOKEN не найден")
        return False
    
    if not chat_id:
        print("❌ TELEGRAM_CHAT_ID не найден")
        return False
    
    try:
        # Проверяем информацию о боте
        url = f"https://api.telegram.org/bot{bot_token}/getMe"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            bot_info = response.json()
            if bot_info.get('ok'):
                bot_data = bot_info['result']
                print(f"✅ Бот активен: {bot_data.get('first_name')} (@{bot_data.get('username')})")
                
                # Проверяем доступ к чату
                test_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                test_data = {
                    'chat_id': chat_id,
                    'text': f"🔍 Проверка статуса бота - {datetime.now().strftime('%H:%M:%S')}",
                    'parse_mode': 'HTML'
                }
                
                test_response = requests.post(test_url, json=test_data, timeout=10)
                if test_response.status_code == 200:
                    result = test_response.json()
                    if result.get('ok'):
                        print(f"✅ Доступ к чату {chat_id} подтвержден")
                        print(f"   Последнее сообщение ID: {result['result']['message_id']}")
                        return True
                    else:
                        print(f"❌ Ошибка доступа к чату: {result.get('description')}")
                        return False
                else:
                    print(f"❌ Ошибка отправки тестового сообщения: {test_response.status_code}")
                    return False
            else:
                print(f"❌ Ошибка API: {bot_info.get('description')}")
                return False
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Таймаут подключения")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка подключения: {e}")
        return False

def check_docker_status():
    """Проверка статуса Docker контейнера"""
    print("\n🔍 Проверка статуса Docker контейнера...")
    
    try:
        import subprocess
        result = subprocess.run(
            ['docker-compose', 'ps', 'telegram-bot'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            output = result.stdout
            if 'Up' in output:
                print("✅ Контейнер telegram-bot запущен")
                return True
            else:
                print("❌ Контейнер telegram-bot не запущен")
                return False
        else:
            print("❌ Ошибка проверки Docker контейнера")
            return False
            
    except FileNotFoundError:
        print("⚠️  Docker Compose не найден")
        return None
    except subprocess.TimeoutExpired:
        print("❌ Таймаут проверки Docker")
        return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

def check_logs():
    """Проверка логов бота"""
    print("\n🔍 Проверка логов бота...")
    
    try:
        import subprocess
        result = subprocess.run(
            ['docker-compose', 'logs', '--tail=10', 'telegram-bot'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            logs = result.stdout.strip()
            if logs:
                print("📋 Последние логи:")
                for line in logs.split('\n')[-5:]:  # Последние 5 строк
                    if line.strip():
                        print(f"   {line}")
            else:
                print("📋 Логи пусты")
        else:
            print("❌ Не удалось получить логи")
            
    except FileNotFoundError:
        print("⚠️  Docker Compose не найден")
    except subprocess.TimeoutExpired:
        print("❌ Таймаут получения логов")
    except Exception as e:
        print(f"❌ Ошибка: {e}")

def main():
    """Основная функция"""
    print("🚀 Проверка статуса Telegram Bot для Проф.Экипаж")
    print("=" * 50)
    
    # Проверяем статус бота
    bot_ok = check_bot_status()
    
    # Проверяем Docker статус
    docker_ok = check_docker_status()
    
    # Проверяем логи
    check_logs()
    
    print("\n" + "=" * 50)
    print("📊 Результаты проверки:")
    print(f"   Telegram Bot: {'✅ OK' if bot_ok else '❌ ERROR'}")
    print(f"   Docker Container: {'✅ OK' if docker_ok else '❌ ERROR' if docker_ok is False else '⚠️  UNKNOWN'}")
    
    if bot_ok and docker_ok:
        print("\n🎉 Все системы работают корректно!")
    else:
        print("\n⚠️  Обнаружены проблемы:")
        if not bot_ok:
            print("   - Проверьте токен бота и Chat ID")
        if docker_ok is False:
            print("   - Запустите контейнер: docker-compose up telegram-bot")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Проверка прервана пользователем")
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        sys.exit(1) 