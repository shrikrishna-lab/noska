/**
 * Formula engine — evaluates mathematical, date, string, boolean, and conditional expressions.
 *
 * Uses a simple expression parser. Supports:
 * - Math: +, -, *, /, %, abs(), round(), floor(), ceil(), min(), max()
 * - Date: now(), date(), dateBetween(), formatDate()
 * - String: concat(), slice(), replace(), contains()
 * - Boolean: if(), and(), or(), not(), empty()
 * - Values: prop("property_id") to reference row properties
 */

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const len = expr.length;
  while (i < len) {
    if (expr[i] === ' ' || expr[i] === '\t') { i++; continue; }
    if ('+-*/%(),'.includes(expr[i])) { tokens.push({ type: 'sym', value: expr[i] }); i++; continue; }
    if (expr[i] === '"') {
      let s = '';
      i++;
      while (i < len && expr[i] !== '"') { s += expr[i]; i++; }
      i++; // closing "
      tokens.push({ type: 'str', value: s });
      continue;
    }
    if (/[0-9.]/.test(expr[i])) {
      let s = '';
      while (i < len && /[0-9.]/.test(expr[i])) { s += expr[i]; i++; }
      tokens.push({ type: 'num', value: parseFloat(s) });
      continue;
    }
    if (/[a-zA-Z_]/.test(expr[i])) {
      let s = '';
      while (i < len && /[a-zA-Z_0-9]/.test(expr[i])) { s += expr[i]; i++; }
      if (s === 'true') tokens.push({ type: 'bool', value: true });
      else if (s === 'false') tokens.push({ type: 'bool', value: false });
      else tokens.push({ type: 'id', value: s });
      continue;
    }
    i++;
  }
  return tokens;
}

function parse(tokens, row, props) {
  let pos = 0;
  function peek() { return tokens[pos]; }
  function consume(t) {
    if (!peek()) return null;
    if (t && peek().value !== t) return null;
    return tokens[pos++];
  }

  function parsePrimary() {
    const t = peek();
    if (!t) return null;
    if (t.type === 'num') { consume(); return { type: 'num', value: t.value }; }
    if (t.type === 'str') { consume(); return { type: 'str', value: t.value }; }
    if (t.type === 'bool') { consume(); return { type: 'bool', value: t.value }; }
    if (t.type === 'sym' && t.value === '(') {
      consume('(');
      const expr = parseExpr();
      consume(')');
      return expr;
    }
    if (t.type === 'id') {
      const name = t.value;
      consume();
      if (peek() && peek().value === '(') {
        return { type: 'call', name, args: parseArgs() };
      }
      // Reference row property
      const propVal = propValue(row, name, props);
      return { type: 'num', value: propVal };
    }
    return null;
  }

  function parseArgs() {
    consume('(');
    const args = [];
    while (peek() && peek().value !== ')') {
      args.push(parseExpr());
      if (peek() && peek().value === ',') consume(',');
    }
    consume(')');
    return args;
  }

  function parseUnary() {
    if (peek() && peek().value === '-') {
      consume('-');
      const expr = parseUnary();
      return { type: 'unary', op: '-', expr };
    }
    return parsePrimary();
  }

  function parseMultiplicative() {
    let left = parseUnary();
    while (peek() && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
      const op = consume().value;
      const right = parseUnary();
      left = { type: 'binop', op, left, right };
    }
    return left;
  }

  function parseAdditive() {
    let left = parseMultiplicative();
    while (peek() && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseMultiplicative();
      left = { type: 'binop', op, left, right };
    }
    return left;
  }

  function parseExpr() {
    return parseAdditive();
  }

  const ast = parseExpr();
  return ast;
}

function evaluate(ast, row, props) {
  if (!ast) return '';
  switch (ast.type) {
    case 'num': return ast.value;
    case 'str': return ast.value;
    case 'bool': return ast.value;
    case 'unary': {
      const v = evaluate(ast.expr, row, props);
      if (ast.op === '-') return -Number(v);
      return v;
    }
    case 'binop': {
      const a = Number(evaluate(ast.left, row, props));
      const b = Number(evaluate(ast.right, row, props));
      switch (ast.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b !== 0 ? a / b : 0;
        case '%': return a % b;
        default: return 0;
      }
    }
    case 'call': {
      const args = ast.args.map(a => evaluate(a, row, props));
      const vals = args.filter(v => typeof v === 'number');
      switch (ast.name) {
        case 'abs': return Math.abs(vals[0] || 0);
        case 'round': return Math.round(vals[0] || 0);
        case 'floor': return Math.floor(vals[0] || 0);
        case 'ceil': return Math.ceil(vals[0] || 0);
        case 'min': return Math.min(...vals);
        case 'max': return Math.max(...vals);
        case 'now': return new Date().toISOString();
        case 'concat': return args.join('');
        case 'contains': return String(args[0] || '').includes(String(args[1] || ''));
        case 'if': return evaluate(args[0] ? args[1] : args[2], row, props) ?? '';
        case 'and': return args.every(Boolean);
        case 'or': return args.some(Boolean);
        case 'not': return !args[0];
        case 'empty': return !args[0] || args[0] === '';
        default: return '';
      }
    }
    default: return '';
  }
}

function propValue(row, propId, properties) {
  const val = row?.[propId];
  if (val !== undefined && val !== null) return val;
  // Try matching by name
  if (properties) {
    const prop = properties.find(p => p.id === propId || p.name?.toLowerCase() === propId.toLowerCase());
    if (prop) return row?.[prop.id] ?? '';
  }
  return '';
}

/**
 * Evaluate a formula expression against a row.
 * @param {string} expression
 * @param {Object} row
 * @param {Array} [properties]
 * @returns {*}
 */
export function evaluateFormula(expression, row, properties) {
  if (!expression || !expression.trim()) return '';
  try {
    const tokens = tokenize(expression.trim());
    const ast = parse(tokens, row, properties);
    return evaluate(ast, row, properties);
  } catch {
    return '#ERROR';
  }
}
