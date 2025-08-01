FROM python:3.12-slim

# Установка зависимостей
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Установка зависимостей Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install redis celery flask-limiter

# Создаем директорию для метрик
RUN mkdir -p /tmp/prometheus

# Копирование исходного кода
COPY . .

# Запуск приложения с предзагрузкой
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--preload", "app:app"]