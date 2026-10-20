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

const TOKEN_TYPES = {
    NUMBER: 'NUMBER',
    IDENT: 'IDENT',      // const, variables and stuff
    OP: 'OP',             // + _ * etc
    LPAREN: 'LPAREN',  // (
    RPAREN: 'RPAREN',  // )
    COMMA: 'COMMA',    // ,
    ASSIGN: 'ASSIGN',  // =
}


const BASIC_OPS = new set(['+', '-', '*', '/', '^', '%', '!' ]);

function isDigit(char) {
    return char >= '0' && char <= '9';

}

function is Alpha(char) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');

}


// to convert the raw mathematical input string to structured tokens, tokenizer

function tokenize(input) {
    const tokens = [];
    let i = 0;
    const len = input.length;

    while (i < len) {
        const char = input[i];

        if (char === ' ' || char === '\t' || char === '\n') {
            i++;
            continue;
        }

        if (isDigit(char) || (char === '-' && isDigit(input[i + 1]))) {
            let numStr = '';
            let decimalCount = 0;

            while (i < len && (isDigit(input[i]) || input[i] === '-')) {
                if (input[i] === '-') {
                    decimalCount++;
                    if (decimalCount > 1) {
                        throw new Error(`Malformed number syntax near '${numStr}.'`);
                    }
                }
                numStr += input[i];
                i++;
            }


            tokens.push({
                type: TOKEN_TYPES.NUMBER,
                value: parseFloat(numStr),
                raw: numStr
            });
            continue;
        }


        if (isAlpha(char)) {
            let idenStr = '';
            while (i < len && (isAlpha(input[i]) || isDigit(input[i]))) {
                idenStr += input[i];
                i++;
            }

            tokens.push({
                type: TOKEN_TYPES.IDENT,
                value: idenStr
            });
            continue;
        }


          // basic operators
        if (BASIC_OPS.has(char)) {
            tokens.push({
                type: TOKEN_TYPES.OP,
                value: char
            });
            i++;
            continue;
        }


        //parenthesis

        if(char === '(') {
            tokens.push({ type: TOKEN_TYPES.LPAREN, value: '('});
            i++;
            continue;
        }

         if(char === ')') {
            tokens.push({ type: TOKEN_TYPES.RPAREN, value: ')'});
            i++;
            continue;
        }

         if(char === ',') {
            tokens.push({ type: TOKEN_TYPES.COMMA, value: ','});
            i++;
            continue;
        }

         if(char === '=') {
            tokens.push({ type: TOKEN_TYPES.ASSIGN, value: '='});
            i++;
            continue;
        }

        throw new Error(`Invalid character encountered: '${char}'`);
    }

    return tokens;
}

function formatTokenStream(tokens) {
    return tokens.map(t => `[${t.type}: ${t.value}]`).join(' ');
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
       try {
        if (!exprInput.value.trim()) {
          resultDisplay.textContent = '0';
          return;
        }
        const tokens = tokenize(exprInput.value);
        console.log('Parsed Tokens:', tokens);
        resultDisplay.textContent = formatTokenStream(tokens);
      } catch (err) {
        console.error(err);
        resultDisplay.textContent = `Error: ${err.message}`;
      }
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
