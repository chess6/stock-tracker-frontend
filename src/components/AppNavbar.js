

import { useState, useRef, useEffect, useCallback } from 'react';
import { isInPortfolio, addToPortfolioWithNotification } from '../utils/portfolio';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { summarizeFreshness } from '../utils/dataFreshness';
import { useToast } from '../context/ToastContext';
import ThemeProfileMenu from './ThemeProfileMenu';
import { useCloseOnOutside } from '../hooks/useDismissiblePopover';
import '../navbar-search-dropdown.css';
import '../navbar-layout.css';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/news', label: 'News' },
  { to: '/research', label: 'Research' },
  { to: '/screen', label: 'Screen' },
  { to: '/screener', label: 'Screener' },
  { to: '/industry', label: 'Industry' },
  { to: '/movers', label: 'Movers' },
  { to: '/columns', label: 'Columns' },
  { to: '/admin', label: 'Admin' },
];

const AppNavbar = () => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [activeResultIdx, setActiveResultIdx] = useState(-1);
  const [staleLabel, setStaleLabel] = useState(null);
  const searchTimeoutRef = useRef();
  const latestSearchValue = useRef('');
  const searchAreaRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const closeSearchDropdown = useCallback(() => {
    setDropdownOpen(false);
    setActiveResultIdx(-1);
  }, []);

  useCloseOnOutside(dropdownOpen, searchAreaRef, closeSearchDropdown);

  useEffect(() => {
    let cancelled = false;
    const loadFreshness = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.ADMIN_STATUS);
        if (cancelled) return;
        const { label } = summarizeFreshness(res.data?.freshness);
        setStaleLabel(label);
      } catch {
        if (!cancelled) setStaleLabel(null);
      }
    };
    loadFreshness();
    const id = setInterval(loadFreshness, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    latestSearchValue.current = value;
    setActiveResultIdx(-1);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length > 0) {
      const searchValueAtTimeout = value;
      searchTimeoutRef.current = setTimeout(async () => {
        if (latestSearchValue.current === searchValueAtTimeout && searchValueAtTimeout.trim() !== '') {
          try {
            const res = await axios.get(`${API_ENDPOINTS.SEARCH}?q=${searchValueAtTimeout}`);
            if (latestSearchValue.current === searchValueAtTimeout) {
              setSearchResults(res.data);
              setDropdownOpen(true);
            }
          } catch {
            if (latestSearchValue.current === searchValueAtTimeout) {
              setSearchResults([]);
              setDropdownOpen(false);
            }
          }
        }
      }, 150);
    } else {
      setDropdownOpen(false);
      setSearchResults([]);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (!dropdownOpen || searchResults.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveResultIdx((prev) => (prev + 1) % searchResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveResultIdx((prev) => (prev <= 0 ? searchResults.length - 1 : prev - 1));
    } else if (event.key === 'Enter' && activeResultIdx >= 0) {
      event.preventDefault();
      handleSearchTicker(searchResults[activeResultIdx].ticker);
    }
  };

  const handleAddToPortfolio = (ticker) => {
    const notif = addToPortfolioWithNotification(ticker);
    showToast(notif.message, notif.type);
    setDropdownOpen(false);
    setSearch('');
    setSearchResults([]);
    setActiveResultIdx(-1);
  };

  const handleSearchTicker = (ticker) => {
    setDropdownOpen(false);
    setSearch('');
    setSearchResults([]);
    setActiveResultIdx(-1);
    setNavOpen(false);
    navigate(`/${ticker}`);
  };

  return (
    <header className="st-navbar navbar mb-1 position-relative">
      <div className="container-fluid navbar-shell">
        <Link to="/" className="navbar-brand fw-bold">
          Stock Portfolio
        </Link>
        <button
          type="button"
          className="navbar-toggler"
          aria-expanded={navOpen}
          aria-label="Toggle navigation"
          onClick={() => setNavOpen((v) => !v)}
        >
          ☰
        </button>
        <nav className={`navbar-shell-collapse navbar-nav-links${navOpen ? ' is-open' : ''}`}>
          <ul className="navbar-nav-list">
            {NAV_LINKS.map((link) => {
              const active = link.to === '/'
                ? location.pathname === '/'
                : location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`st-nav-link${active ? ' active' : ''}`}
                    onClick={() => setNavOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            {staleLabel && (
              <li>
                <Link
                  to="/admin"
                  className="st-nav-link badge rounded-pill text-bg-warning text-decoration-none"
                  title="Local cache may be out of date — open Admin to refresh"
                  onClick={() => setNavOpen(false)}
                >
                  {staleLabel}
                </Link>
              </li>
            )}
          </ul>
        </nav>
        <div className="navbar-tools">
          <div ref={searchAreaRef} className="navbar-search-area">
            <input
              type="search"
              className="navbar-search-input st-input"
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search ticker or company"
              aria-label="Search ticker or company"
              onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
              autoComplete="off"
            />
            {search && (
              <button
                type="button"
                className="navbar-search-clear st-btn-ghost"
                onClick={() => { setSearch(''); setSearchResults([]); setDropdownOpen(false); setActiveResultIdx(-1); }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
            {dropdownOpen && searchResults.length > 0 && (
              <div className="navbar-search-dropdown shadow navbar-search-dropdown-wrap">
                {searchResults.map((item, idx) => (
                  <div
                    key={item.ticker}
                    className={`dropdown-item navbar-search-result ${idx === activeResultIdx ? 'active' : ''}`}
                    role="menuitem"
                    onMouseEnter={() => setActiveResultIdx(idx)}
                  >
                    <span className="navbar-search-result-label" title={`${item.ticker} ${item.name}`}>
                      <strong>{item.ticker}</strong>{' '}
                      <small className="text-muted">{item.name}</small>
                    </span>
                    <span className="navbar-search-result-actions">
                      <button
                        type="button"
                        className={isInPortfolio(item.ticker) ? 'st-btn-muted' : 'st-btn-success'}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAddToPortfolio(item.ticker)}
                        title={isInPortfolio(item.ticker) ? 'Already in portfolio' : 'Add to portfolio'}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                      <button
                        type="button"
                        className="st-btn-primary"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSearchTicker(item.ticker)}
                        title="Open ticker summary"
                      >
                        <FontAwesomeIcon icon={faSearch} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="navbar-profile-slot">
            <ThemeProfileMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppNavbar;
