FROM python:3.12-slim

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем только необходимые файлы для телеграм бота
COPY telegram_service/telegram_bot_standalone.py .
COPY telegram_service/run_telegram_bot.py .

# Создаем директорию для логов
RUN mkdir -p /tmp/prometheus /tmp/logs

# Создаем пользователя для безопасности
RUN useradd --create-home --shell /bin/bash telegram_bot && \
    chown -R telegram_bot:telegram_bot /app /tmp

# Переключаемся на пользователя
USER telegram_bot

# Проверка здоровья
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import requests; requests.get('https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe')" || exit 1

# Запускаем телеграм бота
CMD ["python", "run_telegram_bot.py"] 