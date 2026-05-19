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

            navigateTo("music", $context);
            if (/^(включи|поставь)/i.test(($context.request.query || ""))) {
                playMusic(query, $context);
                $reactions.answer("Включаю: " + query);
            } else {
                searchMusic(query, $context);
                $reactions.answer("Ищу: " + query);
            }

            addSuggestions(["Открой музыку", "Включи первый трек", "Найди трек The Weeknd"], $context);

    state: ПаузаМузыки
        q!: (~пауза|~останови|~стоп|~выключи)
            [~музыку|~трек|~песню]

        script:
            pauseMusic($context);
            $reactions.answer("Поставил музыку на паузу.");
            addSuggestions(["Включи первый трек", "Найди трек The Weeknd"], $context);

    state: ПродолжениеМузыки
        q!: (~включи|~запусти|~продолжи)
            [~первый|~текущий|~найденный]
            [~трек|~песню]

        script:
            navigateTo("music", $context);
            playCurrentMusic($context);
            $reactions.answer("Включаю трек.");
            addSuggestions(["Пауза музыка", "Найди трек The Weeknd"], $context);
