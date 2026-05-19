theme: /

    state: ЗапускФокуса
        q!: (~запусти|~включи|~поставь|~начни)
            [~фокус|~таймер|~отдых|~перерыв]
            $AnyText::anyText

        script:
            var raw = (($parseTree && $parseTree._anyText) || "").trim();
            var focusMode = getFocusModeFromText(raw);
            var minutes = getFocusMinutesFromText(raw, focusMode);

            navigateTo("focus", $context);
            startFocus(minutes, focusMode, $context);

            if (focusMode === "break") {
                $reactions.answer("Запускаю таймер отдыха на " + minutes + " минут.");
            } else {
                $reactions.answer("Запускаю фокус на " + minutes + " минут.");
            }
            addSuggestions(["Останови фокус", "Запусти отдых на 5 минут", "Открой задачи"], $context);

    state: ОстановкаФокуса
        q!: (~останови|~стоп|~пауза|~прекрати)
            [~фокус|~таймер|~отдых|~перерыв]

        script:
            pauseFocus($context);
            $reactions.answer("Поставил таймер на паузу.");
            addSuggestions(["Продолжи таймер", "Сбрось таймер", "Открой задачи"], $context);

    state: ПродолжениеФокуса
        q!: (~продолжи|~возобнови|~дальше|~старт)
            [~фокус|~таймер|~отдых|~перерыв]

        script:
            resumeFocus($context);
            $reactions.answer("Продолжаю таймер.");
            addSuggestions(["Пауза таймер", "Сбрось таймер"], $context);

    state: СбросФокуса
        q!: (~сбрось|~сброс|~обнули)
            [~фокус|~таймер|~отдых|~перерыв]

        script:
            resetFocus($context);
            $reactions.answer("Сбросил таймер.");
            addSuggestions(["Запусти фокус на 25 минут", "Запусти отдых на 5 минут"], $context);
