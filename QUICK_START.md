# 🚀 Быстрый запуск Telegram Bot

## 1. Создание бота

1. Найдите @BotFather в Telegram
2. Отправьте `/newbot`
3. Введите имя: "Проф.Экипаж Бот"
4. Введите username: "prof_ekipazh_bot"
5. Сохраните токен

## 2. Создание группы

1. Создайте группу в Telegram
2. Добавьте бота в группу как администратора
3. Отправьте сообщение в группу
4. Получите Chat ID: `https://api.telegram.org/bot<TOKEN>/getUpdates`

## 3. Настройка

```bash
# Скопируйте пример конфигурации
cp .env_example .env

# Отредактируйте .env
nano .env
```

Добавьте в `.env`:
```env
TELEGRAM_BOT_TOKEN=ваш_токен_бота
TELEGRAM_CHAT_ID=ваш_chat_id
```

## 4. Запуск

```bash
# Тестирование
python test_telegram.py

# Запуск бота
python run_telegram_bot.py

# Или через Docker
docker-compose up telegram-bot
```

## 5. Проверка

```bash
# Проверка статуса
python check_bot_status.py

# Тест отправки сообщения
curl -X POST http://localhost:5000/api/v2/telegram/test \
  -H "Content-Type: application/json" \
  -d '{"test": "message"}'
```

## Команды бота

- `/start` - приветствие
- `/help` - справка
- `/status` - статус
- `/ping` - проверка соединения

## Устранение проблем

1. **Бот не отвечает**: проверьте токен
2. **Сообщения не отправляются**: проверьте Chat ID
3. **Ошибки Docker**: `docker-compose logs telegram-bot`

Подробная документация: [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md) 