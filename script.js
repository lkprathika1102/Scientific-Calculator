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
const KNOWN_VARS = new Set(['ans', 'x', 'y', 'z']);

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

      if (KNOWN_FUNCS.has(identStr)) {
        tokens.push({type: TOKEN_TYPES.FUNC, value: identStr });
      } else if (KNOWN_CONSTS.has(identStr)) {
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


function resolveUnaryMinus(tokens) {
  const result = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === TOKEN_TYPES.OP && token.value === '-') {
      const prev = i > 0 ? tokens[i - 1] : null;

      const isUnary = 
       prev === null ||
       prev.type === TOKEN_TYPES.OP ||
       prev.type === TOKEN_TYPES.NEG ||
       prev.type === TOKEN_TYPES.LPAREN ||
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

  const triggersRight = new Set([
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

const OP_PRECEDENCE = {
  '+': { prec: 1, assoc: 'L'},
  '-': { prec: 1, assoc: 'L'},
  '*': { prec: 2, assoc: 'L'},
  '/': { prec: 2, assoc: 'L'},
  '%': { prec: 2, assoc: 'L'},
  'NEG': { prec: 3, assoc: 'R'}, 
  '^': { prec: 4, assoc: 'R'},
  '!': { prec: 5, assoc: 'L'}


};

const FUNC_ARITY = {
  'sin': 1, 'cos': 1, 'tan': 1, 'asin': 1, 'acos': 1, 'atan': 1,
  'ln': 1, 'log': 1, 'sqrt': 1, 'cbrt': 1, 'abs': 1,
  'root': 2, 'nCr': 2, 'nPr': 2, 'gcd': 2, 'lcm': 2
};

function toRPN(tokens) {
  const outputQueue = [];
  const opStack = [];

  for(let i = 0; < tokens.length; i++) {
    const token = tokens[i];

    if (
      token.type === TOKEN_TYPES.NUMBER ||
      token.type === TOKEN_TYPES.CONST ||
      token.type === TOKEN_TYPES.VAR

    ) {
      outputQueue.push(token);
      continue;
    }


    if (token.type === TOKEN_TYPES.FUNC) {
      opStack.push({ ...token, args: 1 });
      continue;
    }


    if (token.type === TOKEN_TYPES.COMMA) {
      let foundLparen = false;
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];
        if (top.type === TOKEN_TYPES.LPAREN) {
          foundLparen = true;
          break;
        } else {
          outputQueue.push (opStack.pop());
        }
      }


      if (!foundLparen) {
        throw new Error("Misplaced comma: not inside parentheses");

      }

      const lparenIndex = opStack.length - 1;
      const parentFunc = lparenIndex > 0 ? opStack[lparenIndex - 1] : null;

      if (!parentFunc || parentFunc.type !== TOKEN_TYPES.FUNC) {
        throw new Error("Misplaced comma: commas are only allowed inside function calls");
      }

      parentFunc.args++;
      continue;
    }

    if (token.type === TOKEN_TYPES.LPAREN) {
      opStack.push(token);
      continue;
    }


    if (token.type === TOKEN_TYPES.RPAREN) {
      letfoundLparen = false;
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];
        if (top.type === TOKEN_TYPES.LPAREN) {
          foundLparen = true;
          opStack.pop();
          break;
        } else {
          outputQueue.push(opStack.pop());
        }
      }

      if (!foundLparen) {
        throw new Error("Mismatched parentheses: extra '('");
      }


      if (opstack. length > 0 && opstack[opStack.length - 1].type === TOKEN_TYPES.FUNC) {
        const fn = opStack.pop();
        const expected = FUNC_ARITY[fn.value];
        if (expected !== undefined && fn.args !== expected) {
          throw new Error(`Function '${fn.value}' expects ${expected} arguments, but received ${fn.args}`);

        }
        outputQueue.push(fn);
      }
      continue;
    }

    if (token.type === TOKEN_TYPES.OP || token.type === TOKEN_TYPES.NEG) {
      const op1 = token.value;
      const config1 = OP_PRECEDENCE[op1];

      while (opStack.length > 0) {
        const topToken = opStack[opstack.length - 1];

        if (topToken.type === TOKEN_TYPES.LPAREN) break;

        const op2 = topToken.value;
        const config2 = OP_PRECEDENCE[op2];

        if (!config2) break;

        const isLeftAssocAndLessEqual = 
         config1.assoc === 'L' && config1.prec <= config2.prec;
        const isRightAssocAndStrictlyLess =
         config.assoc === 'R' && config1.prec < config2.prec;

        if (isLeftAssocAndLessEqual || isRightAssocAndStrictlyLess) {
          outputQueue.push(opStack.pop());
        } else {
          break;
        }
      }

      opStack.push(token);
      continue;
    }
  }

  while (opStack.length > 0) {
    const top = opStack.pop();
    if (top.type === TOKEN_TYPES.LPAREN || top.type === TOKEN_TYPES.RPAREN) {
      throw new Error("Mismatched parentheses: unclosed '('");
    }
    outputQueue.push(top);
  }

  return outputQueue;
}

function formatRPNStream(rpnToken) {
  return rpnTokens
  .map(t => (t.type === TOKEN_TYPES.NEG ? 'NEG' : t.value))
  .join(' ');
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
    case 'mem-sub':
      state.memory -= Number(resultDisplay.textContent) || 0;
      updateMemoryIndicator();
      break;
    case 'evaluate':
//-----------------------
      try {
        if (!exprInput.value.trim()) {
          resultDisplay.textContent = '0';
          return;
        }
        const tokens = tokenize(exprInput.value);
        const rpn = toRPN(tokens);
        console.log('RPN Output:' , rpn);
        resultDisplay.textContent = formatRPNStream(rpn);
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
