function navigateTo(page, context) {
    addAction({
        type: "navigate",
        page: page
    }, context);
}

function addNote(note, context) {
    addAction({
        type: "add_note",
        note: note
    }, context);
}

function doneNote(note, context) {
    addAction({
        type: "done_note",
        note: note
    }, context);
}

function doneNoteById(id, context) {
    addAction({
        type: "done_note",
        id: id
    }, context);
}

function deleteNote(note, context) {
    addAction({
        type: "delete_note",
        note: note
    }, context);
}

function deleteNoteById(id, context) {
    addAction({
        type: "delete_note",
        id: id
    }, context);
}

function addSubtask(note, subtask, context) {
    addAction({
        type: "add_subtask",
        note: note,
        subtask: subtask
    }, context);
}

function addSubtaskByTaskNumber(taskNumber, subtask, context) {
    addAction({
        type: "add_subtask",
        task_number: taskNumber,
        subtask: subtask
    }, context);
}

function doneSubtask(note, subtask, context) {
    var action = {
        type: "done_subtask",
        note: note
    };

    if (typeof subtask === "number") {
        action.subtask_number = subtask;
    } else {
        action.subtask = subtask;
    }

    addAction(action, context);
}

function doneSubtaskByPath(taskNumber, subtaskNumber, context) {
    addAction({
        type: "done_subtask",
        task_number: taskNumber,
        subtask_number: subtaskNumber
    }, context);
}

function deleteSubtask(note, subtask, context) {
    addAction({
        type: "delete_subtask",
        note: note,
        subtask: subtask
    }, context);
}

function searchMusic(query, context) {
    addAction({
        type: "music_search",
        query: query
    }, context);
}

function playMusic(query, context) {
    addAction({
        type: "music_play",
        query: query
    }, context);
}

function playCurrentMusic(context) {
    addAction({
        type: "music_play_current"
    }, context);
}

function pauseMusic(context) {
    addAction({
        type: "music_pause"
    }, context);
}

function pauseFocus(context) {
    addAction({
        type: "focus_pause"
    }, context);
}

function resumeFocus(context) {
    addAction({
        type: "focus_resume"
    }, context);
}

function resetFocus(context) {
    addAction({
        type: "focus_reset"
    }, context);
}

function setTheme(theme, context) {
    addAction({
        type: "theme_set",
        theme: theme
    }, context);
}

function startFocus(minutes, focusMode, context) {
    if (!context) {
        context = focusMode;
        focusMode = "custom";
    }

    addAction({
        type: "focus_start",
        minutes: minutes,
        focus_mode: focusMode || "custom"
    }, context);
}

function stopFocus(context) {
    addAction({
        type: "focus_stop"
    }, context);
}

function parseVoiceNumber(text) {
    var raw = ((text || "") + "").toLowerCase().replace(/ё/g, "е");
    var digitMatch = raw.match(/(\d{1,3})/);
    if (digitMatch && digitMatch[1]) {
        return parseInt(digitMatch[1], 10);
    }

    if (/пол\s*часа|полчаса/.test(raw)) {
        return 30;
    }

    var numbers = {
        "один": 1,
        "одна": 1,
        "одну": 1,
        "два": 2,
        "две": 2,
        "три": 3,
        "четыре": 4,
        "пять": 5,
        "шесть": 6,
        "семь": 7,
        "восемь": 8,
        "девять": 9,
        "десять": 10,
        "одиннадцать": 11,
        "двенадцать": 12,
        "тринадцать": 13,
        "четырнадцать": 14,
        "пятнадцать": 15,
        "шестнадцать": 16,
        "семнадцать": 17,
        "восемнадцать": 18,
        "девятнадцать": 19,
        "двадцать": 20,
        "тридцать": 30,
        "сорок": 40,
        "пятьдесят": 50,
        "шестьдесят": 60,
        "семьдесят": 70,
        "восемьдесят": 80,
        "девяносто": 90,
        "сто": 100
    };

    var ordinals = {
        "первый": 1,
        "первая": 1,
        "первую": 1,
        "первое": 1,
        "первого": 1,
        "второй": 2,
        "вторая": 2,
        "вторую": 2,
        "второе": 2,
        "второго": 2,
        "третий": 3,
        "третья": 3,
        "третью": 3,
        "третье": 3,
        "третьего": 3,
        "четвертый": 4,
        "четвертая": 4,
        "четвертую": 4,
        "четвертое": 4,
        "пятый": 5,
        "пятая": 5,
        "пятую": 5,
        "шестой": 6,
        "шестая": 6,
        "шестую": 6,
        "седьмой": 7,
        "седьмая": 7,
        "седьмую": 7,
        "восьмой": 8,
        "восьмая": 8,
        "восьмую": 8,
        "девятый": 9,
        "девятая": 9,
        "девятую": 9,
        "десятый": 10,
        "десятая": 10,
        "десятую": 10
    };

    var words = raw.replace(/[^а-яa-z0-9\s]/g, " ").split(/\s+/);
    var current = 0;
    var found = false;

    for (var index = 0; index < words.length; index++) {
        if (ordinals[words[index]]) {
            return ordinals[words[index]];
        }

        var value = numbers[words[index]];
        if (value) {
            current += value;
            found = true;
            continue;
        }

        if (found) {
            break;
        }
    }

    if (!found) {
        return null;
    }

    if (/час|часа|часов/.test(raw) && current <= 3) {
        return current * 60;
    }

    return current;
}

function getFocusModeFromText(text) {
    var raw = ((text || "") + "").toLowerCase().replace(/ё/g, "е");
    if (/отдых|перерыв|пауза|брейк|break|rest/.test(raw)) {
        return "break";
    }
    if (/фокус|работ|помодор|концентр/.test(raw)) {
        return "work";
    }
    return "custom";
}

function getDefaultFocusMinutes(focusMode) {
    if (focusMode === "break") {
        return 5;
    }
    return 25;
}

function getFocusMinutesFromText(text, focusMode) {
    var minutes = parseVoiceNumber(text);
    if (!minutes) {
        minutes = getDefaultFocusMinutes(focusMode);
    }
    if (minutes < 1) {
        return 1;
    }
    if (minutes > 180) {
        return 180;
    }
    return minutes;
}
