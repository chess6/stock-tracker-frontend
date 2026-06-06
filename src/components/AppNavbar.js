

import { useState, useRef } from 'react';
import { isInPortfolio, addToPortfolioWithNotification } from '../utils/portfolio';
import { Container, Navbar, NavbarBrand, Input, Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import '../navbar-search-dropdown.css';

const AppNavbar = () => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const searchTimeoutRef = useRef();
  const latestSearchValue = useRef('');
  const navigate = useNavigate();

  const handleSearchChange = e => {
    const value = e.target.value;
    setSearch(value);
    latestSearchValue.current = value;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length > 0) {
      const searchValueAtTimeout = value;
      searchTimeoutRef.current = setTimeout(async () => {
        if (latestSearchValue.current === searchValueAtTimeout && searchValueAtTimeout.trim() !== '') {
          try {
            const res = await axios.get(`${API_ENDPOINTS.SEARCH}?q=${searchValueAtTimeout}`);
            // Only update if still latest
            if (latestSearchValue.current === searchValueAtTimeout) {
              setSearchResults(res.data);
              setDropdownOpen(true);
            }
          } catch {}
        }
      }, 150);
    } else {
      setDropdownOpen(false);
      setSearchResults([]);
    }
  };

  const handleAddToPortfolio = ticker => {
    // Add to localstorage with notification logic from utils
    const notif = addToPortfolioWithNotification(ticker);
    setNotification(notif);
    setDropdownOpen(false);
    setSearch('');
  };

  const handleSearchTicker = ticker => {
    setDropdownOpen(false);
    setSearch('');
    navigate(`/${ticker}`);
  };

  return (
    <>
      {notification && (
        <div className={`alert alert-${notification.type} alert-dismissible fade show`} role="alert" style={{ position: 'fixed', top: 70, right: 30, zIndex: 9999, minWidth: 280 }}>
          {notification.message}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setNotification(null)}></button>
        </div>
      )}
      <Navbar color="dark" dark expand="lg" className="mb-1 position-relative" style={{ minHeight: 64 }}>
        <Container fluid>
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="d-flex align-items-center">
              <NavbarBrand tag={Link} to="/" className="fw-bold fs-4" style={{ cursor: 'pointer' }}>
                Stock Portfolio
              </NavbarBrand>
              <Link to="/nasdaq-columns" className="ms-3 text-light text-decoration-none fw-semibold" style={{ fontSize: 16 }}>
                NASDAQ Reference
              </Link>
              <Link to="/news" className="ms-3 text-light text-decoration-none fw-semibold" style={{ fontSize: 16 }}>
                News
              </Link>
              <Link to="/screener" className="ms-3 text-light text-decoration-none fw-semibold" style={{ fontSize: 16 }}>
                Screener
              </Link>
              <Link to="/admin" className="ms-3 text-light text-decoration-none fw-semibold" style={{ fontSize: 16 }}>
                Admin
              </Link>
            </div>
            <div className="d-flex position-relative" style={{ minWidth: "45rem", justifyContent: "flex-end" }}>
              <div style={{ position: 'relative', width: '45rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Input
                  type="text"
                  bsSize="sm"
                  style={{ width: "100%", fontSize: 14 }}
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search ticker"
                  onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                />
                {search && (
                  <Button
                    size="sm"
                    color="secondary"
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', zIndex: 11, padding: '0 8px', fontSize: 16, borderRadius: '50%' }}
                    onClick={() => { setSearch(''); setSearchResults([]); setDropdownOpen(false); }}
                    aria-label="Clear search"
                    tabIndex={0}
                  >
                    &times;
                  </Button>
                )}
              </div>
              <Dropdown isOpen={dropdownOpen && searchResults.length > 0} toggle={() => setDropdownOpen(!dropdownOpen)} style={{ width: '100%' }} direction="down">
                <DropdownToggle tag="span" style={{ display: 'none' }} />
                <DropdownMenu className="w-100 navbar-search-dropdown shadow" style={{  }}>
                  {searchResults.map((item, idx) => (
                    <div key={idx} className="d-flex justify-content-between align-items-center dropdown-item" style={{ width: "100%", cursor: 'pointer' }} role="menuitem" tabIndex={0}>
                      <span><strong>{item.ticker}</strong> <small className="text-muted">{item.name}</small></span>
                      <span>
                        <Button
                          size="sm"
                          color={isInPortfolio(item.ticker) ? 'secondary' : 'success'}
                          className="me-2"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => handleAddToPortfolio(item.ticker)}
                          title={isInPortfolio(item.ticker) ? 'Already in Portfolio' : 'Add to Portfolio'}
                          disabled={isInPortfolio(item.ticker)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </Button>
                        <Button size="sm" color="primary" onMouseDown={e => e.preventDefault()} onClick={() => handleSearchTicker(item.ticker)} title="Search">
                          <FontAwesomeIcon icon={faSearch} />
                        </Button>
                      </span>
                    </div>
                  ))}
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </div>
      </Container>
    </Navbar>
    </>
  );
}

export default AppNavbar;
