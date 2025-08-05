# Transport Company - Система грузоперевозок

Веб-приложение для расчета стоимости грузоперевозок с интеграцией Telegram бота для уведомлений о заявках.

## 🏗️ Архитектура проекта

```
TransportCompany/
├── app/                          # Основное Flask приложение
│   ├── __init__.py              # Инициализация Flask приложения
│   ├── models.py                # Модели данных (Vehicle, RouteRequest, etc.)
│   ├── order_models.py          # Модели заказов и хранилище
│   ├── calculator.py            # Логика расчета стоимости
│   ├── routes.py                # API эндпоинты
│   ├── telegram_bot.py          # Telegram бот сервис (для совместимости)
├── telegram_bot_standalone.py   # Telegram бот сервис (отдельный модуль)
│   ├── static/                  # Статические файлы
│   │   ├── css/
│   │   ├── js/
│   │   └── img/
│   └── templates/               # HTML шаблоны
├── nginx/                       # Конфигурация Nginx
├── prometheus/                  # Конфигурация мониторинга
├── docker-compose.yml           # Оркестрация контейнеров
├── Dockerfile                   # Основное приложение
├── Dockerfile.telegram          # Telegram бот
├── requirements.txt             # Зависимости основного приложения
├── requirements.txt             # Зависимости приложения (включая Telegram бота)
├── run_telegram_bot.py          # Скрипт запуска бота
├── test_telegram.py             # Тесты Telegram интеграции
├── TELEGRAM_SETUP.md            # Инструкции по настройке бота
└── .env_example                 # Пример переменных окружения
```

## 🚀 Быстрый старт

### 1. Клонирование и настройка

```bash
git clone <repository-url>
cd TransportCompany
cp .env_example .env
```

### 2. Настройка переменных окружения

Отредактируйте файл `.env`:

```env
# Настройки приложения
FLASK_DEBUG=0
PROMETHEUS_MULTIPROC_DIR=/tmp

# Настройки Grafana
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=admin
GF_USERS_ALLOW_SIGN_UP=false

# Настройки Prometheus
PROMETHEUS_SCRAPE_INTERVAL=15s

# Настройки Redis
REDIS_URL=redis://redis:6379/0

# Настройки Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### 3. Настройка Telegram бота

Следуйте инструкциям в [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md)

### 4. Запуск приложения

```bash
docker-compose up --build -d
```

## 📋 Сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| **Основное приложение** | 80 (через Nginx) | Flask приложение с калькулятором |
| **Telegram Bot** | - | Бот для уведомлений о заявках |
| **Prometheus** | 9090 | Мониторинг метрик |
| **Grafana** | 3000 | Визуализация метрик |
| **Redis** | - | Кэширование и rate limiting |

## 🔧 API Endpoints

### Калькулятор
- `POST /api/v2/calculator/step1` - Расчет первого шага
- `POST /api/v2/calculator/step2` - Подбор транспорта
- `POST /api/v2/calculator/step3` - Финальный расчет
- `POST /api/v2/calculator/complete` - Полный расчет

### Заказы
- `POST /api/v2/orders` - Создание заказа
- `GET /api/v2/orders` - Список заказов
- `GET /api/v2/orders/<id>` - Детали заказа
- `PUT /api/v2/orders/<id>/status` - Обновление статуса

### Мониторинг
- `GET /health` - Проверка здоровья приложения
- `GET /api/v2/health` - Детальная проверка здоровья

## 🧪 Тестирование

### Тест Telegram интеграции

```bash
python test_telegram.py
```

### Тест API

```bash
# Создание тестовой заявки
curl -X POST http://localhost/api/v2/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Тест",
    "customer_phone": "+79001234567",
    "from_address": "Москва",
    "to_address": "Санкт-Петербург",
    "pickup_time": "2024-01-15T10:00:00",
    "duration_hours": 8,
    "passengers": 2,
    "loaders": 1,
    "selected_vehicle": {"id": 1, "name": "Газель"},
    "total_cost": 15000,
    "order_notes": "Тестовая заявка"
  }'
```

## 📊 Мониторинг

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

## 🔍 Логи

```bash
# Логи основного приложения
docker-compose logs app

# Логи Telegram бота
docker-compose logs telegram-bot

# Логи всех сервисов
docker-compose logs -f
```

## 🛠️ Разработка

### Локальная разработка

```bash
# Установка зависимостей
pip install -r requirements.txt

# Запуск Flask приложения
export FLASK_APP=app
export FLASK_DEBUG=1
flask run

# Запуск Telegram бота (в отдельном терминале)
python run_telegram_bot.py
```

### Структура кода

- **Модели**: `app/models.py`, `app/order_models.py`
- **API**: `app/routes.py`
- **Калькулятор**: `app/calculator.py`
- **Telegram бот**: `app/telegram_bot.py`
- **Frontend**: `app/static/js/calculator_v2.js`

## 📝 Лицензия

GNU General Public License v3.0 - см. файл [LICENSE](LICENSE)
