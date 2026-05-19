theme: /

    state: НавигацияГлавная
        q!: (~открой|~перейди)
            [~на|~в]
            [~главную|~главная]

        script:
            navigateTo("home", $context);
            $reactions.answer("Открываю главную.");

    state: НавигацияЗадачи
        q!: (~открой|~перейди)
            [~на|~в]
            [~задачи|~список задач]

        script:
            navigateTo("tasks", $context);
            $reactions.answer("Открываю задачи.");

    state: НавигацияМузыка
        q!: (~открой|~перейди)
            [~на|~в]
            [~музыку|~музыка]

        script:
            navigateTo("music", $context);
            $reactions.answer("Открываю музыку.");

    state: НавигацияФокус
        q!: (~открой|~перейди)
            [~в|~на]
            [~фокус|~таймер]

        script:
            navigateTo("focus", $context);
            $reactions.answer("Открываю фокус.");
