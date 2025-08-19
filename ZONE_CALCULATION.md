# Зональный расчёт расстояний

## Обзор

Система зонального расчёта расстояний позволяет дифференцировать стоимость перевозок в зависимости от зоны маршрута:
- **Внутри города** - более низкие тарифы
- **За КАД (Кольцевой автодорогой)** - повышенные тарифы + стоимость проезда по КАД

## Архитектура

### Основные компоненты

1. **ZoneDistanceService** - основной сервис для расчёта расстояний с учётом зон
2. **Конфигурация зон** - настройки определения границ и тарифов
3. **API endpoints** - новые endpoints для зонального расчёта
4. **Frontend интеграция** - отображение зональной информации в калькуляторе

### Определение зон

#### По ключевым словам
- КАД, кольцевая, объездная, область, областной → зона "outside"

#### По координатам
- Расстояние от центра города (59.9311, 30.3609)
- Радиус города: 25 км (настраивается)
- Внутри радиуса → зона "city"
- За пределами → зона "outside"

### Типы маршрутов

1. **city_only** - полностью по городу
2. **outside_only** - полностью за КАД
3. **mixed** - смешанный маршрут

## Конфигурация

### Настройки в calculator_config.json

```json
{
  "pricing": {
    "base_cost_per_km": 10.0,
    "city_cost_per_km": 8.0,
    "outside_cost_per_km": 15.0,
    "kad_toll_cost": 100.0,
    "zone_detection": {
      "city_center": {
        "lat": 59.9311,
        "lng": 30.3609
      },
      "city_radius_km": 25.0,
      "kad_keywords": ["КАД", "кольцевая", "объездная", "область", "областной"],
      "kad_distance_threshold_km": 30.0
    }
  }
}
```

## API Endpoints

### Анализ маршрута с зонами

```http
POST /api/v2/calculator/zone-analysis
Content-Type: application/json

{
  "from_address": "Невский проспект, 1",
  "to_address": "Пушкин, Ленинградская область"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "total_distance": 25.3,
    "city_distance": 15.2,
    "outside_distance": 10.1,
    "from_zone": "city",
    "to_zone": "outside",
    "route_type": "mixed",
    "kad_toll_applied": true
  }
}
```

### Расчёт стоимости с учётом зон

```http
POST /api/v2/calculator/zone-pricing
Content-Type: application/json

{
  "from_address": "Невский проспект, 1",
  "to_address": "Пушкин, Ленинградская область",
  "duration_hours": 3,
  "urgent_pickup": false
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "route_analysis": { ... },
    "pricing": {
      "city_cost": 121.6,
      "outside_cost": 151.5,
      "duration_cost": 300,
      "kad_cost": 100,
      "base_total_cost": 673.1,
      "urgent_multiplier": 1.0,
      "total": 673
    }
  }
}
```

## Использование

### Backend

```python
from app.calculator import ZoneDistanceService

# Анализ маршрута
analysis = ZoneDistanceService.get_distance_with_zones(
    "Невский проспект, 1",
    "Пушкин, Ленинградская область"
)

# Расчёт стоимости
pricing = ZoneDistanceService.calculate_route_price_with_zones(
    analysis,
    duration_hours=3,
    urgent_pickup=False
)
```

### Frontend

```javascript
// Анализ маршрута
const response = await fetch('/api/v2/calculator/zone-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        from_address: 'Невский проспект, 1',
        to_address: 'Пушкин, Ленинградская область'
    })
});

const data = await response.json();
console.log(data.data.route_type); // "mixed"
```

## Отображение в калькуляторе

Система автоматически отображает информацию о зонах в калькуляторе:

- 🚗 **Маршрут по городу** - зелёный блок
- 🛣️ **Маршрут за КАД** - оранжевый блок  
- 🔄 **Смешанный маршрут** - синий блок

Дополнительно показывается стоимость проезда по КАД, если применимо.

## Тестирование

Запуск тестов:

```bash
python test_zone_calculation.py
```

Тесты проверяют:
- Определение зон по адресам
- Анализ маршрутов
- Расчёт стоимости
- Конфигурацию

## Производительность

### Кэширование
- Результаты геокодирования кэшируются на 1 час
- Анализ маршрутов кэшируется на 5 минут

### Оптимизации
- Batch-запросы к API карт
- Fallback расчёты при ошибках геокодирования
- Ленивая загрузка координат

## Расширение

### Добавление новых зон

1. Обновить конфигурацию в `calculator_config.json`
2. Добавить логику определения зоны в `ZoneDistanceService._determine_zone()`
3. Обновить расчёт стоимости в `calculate_route_price_with_zones()`

### Интеграция с реальными API карт

Заменить заглушки в `_get_coordinates()` на реальные HTTP запросы:

```python
import requests

def _get_coordinates(address: str):
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        'q': address,
        'format': 'json',
        'limit': 1
    }
    response = requests.get(url, params=params)
    data = response.json()
    
    if data:
        return {
            'lat': float(data[0]['lat']),
            'lng': float(data[0]['lon'])
        }
    return None
```

## Совместимость

Система полностью совместима с существующим API:
- Все старые endpoints продолжают работать
- Новые поля добавляются к существующим ответам
- Fallback к старому расчёту при ошибках

## Мониторинг

Логирование включает:
- Тип маршрута для каждого расчёта
- Ошибки геокодирования
- Производительность API запросов

Метрики Prometheus:
- `calculator_zone_analysis_duration_seconds`
- `calculator_zone_pricing_duration_seconds`
