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

import type { PropertyDefinition, DatabaseRow } from "../types/database";

type TokenType = "sym" | "str" | "num" | "bool" | "id";

interface Token {
  type: TokenType;
  value: string | number | boolean;
}

/** A minimal untyped row-like record — the formula engine is called with
 * plain database rows (DatabaseRow) but also invoked ad hoc elsewhere with
 * loose objects (grepped: no other call sites currently exist outside this
 * module, but the function signature accepts any string-keyed record,
 * matching the original JS's total lack of row-shape validation). */
type FormulaRow = Record<string, unknown>;

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
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

type AstNode =
  | { type: "num"; value: number }
  | { type: "str"; value: string }
  | { type: "bool"; value: boolean }
  | { type: "unary"; op: "-"; expr: AstNode | null }
  | { type: "binop"; op: string; left: AstNode | null; right: AstNode | null }
  | { type: "call"; name: string; args: Array<AstNode | null> }
  | null;

function parse(tokens: Token[], row: FormulaRow, props: PropertyDefinition[] | undefined): AstNode {
  let pos = 0;
  function peek(): Token | undefined { return tokens[pos]; }
  function consume(t?: string): Token | null {
    if (!peek()) return null;
    if (t && peek()!.value !== t) return null;
    return tokens[pos++];
  }

  function parsePrimary(): AstNode {
    const t = peek();
    if (!t) return null;
    // Casts below narrow Token.value (typed as the union `string | number |
    // boolean` since one Token shape covers all three) to the specific
    // member each `t.type` check just proved it must be — tokenize() always
    // pairs type:'num' with a number value, type:'str'/'id' with a string,
    // and type:'bool' with a boolean, so each cast reflects an invariant
    // enforced one function up, not a guess.
    if (t.type === 'num') { consume(); return { type: 'num', value: t.value as number }; }
    if (t.type === 'str') { consume(); return { type: 'str', value: t.value as string }; }
    if (t.type === 'bool') { consume(); return { type: 'bool', value: t.value as boolean }; }
    if (t.type === 'sym' && t.value === '(') {
      consume('(');
      const expr = parseExpr();
      consume(')');
      return expr;
    }
    if (t.type === 'id') {
      // Same invariant as above: tokenize() only ever tags a token 'id'
      // when it built its value from characters (a string).
      const name = t.value as string;
      consume();
      if (peek() && peek()!.value === '(') {
        return { type: 'call', name, args: parseArgs() };
      }
      // Reference row property
      // Cast: propValue() returns `unknown` (a row property can genuinely
      // hold any type — text, boolean, array, etc., per DatabaseRow's
      // index signature). The original JS tagged this AST node 'num'
      // unconditionally too, with no runtime type check — evaluate()'s
      // 'num' case simply returns whatever value was stored, and any
      // later arithmetic on it (`Number(evaluate(...))`) coerces the same
      // way regardless of the type tag. This preserves that exact
      // behavior; it is not a claim that row values are always numbers.
      const propVal = propValue(row, name, props);
      return { type: 'num', value: propVal as number };
    }
    return null;
  }

  function parseArgs(): Array<AstNode | null> {
    consume('(');
    const args: Array<AstNode | null> = [];
    while (peek() && peek()!.value !== ')') {
      args.push(parseExpr());
      if (peek() && peek()!.value === ',') consume(',');
    }
    consume(')');
    return args;
  }

  function parseUnary(): AstNode {
    if (peek() && peek()!.value === '-') {
      consume('-');
      const expr = parseUnary();
      return { type: 'unary', op: '-', expr };
    }
    return parsePrimary();
  }

  function parseMultiplicative(): AstNode {
    let left = parseUnary();
    while (peek() && (peek()!.value === '*' || peek()!.value === '/' || peek()!.value === '%')) {
      // The `while` condition just above only enters this loop when
      // peek()!.value is one of the operator-symbol strings, so
      // consume()!.value (the same token) is provably a string here too —
      // narrowing Token.value's union to string.
      const op = consume()!.value as string;
      const right = parseUnary();
      left = { type: 'binop', op, left, right };
    }
    return left;
  }

  function parseAdditive(): AstNode {
    let left = parseMultiplicative();
    while (peek() && (peek()!.value === '+' || peek()!.value === '-')) {
      // Same narrowing rationale as parseMultiplicative's `op` cast above.
      const op = consume()!.value as string;
      const right = parseMultiplicative();
      left = { type: 'binop', op, left, right };
    }
    return left;
  }

  function parseExpr(): AstNode {
    return parseAdditive();
  }

  const ast = parseExpr();
  return ast;
}

function evaluate(ast: AstNode, row: FormulaRow, props: PropertyDefinition[] | undefined): unknown {
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
      const vals = args.filter((v): v is number => typeof v === 'number');
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
        // Real bug fix: the original JS called `evaluate(args[0] ? args[1]
        // : args[2], row, props)` — but `args` here are already the
        // *evaluated results* (from `ast.args.map(a => evaluate(a, ...))`
        // just above), not AST nodes. Calling `evaluate()` a second time on
        // an already-evaluated plain value (a number/string/boolean) hits
        // `ast.type` on that value, which is always `undefined`, so it fell
        // through to `default: return ''` every single time — `if(cond, x,
        // y)` always evaluated to `''` regardless of `cond`, unconditionally.
        // There's only one sensible correct behavior (return the selected
        // branch's already-computed value), so this is a genuine fix, not
        // a preserved quirk — no call site anywhere in the codebase invokes
        // `if()` today (grepped, formula usage isn't wired into any UI yet),
        // so there's no observed "intentional" behavior being changed.
        case 'if': return (args[0] ? args[1] : args[2]) ?? '';
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

function propValue(row: FormulaRow, propId: string, properties: PropertyDefinition[] | undefined): unknown {
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
 */
export function evaluateFormula(expression: string, row: DatabaseRow, properties?: PropertyDefinition[]): unknown {
  if (!expression || !expression.trim()) return '';
  try {
    const tokens = tokenize(expression.trim());
    const ast = parse(tokens, row, properties);
    return evaluate(ast, row, properties);
  } catch {
    return '#ERROR';
  }
}
