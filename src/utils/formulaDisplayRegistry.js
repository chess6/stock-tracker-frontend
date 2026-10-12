/**
 * Structured formula display specs for column-header tooltips.
 * Symbolic labels only — cell tooltips resolve numeric operands separately.
 */

/** @typedef {{ type: 'label', text: string, sign?: '+'|'-' }} LabelNode */
/** @typedef {{ type: 'group', inner: FormulaNode }} GroupNode */
/** @typedef {{ type: 'ratio', num: FormulaNode, den: FormulaNode }} RatioNode */
/** @typedef {{ type: 'difference', left: FormulaNode, right: FormulaNode, note?: string }} DifferenceNode */
/** @typedef {{ type: 'sum', terms: FormulaNode[] }} SumNode */
/** @typedef {{ type: 'product', factors: FormulaNode[] }} ProductNode */
/** @typedef {{ type: 'weighted_sum', terms: { coef: string, num: FormulaNode, den: FormulaNode }[] }} WeightedSumNode */
/** @typedef {{ type: 'alternatives', options: FormulaNode[], separator?: string }} AlternativesNode */
/** @typedef {{ type: 'text', text: string }} TextNode */
/** @typedef {LabelNode|GroupNode|RatioNode|DifferenceNode|SumNode|ProductNode|WeightedSumNode|AlternativesNode|TextNode} FormulaNode */

/** @param {string} text @returns {LabelNode} */
export function L(text) {
  return { type: 'label', text };
}

/** @param {FormulaNode} inner @returns {GroupNode} */
export function G(inner) {
  return { type: 'group', inner };
}

const MARKET_CAP_PLUS_DEBT_MINUS_CASH = {
  type: 'sum',
  terms: [
    L('Market cap'),
    L('Debt'),
    { type: 'label', text: 'Cash', sign: '-' },
  ],
};

const INVESTED_CAPITAL = {
  type: 'sum',
  terms: [
    L('Debt'),
    L('Equity'),
    { type: 'label', text: 'Cash', sign: '-' },
  ],
};

const TANGIBLE_EQUITY = {
  type: 'sum',
  terms: [
    L('Equity'),
    { type: 'label', text: 'Goodwill', sign: '-' },
    { type: 'label', text: 'Intangibles', sign: '-' },
  ],
};

const QUICK_ASSETS = {
  type: 'sum',
  terms: [
    L('Current assets'),
    { type: 'label', text: 'Inventory', sign: '-' },
  ],
};

/** @type {Record<string, FormulaNode>} */
export const FORMULA_DISPLAY_SPECS = {
  cor: {
    type: 'difference',
    left: L('Revenue'),
    right: L('Gross profit'),
    note: 'or reported directly',
  },
  gp: { type: 'difference', left: L('Revenue'), right: L('Cost of revenue') },
  opinc: { type: 'difference', left: L('Gross profit'), right: L('Operating expenses') },
  ebitda: {
    type: 'sum',
    terms: [L('EBIT'), L('Depreciation'), L('Amortization')],
  },
  eps: { type: 'ratio', num: L('Net income'), den: L('Diluted shares outstanding') },
  equity: { type: 'difference', left: L('Total assets'), right: L('Total liabilities') },
  workingcapital: { type: 'difference', left: L('Current assets'), right: L('Current liabilities') },
  fcf: { type: 'difference', left: L('Operating cash flow'), right: L('Capital expenditures') },
  ncf: {
    type: 'sum',
    terms: [L('Operating CF'), L('Investing CF'), L('Financing CF')],
  },
  piotroskiF: {
    type: 'text',
    text: '9 binary signals across profitability, leverage, liquidity, and efficiency',
  },
  altmanZ: {
    type: 'weighted_sum',
    terms: [
      { coef: '1.2', num: L('WC'), den: L('TA') },
      { coef: '1.4', num: L('RE'), den: L('TA') },
      { coef: '3.3', num: L('EBIT'), den: L('TA') },
      { coef: '0.6', num: L('MVE'), den: L('TL') },
      { coef: '1.0', num: L('Sales'), den: L('TA') },
    ],
  },
  grossMargin: { type: 'ratio', num: L('Gross profit'), den: L('Revenue') },
  operatingMargin: { type: 'ratio', num: L('Operating income'), den: L('Revenue') },
  ebitdaMargin: { type: 'ratio', num: L('EBITDA'), den: L('Revenue') },
  netMargin: { type: 'ratio', num: L('Net income'), den: L('Revenue') },
  fcfMargin: { type: 'ratio', num: L('Free cash flow'), den: L('Revenue') },
  cfoMargin: { type: 'ratio', num: L('Operating cash flow'), den: L('Revenue') },
  roe: { type: 'ratio', num: L('Net income'), den: L('Equity') },
  roa: { type: 'ratio', num: L('Net income'), den: L('Total assets') },
  roic: { type: 'ratio', num: L('NOPAT'), den: G(INVESTED_CAPITAL) },
  pe: { type: 'ratio', num: L('Price'), den: L('Diluted EPS') },
  pb: { type: 'ratio', num: L('Price'), den: L('Book value per share') },
  ebitdaEv: { type: 'ratio', num: L('EBITDA'), den: G(MARKET_CAP_PLUS_DEBT_MINUS_CASH) },
  evEbitda: { type: 'ratio', num: G(MARKET_CAP_PLUS_DEBT_MINUS_CASH), den: L('EBITDA') },
  evSales: { type: 'ratio', num: G(MARKET_CAP_PLUS_DEBT_MINUS_CASH), den: L('Revenue') },
  fcfYield: { type: 'ratio', num: L('Free cash flow'), den: L('Enterprise value') },
  earningsYield: {
    type: 'alternatives',
    options: [
      { type: 'ratio', num: L('EPS'), den: L('Price') },
      { type: 'ratio', num: L('Net income'), den: L('Market cap') },
    ],
  },
  netDebt: { type: 'difference', left: L('Total debt'), right: L('Cash & equivalents') },
  payoutRatio: { type: 'ratio', num: L('|Dividends paid|'), den: L('Net income') },
  inventoryTurnover: { type: 'ratio', num: L('Cost of revenue'), den: L('Inventory') },
  receivablesDays: {
    type: 'product',
    factors: [
      { type: 'ratio', num: L('Receivables'), den: L('Revenue') },
      L('365'),
    ],
  },
  payablesDays: {
    type: 'product',
    factors: [
      { type: 'ratio', num: L('Payables'), den: L('Cost of revenue') },
      L('365'),
    ],
  },
  tangibleBookPerShare: {
    type: 'ratio',
    num: G(TANGIBLE_EQUITY),
    den: L('Shares outstanding'),
  },
  quickRatio: { type: 'ratio', num: G(QUICK_ASSETS), den: L('Current liabilities') },
  assetTurnover: { type: 'ratio', num: L('Revenue'), den: L('Total assets') },
  debtAssets: { type: 'ratio', num: L('Total debt'), den: L('Total assets') },
  de: { type: 'ratio', num: L('Total debt'), den: L('Shareholders\' equity') },
  currentRatio: { type: 'ratio', num: L('Current assets'), den: L('Current liabilities') },
  interestCoverage: { type: 'ratio', num: L('EBIT'), den: L('Interest expense') },
  cashToDebt: { type: 'ratio', num: L('Cash & equivalents'), den: L('Total debt') },
  divYield: { type: 'ratio', num: L('Dividends per share'), den: L('Price') },
  intensityScore90d: {
    type: 'ratio',
    num: G({
      type: 'product',
      factors: [L('Buy count'), L('ln(buy value)')],
    }),
    den: L('Days active'),
  },
};

const TOOLTIP_ALIASES = {
  intensityScore: 'intensityScore90d',
  revenueYoY: 'yoy',
};

function titleCaseLabel(raw) {
  const text = String(raw || '').trim();
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function splitTopLevel(text, delimiter) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (depth === 0 && text.slice(i, i + delimiter.length) === delimiter) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      i += delimiter.length - 1;
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function stripOuterParens(text) {
  let value = text.trim();
  while (value.startsWith('(') && value.endsWith(')')) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

/**
 * Best-effort parse of registry formula strings when no explicit spec exists.
 * @param {string|undefined|null} formula
 * @returns {FormulaNode|null}
 */
export function parseFormulaString(formula) {
  if (!formula || typeof formula !== 'string') return null;
  const raw = formula.trim();
  if (!raw) return null;

  const noteMatch = raw.match(/^(.+?)\s+\((.+)\)$/);
  const main = noteMatch ? noteMatch[1].trim() : raw;
  const note = noteMatch ? noteMatch[2].trim() : undefined;

  const altParts = splitTopLevel(main, ' (or ');
  if (altParts.length > 1) {
    return {
      type: 'alternatives',
      options: altParts.map((part) => parseFormulaString(part)).filter(Boolean),
    };
  }

  if (main.includes('×') && !main.includes('/')) {
    const factors = main.split(/\s*\+\s*/).flatMap((chunk) => chunk.split(/\s*×\s*/))
      .map((part) => L(titleCaseLabel(part.trim())))
      .filter((node) => node.text);
    if (factors.length >= 2) {
      return { type: 'product', factors };
    }
  }

  if (main.includes('×') && main.includes('/')) {
    const productParts = main.split(/\s*×\s*/);
    if (productParts.length === 2) {
      const ratioPart = parseFormulaString(productParts[0]);
      const scalar = L(productParts[1].trim());
      if (ratioPart) return { type: 'product', factors: [ratioPart, scalar] };
    }
  }

  if (main.includes('/')) {
    const slashParts = splitTopLevel(main, ' / ');
    if (slashParts.length === 2) {
      const left = stripOuterParens(slashParts[0]);
      const right = stripOuterParens(slashParts[1]);
      const num = left.includes('−') || left.includes('-')
        ? parseFormulaString(left)
        : L(titleCaseLabel(left));
      const den = right.includes('−') || right.includes('-')
        ? parseFormulaString(right)
        : L(titleCaseLabel(right));
      if (num && den) {
        const node = { type: 'ratio', num, den };
        return note ? { ...node, note } : node;
      }
    }
  }

  const minusParts = splitTopLevel(main.replace(/-/g, '−'), ' − ');
  if (minusParts.length === 2) {
    return {
      type: 'difference',
      left: L(titleCaseLabel(stripOuterParens(minusParts[0]))),
      right: L(titleCaseLabel(stripOuterParens(minusParts[1]))),
      note,
    };
  }

  const plusParts = main.split(/\s*\+\s*/);
  if (plusParts.length >= 2 && !main.includes('/')) {
    return {
      type: 'sum',
      terms: plusParts.map((part) => L(titleCaseLabel(stripOuterParens(part)))),
      note,
    };
  }

  if (/^\d+\s+binary/i.test(main) || main.length > 48) {
    return { type: 'text', text: raw };
  }

  return { type: 'text', text: raw };
}

/**
 * @param {string|undefined|null} metricKey
 * @param {string|undefined|null} formula
 * @returns {FormulaNode|null}
 */
export function getFormulaDisplaySpec(metricKey, formula) {
  if (!metricKey && !formula) return null;
  const resolved = metricKey ? (TOOLTIP_ALIASES[metricKey] || metricKey) : null;
  if (resolved && FORMULA_DISPLAY_SPECS[resolved]) {
    return FORMULA_DISPLAY_SPECS[resolved];
  }
  return parseFormulaString(formula);
}

/** Plain-text formula for aria-labels and screen readers. */
export function formatFormulaPlainText(spec) {
  if (!spec) return '';
  switch (spec.type) {
    case 'label':
      return spec.text;
    case 'group':
      return `(${formatFormulaPlainText(spec.inner)})`;
    case 'ratio':
      return `${formatFormulaPlainText(spec.num)} / ${formatFormulaPlainText(spec.den)}`;
    case 'difference':
      return `${formatFormulaPlainText(spec.left)} − ${formatFormulaPlainText(spec.right)}`;
    case 'sum':
      return spec.terms.map((term, idx) => {
        const sign = term.sign === '-' ? ' − ' : idx ? ' + ' : '';
        return `${sign}${formatFormulaPlainText(term)}`;
      }).join('');
    case 'product':
      return spec.factors.map(formatFormulaPlainText).join(' × ');
    case 'weighted_sum':
      return spec.terms.map(({ coef, num, den }) => (
        `${coef}×(${formatFormulaPlainText(num)}/${formatFormulaPlainText(den)})`
      )).join(' + ');
    case 'alternatives':
      return spec.options.map(formatFormulaPlainText).join(' or ');
    case 'text':
    default:
      return spec.text || '';
  }
}
