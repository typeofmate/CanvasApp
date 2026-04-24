theme: /

    state: ПоискМузыки
        q!: (~найди|~включи|~поищи|~поставь)
            [~трек|~песню|~музыку|~исполнителя]
            $AnyText::anyText

        script:
            var query = (($parseTree && $parseTree._anyText) || "").trim();
            if (!query) {
                $reactions.answer("Скажите, что искать в музыке.");
                addSuggestions(["Найди трек Imagine Dragons"], $context);
                return;
            }

            $reactions.sendData({
                action: {
                    type: "navigate",
                    page: "music",
                },
            });

            $reactions.sendData({
                action: {
                    type: "music_search",
                    query: query,
                },
            });

            $reactions.answer("Ищу: " + query);
            addSuggestions(["Открой музыку", "Найди трек The Weeknd"], $context);