theme: /

    state: ВыполнениеЭлемента
        q!: (~выполнил|~выполни|~сделал|~закрыл|~готово)
            [~задачу|~задача|~дело|~пункт]
            $AnyText::anyText

        script:
            var note = (($parseTree && $parseTree._anyText) || "").trim();
            if (!note) {
                $reactions.answer("Скажите, какую задачу отметить выполненной.");
                addSuggestions(["Выполнил купить молоко"], $context);
                return;
            }

            $reactions.sendData({
                action: {
                    type: "done_note",
                    note: note,
                },
            });

            $reactions.answer("Отметил как выполненную: " + note);
            addSuggestions(["Открой задачи", "Удали задачу купить молоко"], $context);