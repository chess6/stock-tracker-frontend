import { Link, useLocation } from 'react-router-dom';
import { tickerFindersUrl, tickerOverviewUrl } from '../utils/tickerLinks';

const TABS = [
  { id: 'overview', label: 'Overview', overview: true },
  { id: 'financials', label: 'Financials', financials: true },
  { id: 'insiders', label: 'Insider Transactions', finders: true },
  { id: 'research', label: 'Research', research: true },
];

function tabPath(ticker, tab) {
  const encoded = encodeURIComponent(ticker);
  if (tab.research) return `/research/${encoded}`;
  if (tab.financials) return `/financials/${encoded}`;
  if (tab.overview) return tickerOverviewUrl(ticker);
  if (tab.finders) return tickerFindersUrl(ticker);
  return `/${encoded}`;
}

function isTabActive(pathname, ticker, tab) {
  const target = tabPath(ticker, tab);
  if (tab.research || tab.financials || tab.overview || tab.finders) {
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
