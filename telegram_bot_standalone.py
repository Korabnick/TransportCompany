#!/usr/bin/env python3
"""
Отдельный модуль для телеграм бота без зависимостей от Flask
"""

import os
import logging
import asyncio
import json
from datetime import datetime
from typing import Dict, Any, Optional
from telegram import Bot, Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from telegram.error import TelegramError, NetworkError, TimedOut
import threading
from queue import Queue
import time

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class TelegramBotService:
    """Улучшенный сервис телеграм бота для отправки заявок"""
    
    def __init__(self):
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.chat_id = os.getenv('TELEGRAM_CHAT_ID')
        self.bot = None
        self.application = None
        self.is_running = False
        self.message_queue = Queue()
        self.worker_thread = None
        
        # Проверяем конфигурацию
        if not self.bot_token:
            logger.error("TELEGRAM_BOT_TOKEN не установлен в переменных окружения")
            return
            
        if not self.chat_id:
            logger.error("TELEGRAM_CHAT_ID не установлен в переменных окружения")
            return
            
        try:
            self.bot = Bot(token=self.bot_token)
            self.application = Application.builder().token(self.bot_token).build()
            self._setup_handlers()
            logger.info("Телеграм бот инициализирован успешно")
        except Exception as e:
            logger.error(f"Ошибка инициализации телеграм бота: {e}")
            self.bot = None
            self.application = None
    
    def _setup_handlers(self):
        """Настройка обработчиков команд бота"""
        if not self.application:
            return
            
        # Обработчики команд
        self.application.add_handler(CommandHandler("start", self._start_command))
        self.application.add_handler(CommandHandler("help", self._help_command))
        self.application.add_handler(CommandHandler("status", self._status_command))
        self.application.add_handler(CommandHandler("ping", self._ping_command))
        
        # Обработчик callback запросов
        self.application.add_handler(CallbackQueryHandler(self._button_callback))
        
        # Обработчик всех сообщений
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self._handle_message))
        
    async def _start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /start"""
        welcome_text = """
🚛 Добро пожаловать в бот "Проф.Экипаж"!

Этот бот предназначен для получения уведомлений о новых заявках на грузоперевозки.

Доступные команды:
/start - показать это сообщение
/help - справка по командам
/status - статус бота
/ping - проверить соединение

Бот автоматически будет отправлять новые заявки в этот чат.
        """
        await update.message.reply_text(welcome_text)
        
    async def _help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /help"""
        help_text = """
📋 Справка по командам бота:

/start - приветственное сообщение
/help - показать эту справку
/status - проверить статус бота
/ping - проверить соединение с API

🔔 Уведомления:
Бот автоматически отправляет новые заявки на грузоперевозки в этот чат.

📞 Поддержка:
По вопросам работы бота обращайтесь к администратору.
        """
        await update.message.reply_text(help_text)
        
    async def _status_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /status"""
        try:
            bot_info = await self.bot.get_me()
            status_text = f"""
✅ Статус бота:

🤖 Имя: {bot_info.first_name}
📝 Описание: {bot_info.description or 'Не указано'}
🆔 ID: {bot_info.id}
👤 Username: @{bot_info.username}

🔄 Статус: {'Активен' if self.is_running else 'Неактивен'}
📡 Chat ID: {self.chat_id}
⏰ Время: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}
📊 Сообщений в очереди: {self.message_queue.qsize()}
            """
            await update.message.reply_text(status_text)
        except Exception as e:
            logger.error(f"Ошибка при получении статуса: {e}")
            await update.message.reply_text("❌ Ошибка при получении статуса бота")
    
    async def _ping_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /ping для проверки соединения"""
        try:
            start_time = time.time()
            await self.bot.get_me()
            ping_time = (time.time() - start_time) * 1000
            
            await update.message.reply_text(
                f"🏓 Pong!\n"
                f"⏱️ Время ответа: {ping_time:.1f}ms\n"
                f"✅ Соединение с Telegram API установлено"
            )
        except Exception as e:
            logger.error(f"Ошибка ping: {e}")
            await update.message.reply_text("❌ Ошибка соединения с Telegram API")
            
    async def _button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик нажатий на кнопки"""
        query = update.callback_query
        await query.answer()
        
        try:
            if query.data == "accept_order":
                await self._handle_order_acceptance(query, context)
            elif query.data == "reject_order":
                await self._handle_order_rejection(query, context)
            elif query.data.startswith("order_"):
                await self._handle_order_action(query, context)
        except Exception as e:
            logger.error(f"Ошибка обработки callback: {e}")
            await query.edit_message_text("❌ Ошибка обработки действия")
            
    async def _handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик текстовых сообщений"""
        await update.message.reply_text(
            "💬 Для получения справки используйте команду /help"
        )
        
    async def _handle_order_acceptance(self, query, context):
        """Обработка принятия заказа"""
        await query.edit_message_text(
            f"✅ Заказ принят в работу\n\n"
            f"Время принятия: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}\n"
            f"Принял: {query.from_user.first_name}"
        )
        
    async def _handle_order_rejection(self, query, context):
        """Обработка отклонения заказа"""
        await query.edit_message_text(
            f"❌ Заказ отклонен\n\n"
            f"Время отклонения: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}\n"
            f"Отклонил: {query.from_user.first_name}"
        )
        
    async def _handle_order_action(self, query, context):
        """Обработка действий с заказом"""
        try:
            parts = query.data.split("_")
            if len(parts) >= 3:
                order_id = parts[1]
                action = parts[2]
                
                action_text = {
                    "accept": "принят",
                    "reject": "отклонен",
                    "process": "взят в обработку"
                }.get(action, "обработан")
                
                await query.edit_message_text(
                    f"🔄 Заказ #{order_id} {action_text}\n\n"
                    f"Время: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}\n"
                    f"Пользователь: {query.from_user.first_name}"
                )
            else:
                await query.edit_message_text("❌ Неверный формат данных заказа")
        except Exception as e:
            logger.error(f"Ошибка обработки действия заказа: {e}")
            await query.edit_message_text("❌ Ошибка обработки действия")
    
    def _format_order_message(self, order_data: Dict[str, Any]) -> str:
        """Форматирование сообщения о заявке"""
        try:
            # Извлекаем данные заявки
            customer_name = order_data.get('customer_name', 'Не указано')
            customer_phone = order_data.get('customer_phone', 'Не указано')
            from_address = order_data.get('from_address', 'Не указано')
            to_address = order_data.get('to_address', 'Не указано')
            pickup_time = order_data.get('pickup_time', 'Не указано')
            duration_hours = order_data.get('duration_hours', 1)
            passengers = order_data.get('passengers', 0)
            loaders = order_data.get('loaders', 0)
            selected_vehicle = order_data.get('selected_vehicle', {})
            total_cost = order_data.get('total_cost', 0)
            order_notes = order_data.get('order_notes', '')
            
            # Форматируем время подачи
            if pickup_time and pickup_time != 'Не указано':
                try:
                    pickup_dt = datetime.fromisoformat(pickup_time.replace('Z', '+00:00'))
                    pickup_formatted = pickup_dt.strftime('%d.%m.%Y в %H:%M')
                except:
                    pickup_formatted = pickup_time
            else:
                pickup_formatted = 'Не указано'
                
            # Формируем сообщение
            message = f"""
🚛 <b>НОВАЯ ЗАЯВКА НА ГРУЗОПЕРЕВОЗКУ</b>

👤 <b>Клиент:</b>
• Имя: {customer_name}
• Телефон: {customer_phone}

📍 <b>Маршрут:</b>
• Откуда: {from_address}
• Куда: {to_address}

⏰ <b>Время:</b>
• Подача: {pickup_formatted}
• Длительность: {duration_hours} ч.

🚗 <b>Транспорт:</b>
• Тип: {selected_vehicle.get('name', 'Не выбран')}
• Пассажиры: {passengers}
• Грузчики: {loaders}

💰 <b>Стоимость:</b> {total_cost:,.0f} ₽

📝 <b>Примечания:</b>
{order_notes if order_notes else 'Не указаны'}

🆔 <b>ID заявки:</b> {order_data.get('id', 'new')}
⏰ <b>Время создания:</b> {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}
            """
            
            return message.strip()
        except Exception as e:
            logger.error(f"Ошибка форматирования сообщения: {e}")
            return f"❌ Ошибка форматирования заявки: {str(e)}"
    
    async def _send_message_with_retry(self, message: str, order_id: str, max_retries: int = 3) -> bool:
        """Отправка сообщения с повторными попытками"""
        for attempt in range(max_retries):
            try:
                # Создаем кнопки для действий
                keyboard = [
                    [
                        InlineKeyboardButton("✅ Принять", callback_data=f"order_{order_id}_accept"),
                        InlineKeyboardButton("❌ Отклонить", callback_data=f"order_{order_id}_reject")
                    ],
                    [
                        InlineKeyboardButton("🔄 В обработку", callback_data=f"order_{order_id}_process")
                    ]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                # Отправляем сообщение
                result = await self.bot.send_message(
                    chat_id=self.chat_id,
                    text=message,
                    parse_mode='HTML',
                    reply_markup=reply_markup
                )
                
                logger.info(f"Уведомление о заявке отправлено в чат {self.chat_id}, message_id: {result.message_id}")
                return True
                
            except (NetworkError, TimedOut) as e:
                logger.warning(f"Сетевая ошибка при отправке (попытка {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Экспоненциальная задержка
                continue
            except TelegramError as e:
                logger.error(f"Ошибка Telegram API при отправке: {e}")
                return False
            except Exception as e:
                logger.error(f"Неожиданная ошибка при отправке: {e}")
                return False
        
        logger.error(f"Не удалось отправить сообщение после {max_retries} попыток")
        return False
    
    async def send_order_notification(self, order_data: Dict[str, Any]) -> bool:
        """Отправка уведомления о новой заявке"""
        if not self.bot or not self.chat_id:
            logger.error("Бот не инициализирован или не указан chat_id")
            return False
            
        try:
            # Проверяем, что бот работает
            bot_info = await self.bot.get_me()
            logger.info(f"Бот активен: {bot_info.first_name} (@{bot_info.username})")
            
            # Формируем сообщение о заявке
            message = self._format_order_message(order_data)
            order_id = order_data.get('id', 'new')
            
            # Отправляем сообщение с повторными попытками
            return await self._send_message_with_retry(message, order_id)
            
        except Exception as e:
            logger.error(f"Ошибка при отправке уведомления: {e}")
            return False
    
    def queue_order_notification(self, order_data: Dict[str, Any]) -> bool:
        """Добавление заявки в очередь для отправки"""
        try:
            self.message_queue.put(order_data)
            logger.info(f"Заявка добавлена в очередь. Размер очереди: {self.message_queue.qsize()}")
            return True
        except Exception as e:
            logger.error(f"Ошибка добавления заявки в очередь: {e}")
            return False
    
    async def _message_worker(self):
        """Рабочий поток для обработки очереди сообщений"""
        logger.info("Запуск обработчика очереди сообщений")
        
        while self.is_running:
            try:
                # Получаем сообщение из очереди с таймаутом
                try:
                    order_data = self.message_queue.get(timeout=1)
                except:
                    continue
                
                # Отправляем сообщение
                success = await self.send_order_notification(order_data)
                
                if success:
                    logger.info("Сообщение успешно отправлено")
                else:
                    logger.error("Не удалось отправить сообщение")
                
                # Помечаем задачу как выполненную
                self.message_queue.task_done()
                
            except Exception as e:
                logger.error(f"Ошибка в обработчике сообщений: {e}")
                await asyncio.sleep(1)
        
        logger.info("Обработчик очереди сообщений остановлен")
    
    async def start_polling(self):
        """Запуск бота в режиме polling"""
        if self.is_running:
            logger.warning("Бот уже запущен")
            return
        
        try:
            logger.info("Запуск телеграм бота...")
            
            # Создаем новый экземпляр приложения
            self.application = Application.builder().token(self.bot_token).build()
            self._setup_handlers()
            
            await self.application.initialize()
            await self.application.start()
            
            self.is_running = True
            logger.info("Бот запущен, начинаем polling...")
            
            # Запускаем обработчик очереди сообщений
            asyncio.create_task(self._message_worker())
            
            # Запускаем polling
            await self.application.run_polling(
                allowed_updates=Update.ALL_TYPES,
                drop_pending_updates=True,
                close_loop=False,
                stop_signals=None
            )
        except Exception as e:
            logger.error(f"Ошибка запуска бота: {e}")
            self.is_running = False
            raise
            
    async def stop_polling(self):
        """Остановка бота"""
        if not self.is_running:
            logger.info("Бот уже остановлен")
            return
        
        try:
            self.is_running = False
            
            if self.application and self.application.running:
                await self.application.stop()
                await self.application.shutdown()
            
            logger.info("Телеграм бот остановлен")
        except Exception as e:
            logger.error(f"Ошибка остановки бота: {e}")

# Глобальный экземпляр сервиса
telegram_service = TelegramBotService()

def send_order_to_telegram(order_data: Dict[str, Any]) -> bool:
    """Синхронная функция для отправки заказа в телеграм"""
    try:
        # Добавляем заявку в очередь
        return telegram_service.queue_order_notification(order_data)
    except Exception as e:
        logger.error(f"Ошибка при добавлении заказа в очередь: {e}")
        return False 