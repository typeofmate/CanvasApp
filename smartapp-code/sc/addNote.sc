theme: /

    state: ДобавлениеЭлемента
        q!: (~добавь|~запиши|~создай|~поставь)
            [~задачу|~задача|~дело|~пункт|~заметку|~напоминание]
            $AnyText::anyText

        script:
            var note = (($parseTree && $parseTree._anyText) || "").trim();
            if (!note) {
                $reactions.answer("Скажите название задачи.");
                addSuggestions(["Добавь задачу купить молоко"], $context);
                return;
            }

            $reactions.sendData({
                action: {
                    type: "add_note",
                    note: note,
                },
            });

            $reactions.answer("Добавил задачу: " + note);
            addSuggestions(["Открой задачи", "Выполнил купить молоко", "Удали задачу купить молоко"], $context);