theme: /

    state: ЗапускФокуса
        q!: (~запусти|~включи|~поставь|~начни)
            [~фокус|~таймер]
            $AnyText::anyText

        script:
            var raw = (($parseTree && $parseTree._anyText) || "").trim();
            var minutes = 25;
            if (raw) {
                var match = raw.match(/(\d{1,3})/);
                if (match && match[1]) {
                    minutes = parseInt(match[1], 10);
                }
            }

            if (!minutes || minutes < 1) {
                minutes = 25;
            }
            if (minutes > 180) {
                minutes = 180;
            }

            $reactions.sendData({
                action: {
                    type: "navigate",
                    page: "focus",
                },
            });

            $reactions.sendData({
                action: {
                    type: "focus_start",
                    minutes: minutes,
                },
            });

            $reactions.answer("Запускаю фокус на " + minutes + " минут.");
            addSuggestions(["Останови фокус", "Открой задачи"], $context);

    state: ОстановкаФокуса
        q!: (~останови|~стоп|~пауза|~прекрати)
            [~фокус|~таймер]

        script:
            $reactions.sendData({
                action: {
                    type: "focus_stop",
                },
            });
            $reactions.answer("Остановил фокус.");
            addSuggestions(["Запусти фокус на 25 минут", "Открой задачи"], $context);