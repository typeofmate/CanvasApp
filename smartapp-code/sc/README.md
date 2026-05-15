SmartApp Code Scenarios For Nova Voice Canvas
Файл:

sc/novaCanvas.sc
Что поддерживается:

добавление задачи: add_note
выполнение задачи: done_note
удаление задачи: delete_note
навигация по разделам: navigate (home, tasks, music, focus)
поиск музыки: music_search
запуск/остановка фокуса: focus_start, focus_stop
Как использовать:

Откройте проект SmartApp Code.
Перейдите в редактор сценариев.
Добавьте файл novaCanvas.sc (или вставьте его содержимое в основной сценарий).
Нажмите Собрать.
Убедитесь, что CanvasApp в SmartApp Studio подключен к webhook этой сборки.
Важно:

Названия action.type в сценарии и в src/App.tsx должны совпадать.
После изменения сценариев пересобрать SmartApp Code.