

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
import '../navbar-search-dropdown.css';

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
    <Navbar color="dark" dark expand="lg" className="mb-1 position-relative" style={{ minHeight: 64 }}>
      <Container fluid>
        <NavbarBrand tag={Link} to="/" className="fw-bold fs-4" style={{ cursor: 'pointer' }}>
          Stock Portfolio
        </NavbarBrand>
        <NavbarToggler onClick={() => setNavOpen((v) => !v)} />
        <Collapse isOpen={navOpen} navbar>
          <Nav className="me-auto flex-wrap" navbar>
            {NAV_LINKS.map((link) => (
              <NavItem key={link.to}>
                <Link
                  to={link.to}
                  className="nav-link text-light fw-semibold"
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
          <div
            ref={searchAreaRef}
            className="d-flex position-relative w-100 flex-lg-grow-0 navbar-search-area mt-2 mt-lg-0"
            style={{ minWidth: 0, maxWidth: '45rem' }}
          >
            <div className="position-relative w-100">
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Input
                  type="search"
                  bsSize="sm"
                  style={{ width: '100%', fontSize: 14 }}
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
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', zIndex: 11, padding: '0 8px', fontSize: 16, borderRadius: '50%' }}
                    onClick={() => { setSearch(''); setSearchResults([]); setDropdownOpen(false); setActiveResultIdx(-1); }}
                    aria-label="Clear search"
                  >
                    &times;
                  </Button>
                )}
              </div>
              <Dropdown isOpen={dropdownOpen && searchResults.length > 0} toggle={() => setDropdownOpen(!dropdownOpen)} style={{ width: '100%' }} direction="down">
                <DropdownToggle tag="span" style={{ display: 'none' }} />
                <DropdownMenu className="w-100 navbar-search-dropdown shadow">
                  {searchResults.map((item, idx) => (
                    <div
                      key={item.ticker}
                      className={`d-flex justify-content-between align-items-center dropdown-item ${idx === activeResultIdx ? 'active' : ''}`}
                      style={{ width: '100%', cursor: 'pointer' }}
                      role="menuitem"
                      onMouseEnter={() => setActiveResultIdx(idx)}
                    >
                      <span><strong>{item.ticker}</strong> <small className="text-muted">{item.name}</small></span>
                      <span>
                        <Button
                          size="sm"
                          color={isInPortfolio(item.ticker) ? 'secondary' : 'success'}
                          className="me-2"
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
          </div>
        </Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
