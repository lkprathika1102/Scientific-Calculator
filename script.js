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
    z: 0
  }
};

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
      exprInput.value = val.slice(0, start - 1) + val.slice(end);
      exprInput.setSelectionRange(start - 1, start - 1);
    }
  } else {
    exprInput.value = val.slice(0, start) + val.slice(end);
    exprInput.setSelectionRange(start, start);
  }
  exprInput.focus();
}

function toggleAngleMode() {
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
  FUNC: 'FUNC',  
  CONST: 'CONST',
  VAR: 'VAR',     // x y z
  OP: 'OP',   // + - *
  NEG: 'NEG',           
  LPAREN: 'LPAREN',     // (
  RPAREN: 'RPAREN',     // )
  COMMA: 'COMMA',       // ,
  ASSIGN: 'ASSIGN'      // =
};


const BASIC_OPS = new Set(['+', '-', '*', '/', '^', '%', '!']);


const KNOWN_FUNCS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'ln', 'log', 'sqrt', 'cbrt', 'root', 'abs',
  'nCr', 'nPr', 'gcd', 'lcm'
]);

const KNOWN_CONSTS = new Set(['pi', 'e']);
const KNOWN_VARS = new Se(['ans', 'x', 'y', 'z']);

function isDigit(char) {
  return char >= '0' && char <= '9';
}

function isAlpha(char) {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
}
//------------------------------------------------


function rawScan(input) {
  const tokens = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const char = input[i];

    
    if (char === ' ' || char === '\t' || char === '\n') {
      i++;
      continue;
    }

    if (isDigit(char) || (char === '.' && isDigit(input[i + 1]))) {
      let numStr = '';
      let decimalCount = 0;

      while (i < len && (isDigit(input[i]) || input[i] === '.')) {
        if (input[i] === '.') {
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
      let identStr = '';
      while (i < len && (isAlpha(input[i]) || isDigit(input[i]))) {
        identStr += input[i];
        i++;
      }

      if (KNOWN_FUNCS.has(idenStr)) {
        tokens.push({type: TOKEN_TYPES.FUNC, value: identStr });
      } else if (KNOWN_CONSTS.has(ident.Str)) {
        tokens.push({type: TOKEN_TYPES.CONST, value: identStr });
      } else if (KNOWN_VARS.has(identStr)) {
        tokens.push({type: TOKEN_TYPES.VAR, value: identStr });
      } else {
        throw new Error(`Unknown Identifier: '${identStr}.'`);
      }
      continue;

    }

    //  Basic operators
    if (BASIC_OPS.has(char)) {
      tokens.push({
        type: TOKEN_TYPES.OP,
        value: char
      });
      i++;
      continue;
    }


    if (char === '(') {
      tokens.push({ type: TOKEN_TYPES.LPAREN, value: '(' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: TOKEN_TYPES.RPAREN, value: ')' });
      i++;
      continue;
    }


    if (char === ',') {
      tokens.push({ type: TOKEN_TYPES.COMMA, value: ',' });
      i++;
      continue;
    }


    if (char === '=') {
      tokens.push({ type: TOKEN_TYPES.ASSIGN, value: '=' });
      i++;
      continue;
    }

    throw new Error(`Invalid character: '${char}'`);
  }

  return tokens;
}


function resolveUnaryMinus(token) {
  const token = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === TOKEN_TYPES.OP && token.value === '-') {
      const prev = i > 0 ? tokens[i - 1] : null;

      const isUnary = 
       prev === null ||
       prev.type === TOKEN_TYPES.OP ||
       prev.type === TOKEN_TYPES.NEG ||
       prev.type === TOKEN_TYPES.COMMA;

      if (isUnary) {
        result.push({ type: TOKEN_TYPES.NEG, value: 'NEG'});
        continue;
      }

    }

    result.push(token);
  }

  return result;
}

// for implicit multiplication

function injectImplicitMultiplication(tokens) {
  const result = [];

  const triggersLeft = new Set([
    TOKEN_TYPES.NUMBER,
    TOKEN_TYPES.CONST,
    TOKEN_TYPES.VAR,
    TOKEN_TYPES.RPAREN
  ]);

  const triggersRight = Set([
    TOKEN_TYPES.NUMBER,
    TOKEN_TYPES.CONST,
    TOKEN_TYPES.VAR,
    TOKEN_TYPES.FUNC,
    TOKEN_TYPES.LPAREN
  ]);

  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    result.push(curr);

    if (i < tokens.length - 1 ) {
      const next = tokens[i + 1];


      if (curr.type === TOKEN_TYPES.OP && curr.value === '!') {
        if (triggersRight.has(next.type)) {
          result.push({ type: TOKEN_TYPES.OP, value: '*'});
        }
        continue;
      }
      if (triggersLeft.has(curr.type) && triggersRight.has(next.type)) {
        result.push({ type: TOKEN_TYPES.OP, value: '*'});
      }


    }
  }

  return result;
}


function tokenize(input) {
  const rawTokens = rawScan(input);
  const withUnary = resolveUnaryMinus(rawTokens);
  const fullyProcessed = injectImplicitMultiplication(withUnary);
  return fullyProcessed;
}

function formatTokenStream(tokens) {
  return tokens.map(t => {
    if (t.type === TOKEN_TYPES.NEG) return `[NEG]`;
    return `[${t.type}: ${t.value}]`;
  }).join(' ');
}


//--------------------------------------------
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
    case 'mem-sub':
      state.memory -= Number(resultDisplay.textContent) || 0;
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

keypad.addEventListener('click', (e) => {
  const target = e.target.closest('button');
  if (!target) return;

  const insert = target.getAttribute('data-insert');
  const action = target.getAttribute('data-action');

  if (insert !== null) {
    insertTextAtCursor(insert);
  } else if (action !== null) {
    handleAction(action);
  }
});

window.addEventListener('load', () => {
  exprInput.focus();
});
