# Canvas Voice Lab (React + Vite)

Собственное Canvas-приложение с несколькими страницами и интеграцией голосового помощника Салют. Репозиторий `todo-canvas-app` использован как ориентир по процессу подключения и отладки, но код реализован заново.

## Что реализовано

- Многостраничный интерфейс (Главная, Задачи, Холст, Интеграция).
- Todo-страница: добавление, выполнение и удаление задач.
- Canvas-страница: рисование мышью/тачем, выбор толщины и цвета, очистка.
- Интеграция с `@salutejs/client`:
  - в `development` с токеном запускается `createSmartappDebugger`;
  - в `production` используется `createAssistant`.
- Обработка команд:
  - навигация между страницами;
  - добавление задачи;
  - очистка холста;
  - локальный ввод команд и Web Speech API как fallback для браузера.

## Быстрый старт

1. Установите зависимости:

```bash
npm install
```

2. Создайте `.env` на основе шаблона:

```bash
cp .env.example .env
```

3. Заполните `.env`:

```env
VITE_SALUTE_TOKEN=ваш_токен_из_SmartApp_Studio
VITE_SALUTE_SMARTAPP=NovaVoiceCanvas
VITE_SALUTE_INIT_PHRASE=Запусти Nova Voice Canvas
VITE_SALUTE_SURFACE=SBERBOX
```

`VITE_SALUTE_SMARTAPP` может быть внутренним именем проекта, а `VITE_SALUTE_INIT_PHRASE` должна совпадать с фразой запуска, зарегистрированной в SmartApp Studio.
Если локальный отладчик отвечает, что навык не зарегистрирован, проверьте поверхность: для приложения СберБанк Онлайн используйте `SBOL`, для приложения Салют - `COMPANION`, для SberBox оставьте `SBERBOX`.

4. Запустите проект:

```bash
npm run dev
```

5. Соберите production-версию:

```bash
npm run build
```

## Как повторить процесс из примера todo-canvas-app

1. Клонирование примера:

```bash
git clone https://github.com/sberdevices/todo-canvas-app.git
```

2. Открытие в Visual Studio Code:

```bash
code todo-canvas-app
```

3. Изучение структуры и команд запуска, после чего перенос идеи в это приложение.

4. Создание SmartApp Code проекта:
- создайте проект;
- загрузите backend-сценарий;
- соберите и получите Webhook URL.

5. Создание SmartApp Studio приложения:
- тип: Canvas App;
- инструмент: есть готовое приложение;
- укажите Webhook из SmartApp Code;
- задайте имя смартапа.

6. Генерация токена в SmartApp Studio и добавление его в `.env`.

7. Локальный запуск `npm run dev` и отладка через панель ассистента.

## Поддерживаемые команды (локальный fallback)

- `открой задачи`
- `открой холст`
- `перейди на главную`
- `добавь задачу <текст>`
- `выполни задачу <номер>`
- `очисти холст`

## Стек

- React 19
- Vite 7
- Tailwind CSS 4
- Framer Motion
- @salutejs/client
