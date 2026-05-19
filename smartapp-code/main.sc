require: slotfilling/slotFilling.sc
  module = sys.zb-common

require: js/getters.js
require: js/reply.js
require: js/actions.js

# Более конкретные команды лучше подключать выше более общих.
require: sc/navigation.sc
require: sc/music.sc
require: sc/focus.sc
require: sc/addNote.sc
require: sc/doNote.sc
require: sc/deleteNote.sc

patterns:
    $AnyText = $nonEmptyGarbage

theme: /

    state: Start
        q!: $regex</start>
        # При локальной отладке createSmartappDebugger отправляет initPhrase как обычный текст.
        # В названии смартапа нужны разговорные варианты, а не внутреннее CamelCase-имя.
        q!: (запусти | открой | включи | вруби | старт) nova voice canvas
        q!: (запусти | открой | включи | вруби | старт) nova voicecanvas
        q!: (запусти | открой | включи | вруби | старт) novavoicecanvas
        q!: (запусти | открой | включи | вруби | старт) canvas voice lab
        q!: (запусти | открой | включи | вруби | старт) нова войс канвас
        q!: (запусти | открой | включи | вруби | старт) нова голосовой холст
        q!: (запусти | открой | включи | вруби | старт) канвас

        script:
            navigateTo("home", $context);
            $reactions.answer("Начнём.");
            addSuggestions([
                "Открой задачи",
                "Добавь задачу купить молоко",
                "Найди трек Imagine Dragons",
                "Запусти фокус на 25 минут"
            ], $context);

    state: Fallback
        event!: noMatch

        script:
            var query = (($context.request.query || "") + "").trim();
            if (!query || query.length < 2) {
                return;
            }

            var lower = query.toLowerCase().replace(/ё/g, "е");
            var match;
            var minutes;
            var note;
            var subtask;
            var taskNumber;
            var subtaskNumber;
            var musicQuery;
            var focusMode;

            if (/(запусти|открой|включи|вруби|старт)/.test(lower) && /(nova|нова|canvas|канвас)/.test(lower)) {
                navigateTo("home", $context);
                $reactions.answer("Я здесь. Скажите команду.");
                addSuggestions(["Открой задачи", "Включи первый трек", "Запусти фокус на 20 минут"], $context);
                return;
            }

            if (/(включи|поставь|сделай|смени|переключи)/.test(lower) && /(темн|ночн)/.test(lower) && /(тем|режим|оформлен)/.test(lower)) {
                setTheme("dark", $context);
                $reactions.answer("Включил темную тему.");
                return;
            }

            if (/(включи|поставь|сделай|смени|переключи)/.test(lower) && /(светл|дневн)/.test(lower) && /(тем|режим|оформлен)/.test(lower)) {
                setTheme("light", $context);
                $reactions.answer("Включил светлую тему.");
                return;
            }

            if (/^(?:темная|ночная)\s+(?:тема|режим)$/.test(lower)) {
                setTheme("dark", $context);
                $reactions.answer("Включил темную тему.");
                return;
            }

            if (/^(?:светлая|дневная)\s+(?:тема|режим)$/.test(lower)) {
                setTheme("light", $context);
                $reactions.answer("Включил светлую тему.");
                return;
            }

            match = lower.match(/^(?:(?:выполни|выполнил|сделал|закрой|закрыл|готово|отметь)\s+)?([0-9]+|[а-яё]+)\s*(?:\.|точка)\s*([0-9]+|[а-яё]+)$/i);
            if (match && match[1] && match[2]) {
                taskNumber = parseVoiceNumber(match[1]);
                subtaskNumber = parseVoiceNumber(match[2]);
                if (taskNumber && subtaskNumber) {
                    doneSubtaskByPath(taskNumber, subtaskNumber, $context);
                    $reactions.answer("Отметил " + taskNumber + "." + subtaskNumber + " как выполненную.");
                    addSuggestions(["Открой задачи", "Закрой 1.2", "Закрой 2.1"], $context);
                    return;
                }
            }

            match = lower.match(/^(?:выполни|выполнил|сделал|закрой|закрыл|готово|отметь)\s+(?:задачу|пункт)\s+([0-9]+|[а-яё]+)\s*(?:\.|точка)\s*([0-9]+|[а-яё]+)$/i);
            if (match && match[1] && match[2]) {
                taskNumber = parseVoiceNumber(match[1]);
                subtaskNumber = parseVoiceNumber(match[2]);
                if (taskNumber && subtaskNumber) {
                    doneSubtaskByPath(taskNumber, subtaskNumber, $context);
                    $reactions.answer("Отметил " + taskNumber + "." + subtaskNumber + " как выполненную.");
                    addSuggestions(["Открой задачи", "Закрой 1.2", "Закрой 2.1"], $context);
                    return;
                }
            }

            match = query.match(/^(?:добавь|запиши|создай|поставь)\s+(?:подзадачу|подзадача|подпункт|шаг)\s+(.+?)\s+(?:к|в|для)\s+(?:задаче|задачу|делу|пункту)\s+(?:номер\s+)?([0-9а-яА-ЯёЁ]+)$/i);
            if (match && match[1] && match[2]) {
                subtask = match[1].trim();
                taskNumber = parseVoiceNumber(match[2]);
                if (taskNumber) {
                    addSubtaskByTaskNumber(taskNumber, subtask, $context);
                    $reactions.answer("Добавил подзадачу к задаче " + taskNumber + ".");
                    addSuggestions(["Открой задачи", "Закрой " + taskNumber + ".1"], $context);
                    return;
                }
            }

            match = query.match(/^(?:добавь|запиши|создай|поставь)\s+(?:в|к|для)\s+(?:задаче|задачу|делу|пункту)\s+(?:номер\s+)?([0-9а-яА-ЯёЁ]+)\s+(?:подзадачу|подзадача|подпункт|шаг)\s+(.+)$/i);
            if (match && match[1] && match[2]) {
                taskNumber = parseVoiceNumber(match[1]);
                subtask = match[2].trim();
                if (taskNumber) {
                    addSubtaskByTaskNumber(taskNumber, subtask, $context);
                    $reactions.answer("Добавил подзадачу к задаче " + taskNumber + ".");
                    addSuggestions(["Открой задачи", "Закрой " + taskNumber + ".1"], $context);
                    return;
                }
            }

            match = query.match(/^(?:добавь|запиши|создай|поставь)\s+(?:подзадачу|подзадача|подпункт|шаг)\s+(.+?)\s+(?:к|в|для)\s+(?:задаче|задачу|делу|пункту)\s+(.+)$/i);
            if (match && match[1] && match[2]) {
                subtask = match[1].trim();
                note = match[2].trim();
                addSubtask(note, subtask, $context);
                $reactions.answer("Добавил подзадачу: " + subtask);
                addSuggestions(["Открой задачи", "Выполни подзадачу " + subtask + " в задаче " + note], $context);
                return;
            }

            match = query.match(/^(?:добавь|запиши|создай|поставь)\s+(?:в|к|для)\s+(?:задаче|задачу|делу|пункту)\s+(.+?)\s+(?:подзадачу|подзадача|подпункт|шаг)\s+(.+)$/i);
            if (match && match[1] && match[2]) {
                note = match[1].trim();
                subtask = match[2].trim();
                addSubtask(note, subtask, $context);
                $reactions.answer("Добавил подзадачу: " + subtask);
                addSuggestions(["Открой задачи", "Выполни подзадачу " + subtask + " в задаче " + note], $context);
                return;
            }

            match = query.match(/^(?:выполни|выполнил|сделал|закрыл|готово)\s+(?:подзадачу|подзадача|подпункт|шаг)\s+(?!номер\s)(?![0-9]+\s)(.+?)\s+(?:в|к|для)\s+(?:задаче|задачу|делу|пункту)\s+(.+)$/i);
            if (match && match[1] && match[2]) {
                subtask = match[1].trim();
                note = match[2].trim();
                doneSubtask(note, subtask, $context);
                $reactions.answer("Отметил подзадачу как выполненную: " + subtask);
                addSuggestions(["Открой задачи", "Удали подзадачу " + subtask + " в задаче " + note], $context);
                return;
            }

            match = query.match(/^(?:выполни|выполнил|сделал|закрой|закрыл|готово|отметь)\s+(?:(?:подзадачу|подзадача|подпункт|шаг)\s+)?(?:номер\s+)?([0-9а-яА-ЯёЁ]+)\s+(?:в|к|для)\s+(?:задаче|задачу|делу|пункту)\s+(.+)$/i);
            if (match && match[1] && match[2]) {
                subtaskNumber = parseVoiceNumber(match[1]);
                note = match[2].trim();
                if (subtaskNumber) {
                    doneSubtask(note, subtaskNumber, $context);
                    $reactions.answer("Отметил подзадачу номер " + subtaskNumber + " как выполненную.");
                    addSuggestions(["Открой задачи", "Добавь подзадачу проверить чек к задаче " + note], $context);
                    return;
                }
            }

            match = query.match(/^(?:выполни|выполнил|сделал|закрой|закрыл|готово|отметь)\s+([0-9а-яА-ЯёЁ]+)\s+(?:подзадачу|подзадача|подпункт|шаг)\s+(?:в|к|для)\s+(?:задаче|задачу|делу|пункту)\s+(.+)$/i);
            if (match && match[1] && match[2]) {
                subtaskNumber = parseVoiceNumber(match[1]);
                note = match[2].trim();
                if (subtaskNumber) {
                    doneSubtask(note, subtaskNumber, $context);
                    $reactions.answer("Отметил подзадачу номер " + subtaskNumber + " как выполненную.");
                    addSuggestions(["Открой задачи", "Добавь подзадачу проверить чек к задаче " + note], $context);
                    return;
                }
            }

            match = query.match(/^(?:выполни|выполнил|сделал|закрой|закрыл|готово|отметь)\s+(?:(?:подзадачу|подзадача|подпункт|шаг)\s+)?(?:номер\s+)?([0-9а-яА-ЯёЁ]+)$/i);
            if (match && match[1]) {
                subtaskNumber = parseVoiceNumber(match[1]);
                if (subtaskNumber) {
                    doneSubtask("", subtaskNumber, $context);
                    $reactions.answer("Отметил подзадачу номер " + subtaskNumber + " как выполненную.");
                    addSuggestions(["Открой задачи"], $context);
                    return;
                }
            }

            match = query.match(/^(?:выполни|выполнил|сделал|закрой|закрыл|готово|отметь)\s+([0-9а-яА-ЯёЁ]+)\s+(?:подзадачу|подзадача|подпункт|шаг)$/i);
            if (match && match[1]) {
                subtaskNumber = parseVoiceNumber(match[1]);
                if (subtaskNumber) {
                    doneSubtask("", subtaskNumber, $context);
                    $reactions.answer("Отметил подзадачу номер " + subtaskNumber + " как выполненную.");
                    addSuggestions(["Открой задачи"], $context);
                    return;
                }
            }

            match = query.match(/^(?:удали|удалить|убери|стереть)\s+(?:подзадачу|подзадача|подпункт|шаг)\s+(.+?)\s+(?:в|из|к|для)\s+(?:задаче|задачи|задачу|делу|пункту)\s+(.+)$/i);
            if (match && match[1] && match[2]) {
                subtask = match[1].trim();
                note = match[2].trim();
                deleteSubtask(note, subtask, $context);
                $reactions.answer("Удалил подзадачу: " + subtask);
                addSuggestions(["Открой задачи", "Добавь подзадачу проверить чек к задаче " + note], $context);
                return;
            }

            match = query.match(/^(?:добавь|запиши|создай|поставь)\s+(?:задачу|задача|дело|пункт|заметку|напоминание)\s+(.+)$/i);
            if (match && match[1]) {
                note = match[1].trim();
                addNote(note, $context);
                $reactions.answer("Добавил задачу: " + note);
                addSuggestions(["Открой задачи", "Выполнил " + note, "Удали задачу " + note], $context);
                return;
            }

            match = query.match(/^(?:выполнил|выполни|сделал|закрыл|готово)\s+(?:задачу|задача|дело|пункт)?\s*(.+)$/i);
            if (match && match[1]) {
                note = match[1].trim();
                if (/подзадач|подпункт/i.test(note)) {
                    $reactions.answer("Для подзадачи скажите короткий номер, например: один точка один.");
                    addSuggestions(["Закрой 1.1", "Закрой 1.2", "Открой задачи"], $context);
                    return;
                }
                doneNote(note, $context);
                $reactions.answer("Отметил как выполненную: " + note);
                addSuggestions(["Открой задачи", "Удали задачу " + note], $context);
                return;
            }

            match = query.match(/^(?:удали|удалить|убери|стереть)\s+(?:задачу|задача|дело|пункт|заметку|напоминание)?\s*(.+)$/i);
            if (match && match[1]) {
                note = match[1].trim();
                deleteNote(note, $context);
                $reactions.answer("Удалил задачу: " + note);
                addSuggestions(["Открой задачи", "Добавь задачу оплатить интернет"], $context);
                return;
            }

            if (/(сбрось|сброс|обнули|перезапусти)/.test(lower) && /(фокус|таймер|отдых|перерыв)/.test(lower)) {
                resetFocus($context);
                $reactions.answer("Сбросил таймер.");
                addSuggestions(["Запусти фокус на 25 минут", "Запусти отдых на 5 минут"], $context);
                return;
            }

            if (/(продолжи|возобнови|дальше|старт)/.test(lower) && /(фокус|таймер|отдых|перерыв)/.test(lower)) {
                resumeFocus($context);
                $reactions.answer("Продолжаю таймер.");
                addSuggestions(["Пауза таймер", "Сбрось таймер"], $context);
                return;
            }

            if (/(останови|стоп|пауза|приостанови|прекрати)/.test(lower) && /(фокус|таймер|отдых|перерыв)/.test(lower)) {
                pauseFocus($context);
                $reactions.answer("Поставил таймер на паузу.");
                addSuggestions(["Запусти фокус на 25 минут", "Открой задачи"], $context);
                return;
            }

            if (/(запусти|включи|поставь|начни|установи)/.test(lower) && /(фокус|таймер|отдых|перерыв)/.test(lower)) {
                focusMode = getFocusModeFromText(lower);
                minutes = getFocusMinutesFromText(lower, focusMode);

                navigateTo("focus", $context);
                startFocus(minutes, focusMode, $context);
                if (focusMode === "break") {
                    $reactions.answer("Запускаю таймер отдыха на " + minutes + " минут.");
                } else {
                    $reactions.answer("Запускаю фокус на " + minutes + " минут.");
                }
                addSuggestions(["Останови фокус", "Запусти отдых на 5 минут", "Открой задачи"], $context);
                return;
            }

            if (/(фокус|таймер|отдых|перерыв)/.test(lower) && parseVoiceNumber(lower)) {
                focusMode = getFocusModeFromText(lower);
                minutes = getFocusMinutesFromText(lower, focusMode);

                navigateTo("focus", $context);
                startFocus(minutes, focusMode, $context);
                if (focusMode === "break") {
                    $reactions.answer("Запускаю таймер отдыха на " + minutes + " минут.");
                } else {
                    $reactions.answer("Запускаю фокус на " + minutes + " минут.");
                }
                addSuggestions(["Пауза таймер", "Сбрось таймер", "Открой задачи"], $context);
                return;
            }

            if (/(останови|стоп|пауза|прекрати|выключи)/.test(lower) && /(музык|трек|песн)/.test(lower)) {
                pauseMusic($context);
                $reactions.answer("Поставил музыку на паузу.");
                addSuggestions(["Включи первый трек", "Найди трек The Weeknd"], $context);
                return;
            }

            if (/(включи|запусти|играй|продолжи)/.test(lower) && /(первый|текущий|найденный)/.test(lower)) {
                navigateTo("music", $context);
                playCurrentMusic($context);
                $reactions.answer("Включаю трек.");
                addSuggestions(["Пауза музыка", "Найди трек The Weeknd"], $context);
                return;
            }

            match = query.match(/^(?:включи|запусти|поставь)\s+(?:трек|песню|музыку|исполнителя)\s+(.+)$/i);
            if (match && match[1]) {
                musicQuery = match[1].trim();
                navigateTo("music", $context);
                playMusic(musicQuery, $context);
                $reactions.answer("Включаю: " + musicQuery);
                addSuggestions(["Пауза музыка", "Найди трек The Weeknd"], $context);
                return;
            }

            match = query.match(/^(?:найди|поищи)\s+(?:трек|песню|музыку|исполнителя)\s+(.+)$/i);
            if (match && match[1]) {
                musicQuery = match[1].trim();
                navigateTo("music", $context);
                searchMusic(musicQuery, $context);
                $reactions.answer("Ищу: " + musicQuery);
                addSuggestions(["Открой музыку", "Найди трек The Weeknd"], $context);
                return;
            }

            if (/(открой|покажи|перейди|домой)/.test(lower) && /(главн|домой)/.test(lower)) {
                navigateTo("home", $context);
                $reactions.answer("Открываю главную.");
                return;
            }

            if (/(открой|покажи|перейди)/.test(lower) && /(задач|список задач)/.test(lower)) {
                navigateTo("tasks", $context);
                $reactions.answer("Открываю задачи.");
                return;
            }

            if (/(открой|покажи|перейди)/.test(lower) && /(музык|трек|песн)/.test(lower)) {
                navigateTo("music", $context);
                $reactions.answer("Открываю музыку.");
                return;
            }

            if (/(открой|покажи|перейди)/.test(lower) && /(фокус|таймер)/.test(lower)) {
                navigateTo("focus", $context);
                $reactions.answer("Открываю фокус.");
                return;
            }

            $reactions.answer("Не понял команду.");
            addSuggestions([
                "Открой задачи",
                "Добавь задачу купить молоко",
                "Найди трек The Weeknd",
                "Запусти фокус на 25 минут"
            ], $context);

