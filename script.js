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

  for(let i = 0; i < tokens.length; i++) {
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
      let foundLparen = false;
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
        throw new Error("Mismatched parentheses: extra ')'");
      }


      if (opStack.length > 0 && opStack[opStack.length - 1].type === TOKEN_TYPES.FUNC) {
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
        const topToken = opStack[opStack.length - 1];

        if (topToken.type === TOKEN_TYPES.LPAREN) break;

        const op2 = topToken.value;
        const config2 = OP_PRECEDENCE[op2];

        if (!config2) break;

        const isLeftAssocAndLessEqual = 
         config1.assoc === 'L' && config1.prec <= config2.prec;
        const isRightAssocAndStrictlyLess = 
         config1.assoc === 'R' && config1.prec < config2.prec;

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

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error("Invalid factorial: must be non-negative integer");
  }
  if (n === 0 || n === 1) return 1;
  if (n > 170) throw new Error("Overflow: factorial exceeds numeric limits");
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}
//-----------------------------
function toRadians(angle) {
  return state.angleMode === 'DEG' ? (angle * Math.PI) / 180 : angle;

}

function fromRadians(angle) {
  return state.angleMode === 'DEG' ? (angle * 180) / Math.PI : angle;
}

function sanitizeFloat(val) {
  if (typeof val !== 'number' || !isFinite(val)) return val;
  if (Math.abs(val) < 1e-12) return 0;
  return parseFloat(val.toPrecision(12));
}

function calcNPr(n,r) {
  if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r) || r > n) {
    throw new Error("Invalid parameters for nPr");
  }
  let res = 1;
  for (let i = 0; i < r; i++) {
    res *= (n - i);
  }
  return res;
}

function calcNCr(n,r) {
  if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r) || r > n) {
    throw new Error("Invalid parameters for nCr");
  }
  if (r === 0 || r === n) return 1;
  if (r > n / 2) r = n - r;
  let res = 1;
  for (let i = 1; i <= r; i++) {
    res = (res * (n - i + 1)) /i;
  }
  return Math.round(res);
}

//. gcd
function calcGcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error("gcd requires integers");
  }
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

function calcLcm(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error("lcm requires integers");
  }
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / calcGcd(a, b);
}

function calcRoot(val,base) {
  if (base === 0) throw new Error("Zero degree root is undefined");
  if (val < 0 && base % 2 === 0) throw new Error("Invalid domain: even root of negative number");
  if (val < 0) return -Math.pow(-val, 1 / base);
  return Math.pow(val, 1 / base);

}

// rpn stack evaluor
function evaluateRPN(rpnQueue) {
  const stack = [];

  for (let i = 0; i < rpnQueue.length; i++) {
    const token = rpnQueue[i];

    if (token.type === TOKEN_TYPES.NUMBER) {
      stack.push(token.value);
      continue;
    }


    if (token.type === TOKEN_TYPES.CONST || token.type === TOKEN_TYPES.VAR) {
      const val = state.vars[token.value];
      if (val === undefined) {
        throw new Error(`Undefined variable: '${token.value}'`);
      }
      stack.push(val);
      continue;
    }

    if (token.type === TOKEN_TYPES.NEG) {
      if (stack.length < 1) throw new Error("Malformed Expression");
      stack.push(-stack.pop());
      continue;
    }


    if (token.type === TOKEN_TYPES.OP && token.value === '!') {
      if (stack.length < 1) throw new Error("Malformed expression");
      stack.push(factorial(stack.pop()));
      continue;
    }

    if (token.type === TOKEN_TYPES.OP) {
      if (stack.length < 2) throw new Error("Malformed Expression");
      const b = stack.pop();
      const a = stack.pop();

      switch (token.value) {
        case '+':
          stack.push(sanitizeFloat(a + b));
          break;
        case '-':
          stack.push(sanitizeFloat(a - b));
          break;
        case '*':
          stack.push(sanitizeFloat(a * b));
          break;
        case '/':
          if (b === 0) throw new Error("Division by Zero");
          stack.push(sanitizeFloat(a / b));
          break;
        case '%':
          if (b === 0) throw new Error("Division by Zero");
          stack.push(a % b);
          break;
        case '^':
          stack.push(sanitizeFloat(Math.pow(a, b)));
          break;
        default:
          throw new Error(`Unknown Operator: '${token.value}'`);
      }

      continue;
    }

    if (token.type === TOKEN_TYPES.FUNC) {

      if (FUNC_ARITY[token.value] === 2) {
        if (stack.length < 2) throw new Error("Malformed function call");
        const b = stack.pop();
        const a = stack.pop();

        switch (token.value) {
          case 'root':
            stack.push(sanitizeFloat(calcRoot(a, b)));
            break;
          case 'nCr':
            stack.push(calcNCr(a, b));
            break;
          case 'nPr':
            stack.push(calcNPr(a, b));
            break;
          case 'gcd':
            stack.push(calcGcd(a, b));
            break;
          case 'lcm':
            stack.push(calcLcm(a, b));
            break;
        }
        continue;
      }


      if (stack.length < 1) throw new Error("Malformed function call");
      const val = stack.pop();

      switch (token.value) {
        case 'sin':
          stack.push(sanitizeFloat(Math.sin(toRadians(val))));
          break;
        case 'cos':
          stack.push(sanitizeFloat(Math.cos(toRadians(val))));
          break;
        case 'tan': {
          if (state.angleMode === 'DEG' && Math.abs((val - 90) % 180) < 1e-9) {
            throw new Error("Undefined: tan(90)");
          }
          stack.push(sanitizeFloat(Math.tan(toRadians(val))));
          break;
        }

        case 'asin':
          if (val < -1 || val > 1 ) throw new Error("Invalid domain for asin [-1, 1]");
          stack.push(sanitizeFloat(fromRadians(Math.asin(val))));
          break;
        case 'acos':
          if (val < -1 || val > 1) throw new Error("Invalid domain for acos [-1, 1]");
          stack.push(sanitizeFloat(fromRadians(Math.acos(val))));
          break;
        case 'atan':
          stack.push(sanitizeFloat(fromRadians(Math.atan(val))));
          break;
        case 'sqrt':
          if (val < 0) throw new Error("Invalid domain: sqrt of negative");
          stack.push(sanitizeFloat(Math.sqrt(val)));
          break;
        case 'cbrt':
          stack.push(sanitizeFloat(Math.cbrt(val)));
          break;
        case 'abs':
          stack.push(Math.abs(val));
          break;
        case 'ln':
          if (val <= 0) throw new Error("Invalid domain: ln of non-positive");
          stack.push(sanitizeFloat(Math.log(val)));
          break;
        case 'log':
          if (val <= 0) throw new Error("Invalid Domain: log of non-positive");
          stack.push(sanitizeFloat(Math.log10(val)));
          break;
        default:
          throw new Error(`Unknown function: '${token.value}'`);

          
      }
      continue;
    }
  }

  if (stack.length !== 1) {
    throw new Error("Malformed expression");
  }

  return sanitizeFloat(stack[0]);
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
        const answer = evaluateRPN(rpn);

        state.lastResult = answer;
        state.vars.ans = answer;

        resultDisplay.textContent = answer;
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
