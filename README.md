# LAIH_Proxy

Node.js-прокси для Language AI Helper — централизует все запросы к OpenAI (чат, Vision, PDF) и позволяет обходить региональные ограничения.

## Особенности

- Проксирование всех запросов к OpenAI (chat, vision, PDF)
- Защита ключа OpenAI (ключ хранится только на сервере)
- Легко деплоится на Railway, Render, VPS и др.
- Не содержит поиска изображений (для этого используйте LAIH_DDG_Image_Proxy)

## Запуск

```bash
npm install
OPENAI_API_KEY=sk-... node server.js
```

## Эндпоинты

- `POST /chat` — проксирует запросы к OpenAI Chat API
- `POST /chat/pdf` — проксирует PDF/vision-запросы

## Деплой на Railway
1. Зайдите на [Railway](https://railway.app/), создайте новый проект.
2. Подключите репозиторий с LAIH_Proxy.
3. В настройках проекта добавьте переменную окружения `OPENAI_API_KEY`.
4. Запустите деплой — Railway сам соберёт и запустит сервер.

## Лицензия

GPL-2.0
