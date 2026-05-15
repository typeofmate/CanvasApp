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
        q!: (запусти|открой|включи|вруби|старт) * (nova voice canvas|canvas voice lab|нова войс канвас|нова голосовой холст|канвас)

        script:
            navigateTo("home", $context);
            $reactions.answer("Nova Voice Canvas запущен. Можно сказать: открой задачи, добавь задачу, найди трек или запусти фокус.");
            addSuggestions([
                "Открой задачи",
                "Добавь задачу купить молоко",
                "Найди трек Imagine Dragons",
                "Запусти фокус на 25 минут"
            ], $context);

    state: Fallback
        event!: noMatch

        script:
            var query = ($context.request.query || "").trim();
            if (!query || query.length < 2) {
                return;
            }

            $reactions.answer("Не понял команду. Попробуйте: открой задачи, добавь задачу купить молоко, найди трек The Weeknd или запусти фокус на 25 минут.");
            addSuggestions([
                "Открой задачи",
                "Добавь задачу купить молоко",
                "Найди трек The Weeknd",
                "Запусти фокус на 25 минут"
            ], $context);