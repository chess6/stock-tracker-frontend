

import { useState, useRef, useEffect } from 'react';
import { isInPortfolio, addToPortfolioWithNotification } from '../utils/portfolio';
import {
  Container, Navbar, NavbarBrand, NavbarToggler, Collapse,
  Input, Button, Dropdown, DropdownToggle, DropdownMenu, Nav, NavItem,
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { summarizeFreshness } from '../utils/dataFreshness';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import ThemeProfileMenu from './ThemeProfileMenu';
import '../navbar-search-dropdown.css';
import '../navbar-layout.css';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/news', label: 'News' },
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
  const { showToast } = useToast();
  const { isDark } = useTheme();

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

  useEffect(() => {
    if (!dropdownOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setActiveResultIdx(-1);
      }
    };
    const onMouseDown = (event) => {
      if (searchAreaRef.current && !searchAreaRef.current.contains(event.target)) {
        setDropdownOpen(false);
        setActiveResultIdx(-1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [dropdownOpen]);

  const handleSearchChange = e => {
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

  const handleAddToPortfolio = ticker => {
    const notif = addToPortfolioWithNotification(ticker);
    showToast(notif.message, notif.type);
    setDropdownOpen(false);
    setSearch('');
    setSearchResults([]);
    setActiveResultIdx(-1);
  };

  const handleSearchTicker = ticker => {
    setDropdownOpen(false);
    setSearch('');
    setSearchResults([]);
    setActiveResultIdx(-1);
    setNavOpen(false);
    navigate(`/${ticker}`);
  };

  return (
    <Navbar
      color={isDark ? 'dark' : 'light'}
      dark={isDark}
      expand="lg"
      className={`mb-1 position-relative ${isDark ? '' : 'border-bottom'}`}
      style={{ minHeight: 64 }}
    >
      <Container fluid className="navbar-shell">
        <NavbarBrand tag={Link} to="/" className="fw-bold fs-4" style={{ cursor: 'pointer' }}>
          Stock Portfolio
        </NavbarBrand>
        <NavbarToggler onClick={() => setNavOpen((v) => !v)} />
        <Collapse isOpen={navOpen} navbar className="navbar-shell-collapse">
          <Nav className="me-auto flex-wrap navbar-nav-links" navbar>
            {NAV_LINKS.map((link) => (
              <NavItem key={link.to}>
                <Link
                  to={link.to}
                  className={`nav-link fw-semibold ${isDark ? 'text-light' : 'text-dark'}`}
                  onClick={() => setNavOpen(false)}
                >
                  {link.label}
                </Link>
              </NavItem>
            ))}
            {staleLabel && (
              <NavItem>
                <Link
                  to="/admin"
                  className="nav-link badge rounded-pill text-bg-warning text-decoration-none"
                  title="Local cache may be out of date — open Admin to refresh"
                  onClick={() => setNavOpen(false)}
                >
                  {staleLabel}
                </Link>
              </NavItem>
            )}
          </Nav>
        </Collapse>
        <div ref={searchAreaRef} className="navbar-tools">
          <div className="navbar-search-area">
            <Input
              type="search"
              bsSize="sm"
              className="navbar-search-input"
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search ticker or company"
              aria-label="Search ticker or company"
              onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
              autoComplete="off"
            />
            {search && (
              <Button
                size="sm"
                color="secondary"
                className="navbar-search-clear"
                onClick={() => { setSearch(''); setSearchResults([]); setDropdownOpen(false); setActiveResultIdx(-1); }}
                aria-label="Clear search"
              >
                &times;
              </Button>
            )}
            <Dropdown
              isOpen={dropdownOpen && searchResults.length > 0}
              toggle={() => setDropdownOpen(!dropdownOpen)}
              className="navbar-search-dropdown-wrap"
              direction="down"
            >
              <DropdownToggle tag="span" className="navbar-search-dropdown-anchor" />
              <DropdownMenu className="navbar-search-dropdown shadow">
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
                      <Button
                        size="sm"
                        color={isInPortfolio(item.ticker) ? 'secondary' : 'success'}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleAddToPortfolio(item.ticker)}
                        title={isInPortfolio(item.ticker) ? 'Already in portfolio' : 'Add to portfolio'}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleSearchTicker(item.ticker)}
                        title="Open ticker summary"
                      >
                        <FontAwesomeIcon icon={faSearch} />
                      </Button>
                    </span>
                  </div>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
          <div className="navbar-profile-slot">
            <ThemeProfileMenu />
          </div>
        </div>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
