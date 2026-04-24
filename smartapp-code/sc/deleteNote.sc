theme: /

    state: УдалениеЭлемента
        q!: (~удали|~удалить|~убери|~стереть)
            [~задачу|~задача|~дело|~пункт|~заметку|~напоминание]
            $AnyText::anyText

        script:
            var note = (($parseTree && $parseTree._anyText) || "").trim();
            if (!note) {
                $reactions.answer("Скажите, какую задачу удалить.");
                addSuggestions(["Удали задачу купить молоко"], $context);
                return;
            }

            $reactions.sendData({
                action: {
                    type: "delete_note",
                    note: note,
                },
            });

            $reactions.answer("Удалил задачу: " + note);
            addSuggestions(["Открой задачи", "Добавь задачу оплатить интернет"], $context);