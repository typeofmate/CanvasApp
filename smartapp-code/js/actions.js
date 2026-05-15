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

function searchMusic(query, context) {
    addAction({
        type: "music_search",
        query: query
    }, context);
}

function startFocus(minutes, context) {
    addAction({
        type: "focus_start",
        minutes: minutes
    }, context);
}

function stopFocus(context) {
    addAction({
        type: "focus_stop"
    }, context);
}
