import os
from flask import Flask, request
from prometheus_flask_exporter.multiprocess import GunicornPrometheusMetrics
from dotenv import load_dotenv
from flask_caching import Cache
import shutil

load_dotenv()

app = Flask(__name__)

# Конфигурация приложения
app.config.update(
    SECRET_KEY=os.getenv('FLASK_SECRET_KEY', 'default-secret-key'),
    TEMPLATES_AUTO_RELOAD=True,
)

cache = Cache(config={
    'CACHE_TYPE': 'RedisCache',
    'CACHE_REDIS_URL': 'redis://redis:6379/0'
})
cache.init_app(app)

# Настройка метрик для многопроцессного режима
if os.environ.get('PROMETHEUS_MULTIPROC_DIR'):
    # Очищаем и создаем директорию для метрик
    metrics_dir = os.environ['PROMETHEUS_MULTIPROC_DIR']
    if os.path.exists(metrics_dir):
        shutil.rmtree(metrics_dir)
    os.makedirs(metrics_dir, exist_ok=True)
    
    metrics = GunicornPrometheusMetrics(app)
else:
    from prometheus_flask_exporter import PrometheusMetrics
    metrics = PrometheusMetrics(app)

# Регистрация метрик
metrics.info('app_info', 'Cargo Transportation Info', version='1.0.0')
metrics.info('calculator_info', 'Calculator metrics')

metrics.register_default(
    metrics.counter(
        'calculator_steps_total', 
        'Total calculator steps',
        labels={'step': lambda: request.path.split('/')[-1]}
    )
)

def create_app():
    """Фабрика для создания Flask приложения"""
    # Импортируем маршруты здесь, чтобы избежать циклических импортов
    from app import routes
    
    return app

# Инициализируем маршруты при импорте модуля
from app import routes