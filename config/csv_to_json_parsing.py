import csv
import json

def csv_to_geojson(csv_file_path, json_file_path):
    # Создаем структуру GeoJSON
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "КАД Санкт-Петербург",
                    "description": "Полигон Кольцевой автодороги"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[]]  # Здесь будут координаты
                }
            }
        ]
    }
    
    # Читаем CSV-файл и извлекаем координаты
    coordinates = []
    with open(csv_file_path, 'r', encoding='utf-8') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        
        for row in csv_reader:
            # МЕНЯЕМ МЕСТАМИ ДОЛГОТУ И ШИРОТУ
            # Теперь: lng (долгота) берется из 'liat', а lat (широта) из 'loit'
            try:
                lng = float(row['liat'])  # Долгота (ранее была широтой)
                lat = float(row['loit'])  # Широта (ранее была долготой)
                coordinates.append([lng, lat])
            except (ValueError, KeyError) as e:
                print(f"Ошибка при обработке строки: {row}. Ошибка: {e}")
    
    # Проверяем, что первая и последняя точки совпадают (замыкаем полигон)
    if coordinates and coordinates[0] != coordinates[-1]:
        coordinates.append(coordinates[0])
    
    # Добавляем координаты в структуру GeoJSON
    geojson['features'][0]['geometry']['coordinates'][0] = coordinates
    
    # Сохраняем в JSON-файл
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(geojson, json_file, indent=2, ensure_ascii=False)
    
    print(f"Файл успешно сохранен: {json_file_path}")
    print(f"Обработано точек: {len(coordinates)}")

# Использование функции
if __name__ == "__main__":
    csv_to_geojson('KAD.csv', 'kad_polygon.geojson')