theme: /

    state: НавигацияГлавная
        q!: (~открой|~перейди)
            [~на|~в]
            [~главную|~главная]

        script:
            $reactions.sendData({
                action: {
                    type: "navigate",
                    page: "home",
                },
            });
            $reactions.answer("Открываю главную.");

    state: НавигацияЗадачи
        q!: (~открой|~перейди)
            [~на|~в]
            [~задачи|~список задач]

        script:
            $reactions.sendData({
                action: {
                    type: "navigate",
                    page: "tasks",
                },
            });
            $reactions.answer("Открываю задачи.");

    state: НавигацияМузыка
        q!: (~открой|~перейди)
            [~на|~в]
            [~музыку|~музыка]

        script:
            $reactions.sendData({
                action: {
                    type: "navigate",
                    page: "music",
                },
            });
            $reactions.answer("Открываю музыку.");

    state: НавигацияФокус
        q!: (~открой|~перейди)
            [~в|~на]
            [~фокус|~таймер]

        script:
            $reactions.sendData({
                action: {
                    type: "navigate",
                    page: "focus",
                },
            });
            $reactions.answer("Открываю фокус.");