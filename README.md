* INSTRUCTIONS
* 1. Создание и активация виртуальной среды:
```bash
python -m venv venv
```
 - Активация:
 - - Linux:
```bash
. ./venv/bin/activate
```

 - - Windows:
```bash
venv\Scripts\activate
```

* 2. Установка зависимостей:
```bash
pip install -r requirements.txt
```


<!-- Более не требуется:
1. Создание Docker контейнера:
```bash
docker run -d --name interview -e POSTGRES_USER=intview -e POSTGRES_PASSWORD=intview -e POSTGRES_DB=interview -p 5432:5432 --restart unless-stopped postgres:latest
```

2. Открытие терминала созданого Docker контейнера:
```bash
docker exec -it interview psql -U intview -d interview
```

3. Создание базы данных в Docker контейнере:
```bash
CREATE DATABASE interview_platform;
``` -->

4. Запуск проекта:
```bash
docker compose up --build
```

<!-- Более не требуется:
5. Создание тестовой записи вакансии и пресетов в базе данных (заменится админ-панелью в будущем). 
 - Вводить в отдельной консоли при запущенном приложении:
- 1) 
```bash
python test_db.py
```
- 2) 
```bash
python test_presets.py
``` -->

6. Остановка проекта:
```bash
docker compose down
```

Для миграций:
```bash
flask db migrate -m "Migration description"
```

```bash
flask db upgrade
```