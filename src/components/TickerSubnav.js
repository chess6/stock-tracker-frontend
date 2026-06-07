import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { suffix: '', label: 'Summary' },
  { suffix: '/financials', label: 'Financials' },
  { suffix: '/insiders', label: 'Insider Transactions' },
];

export default function TickerSubnav({ ticker }) {
  const location = useLocation();
  const base = `/${ticker}`;

  return (
    <nav className="mb-3" aria-label={`${ticker} sections`}>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <span className="fw-semibold text-muted me-1">{ticker}</span>
        {TABS.map((tab) => {
          const path = `${base}${tab.suffix}`;
          const active = location.pathname === path;
          return (
            <Link
              key={tab.suffix || 'summary'}
              to={path}
              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              {tab.label}
            </Link>
          );
        })}
        <Link to="/screener" className="btn btn-sm btn-link ms-auto text-muted">
          ← Screener
        </Link>
      </div>
    </nav>
  );
}
