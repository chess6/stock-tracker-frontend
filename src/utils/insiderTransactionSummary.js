import { formatCompactUsd, formatShares } from './formatters';

const BUY_CODES = new Set(['P', 'A']);
const SELL_CODES = new Set(['S', 'D', 'F']);

const CODE_META = {
  P: { verb: 'bought', label: 'open-market purchase' },
  S: { verb: 'sold', label: 'open-market sale' },
  A: { verb: 'received', label: 'stock award or grant' },
  D: { verb: 'returned', label: 'disposition to issuer' },
  F: { verb: 'withheld', label: 'shares withheld for taxes or exercise' },
  M: { verb: 'exercised', label: 'option or derivative exercise' },
  C: { verb: 'converted', label: 'derivative conversion' },
  X: { verb: 'exercised', label: 'in-the-money derivative exercise' },
  G: { verb: 'gifted', label: 'gift transfer' },
  J: { verb: 'transferred', label: 'other acquisition or disposition' },
  K: { verb: 'swapped', label: 'equity swap' },
  W: { verb: 'acquired', label: 'inheritance or estate transfer' },
  Z: { verb: 'deposited', label: 'voting trust deposit or withdrawal' },
};

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

export function getInsiderTransactionSide(row) {
  const code = normalizeCode(row?.transactioncode ?? row?.transactionCode);
  if (BUY_CODES.has(code)) return 'buy';
  if (SELL_CODES.has(code)) return 'sell';
  return 'neutral';
}

function formatSecurityTitle(title) {
  if (!title) return '';
  const clean = String(title).trim();
  if (!clean) return '';
  return clean.toLowerCase().includes('stock') || clean.toLowerCase().includes('unit')
    ? clean
    : `${clean}`;
}

function formatValue(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '';
  return formatCompactUsd(num);
}

function formatShareCount(shares) {
  const num = Number(shares);
  if (!Number.isFinite(num) || num <= 0) return '';
  return formatShares(num);
}

export function describeInsiderTransaction(row) {
  const owner = String(row?.ownername ?? row?.ownerName ?? '').trim() || 'Unknown insider';
  const code = normalizeCode(row?.transactioncode ?? row?.transactionCode);
  const meta = CODE_META[code] || { verb: 'traded', label: `Form 4 code ${code || '?'}` };
  const sharesText = formatShareCount(row?.shares);
  const valueText = formatValue(row?.transactionvalue ?? row?.transactionValue);
  const security = formatSecurityTitle(row?.securitytitle ?? row?.securityTitle);

  let action = meta.verb;
  if (sharesText) {
    action += ` ${sharesText} shares`;
  }
  if (valueText) {
    action += sharesText ? ` for ${valueText}` : ` ${valueText}`;
  }
  if (!sharesText && !valueText) {
    action += ` (${meta.label})`;
  }
  if (security) {
    action += ` of ${security}`;
  }

  return `${owner} ${action}`;
}
