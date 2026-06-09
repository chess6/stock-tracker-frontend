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
    <nav className="ticker-subnav mb-2" aria-label={`${ticker} sections`}>
      <span className="st-ticker ticker-subnav-symbol">{ticker}</span>
      <div className="st-segment ticker-subnav-tabs" role="tablist">
        {TABS.map((tab) => {
          const path = tabPath(ticker, tab);
          const active = isTabActive(location.pathname, ticker, tab);
          return (
            <Link
              key={tab.id}
              to={path}
              role="tab"
              aria-selected={active}
              className={`st-segment-btn ${active ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Link to="/research" className="st-link-muted ticker-subnav-back">
        ← Research
      </Link>
    </nav>
  );
}
