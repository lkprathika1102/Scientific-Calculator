const state = {
    angleMode: 'DEG',
    memory: 0,
    lastResult: 0,
    vars: {
        ans: 0,
        pi: Math.PI,
        e: Math.E,
        x: 0,
        y: 0,
        z: 0,

    },

}

const exprInput = document.getElementById('expr-input');
const resultDisplay = document.getElementById('result-display');
const modeIndicator = document.getElementById('mode-indicator');
const memIndicator = document.getElementById('mem-indicator');
const keypad = document.getElementById('keypad');

function insertTextAtCursor(text) {
    const start = exprInput.selectionStart;
    const end = exprInput.selectionEnd;
    const val = exprInput.value;

    exprInput.value = val.slice(0, start) + text + val.slice(end);
    const nextPos = start + text.length;
    exprInput.setSelectionRange(nextPos, nextPos);
    exprInput.focus();

}

function deleteAtCursor() {
    const start = exprInput.selectionStart;
    const end = exprInput.selectionEnd;
    const val = exprInput.value;

    if (start === end) {
        if (start > 0) {
            exprInput.value = val.slice(0,start - 1) + val.slice(end);
            exprInput.setSelectionRange(start - 1, start - 1);
        }
    } else {
        exprInput.value = val.slice(0, start) + val.slice(end);
        exprInput.setSelectionRange(start, start);
    }
    exprInput.focus();

}

function toggleAngleMode(){
    state.angleMode = state.angleMode === 'DEG' ? 'RAD' : 'DEG';
    modeIndicator.textContent = state.angleMode;

}

function updateMemoryIndicator() {
    memIndicator.textContent = state.memory !== 0 ? 'M' : '';
}

function clearEntry() {
    exprInput.value = '';
    exprInput.focus();

}

function allClear() {
    exprInput.value = '';
    state.lastResult = 0;
    resultDisplay.textContent = '0';
    exprInput.focus();
}

function handleAction(action) {
    switch (action) {
        case 'toggle-mode':
            toggleAngleMode();
            break;
        case 'backspace':
            deleteAtCursor();
            break;
        case 'clear-entry':
            clearEntry();
            break;
        case 'all-clear':
            allClear();
            break;
        case 'mem-clear':
            state.memory = 0;
            updateMemoryIndicator();
            break;
        case 'mem-recall':
            insertTextAtCursor(state.memory.toString());
            break;
        case 'mem-add':
            state.memory += Number(resultDisplay.textContent) || 0;
            updateMemoryIndicator();
            break;
        case 'evaluate':
            // parser will be written here

            resultDisplay.textContent = exprInput.value;
            break;

    }
}

keypad.addEventListener('click' , (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const insert = target.getAttribute('data-insert');
    const action = target.getAttribute('data-action');

    if (insert !==null) {
        insertTextAtCursor(insert);
    } else if(action !==null) {
        handleAction(action);

    }
});



window.addEventListener('load', () => {
    exprInput.focus();

});
