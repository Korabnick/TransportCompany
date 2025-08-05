#!/usr/bin/env python3
"""
Скрипт для запуска телеграм бота
"""

import asyncio
import os
import sys
import signal
import logging
from dotenv import load_dotenv

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/tmp/telegram_bot.log')
    ]
)
logger = logging.getLogger(__name__)

# Загружаем переменные окружения
load_dotenv()

# Добавляем путь к приложению
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Импортируем nest_asyncio для решения проблемы с event loop
import nest_asyncio
nest_asyncio.apply()

# Импортируем отдельный модуль телеграм бота
from telegram_bot_standalone import telegram_service

class TelegramBotRunner:
    """Класс для управления запуском телеграм бота"""
    
    def __init__(self):
        self.shutdown_event = asyncio.Event()
        self.task = None
    
    async def start(self):
        """Запуск бота"""
        logger.info("🚀 Запуск телеграм бота для Проф.Экипаж...")
        
        # Проверяем наличие токена
        if not os.getenv('TELEGRAM_BOT_TOKEN'):
            logger.error("❌ Ошибка: TELEGRAM_BOT_TOKEN не установлен в переменных окружения")
            logger.error("Добавьте токен в файл .env или установите переменную окружения")
            return False
        
        # Проверяем наличие chat_id
        if not os.getenv('TELEGRAM_CHAT_ID'):
            logger.error("❌ Ошибка: TELEGRAM_CHAT_ID не установлен в переменных окружения")
            logger.error("Добавьте chat_id в файл .env или установите переменную окружения")
            return False
        
        try:
            logger.info("✅ Бот инициализирован успешно")
            logger.info(f"📡 Chat ID: {os.getenv('TELEGRAM_CHAT_ID')}")
            logger.info("🤖 Бот запущен и ожидает сообщения...")
            logger.info("Для остановки нажмите Ctrl+C")
            
            # Запускаем бота
            self.task = asyncio.create_task(telegram_service.start_polling())
            
            # Ждем завершения или сигнала остановки
            await self.shutdown_event.wait()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка запуска бота: {e}")
            return False
    
    async def stop(self):
        """Остановка бота"""
        logger.info("🛑 Получен сигнал остановки...")
        self.shutdown_event.set()
        
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        
        try:
            await telegram_service.stop_polling()
        except Exception as e:
            logger.error(f"Ошибка при остановке бота: {e}")
        
        logger.info("✅ Бот остановлен")

def signal_handler(signum, frame):
    """Обработчик сигналов для graceful shutdown"""
    logger.info(f"Получен сигнал {signum}")
    if runner:
        asyncio.create_task(runner.stop())

async def main():
    """Основная функция запуска бота"""
    global runner
    
    # Настраиваем обработчики сигналов
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    runner = TelegramBotRunner()
    
    try:
        success = await runner.start()
        if not success:
            sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Получен сигнал прерывания")
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        sys.exit(1)
    finally:
        await runner.stop()

if __name__ == "__main__":
    runner = None
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("🛑 Приложение остановлено пользователем")
    except Exception as e:
        logger.error(f"❌ Критическая ошибка: {e}")
        sys.exit(1) 