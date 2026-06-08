import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { id: 'summary', suffix: '', label: 'Summary' },
  { id: 'financials', label: 'Financials', research: true },
  { id: 'insiders', suffix: '/insiders', label: 'Insider Transactions' },
];

function tabPath(ticker, tab) {
  if (tab.research) return `/research/${encodeURIComponent(ticker)}`;
  return `/${encodeURIComponent(ticker)}${tab.suffix || ''}`;
}

function isTabActive(pathname, ticker, tab) {
  const target = tabPath(ticker, tab);
  if (tab.research) {
    return pathname === target || pathname.startsWith(`${target}/`);
  }
  return pathname === target;
}

export default function TickerSubnav({ ticker }) {
  const location = useLocation();

  return (
    <nav className="mb-2" aria-label={`${ticker} sections`}>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <span className="fw-semibold text-muted me-1">{ticker}</span>
        {TABS.map((tab) => {
          const path = tabPath(ticker, tab);
          const active = isTabActive(location.pathname, ticker, tab);
          return (
            <Link
              key={tab.id}
              to={path}
              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              {tab.label}
            </Link>
          );
        })}
        <Link to="/research" className="btn btn-sm btn-link ms-auto text-muted">
          ← Research
        </Link>
      </div>
    </nav>
  );
}
