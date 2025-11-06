
import { useState, useRef } from 'react';
import { Container, Navbar, NavbarBrand, Input, Button } from 'reactstrap';
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
  const searchTimeoutRef = useRef();
  const latestSearchValue = useRef('');
  const navigate = useNavigate();

  const handleSearchChange = e => {
    const value = e.target.value;
    setSearch(value);
    latestSearchValue.current = value;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length > 0) {
      searchTimeoutRef.current = setTimeout(async () => {
        if (latestSearchValue.current === value && value.trim() !== '') {
          const res = await axios.get(`${API_ENDPOINTS.SEARCH}?q=${value}`);
          setSearchResults(res.data);
          setDropdownOpen(true);
        }
      }, 100);
    } else {
      setDropdownOpen(false);
      setSearchResults([]);
    }
  };

  const handleAddToPortfolio = ticker => {
    // Add to localstorage
    const prev = JSON.parse(localStorage.getItem('portfolio')) || [];
    const updated = [...new Set([...prev, ticker])];
    localStorage.setItem('portfolio', JSON.stringify(updated));
    setDropdownOpen(false);
    setSearch('');
  };

  const handleSearchTicker = ticker => {
    setDropdownOpen(false);
    setSearch('');
    navigate(`/${ticker}`);
  };

  return (
    <Navbar color="dark" dark expand="lg" className="mb-4 position-relative" style={{ minHeight: 64 }}>
      <Container fluid className="d-flex justify-content-between">
        <div className="d-flex align-items-center">
          <NavbarBrand tag={Link} to="/" className="fw-bold fs-4" style={{ cursor: 'pointer' }}>
            Stock Portfolio
          </NavbarBrand>
          <Link to="/nasdaq-columns" className="ms-3 text-light text-decoration-none fw-semibold" style={{ fontSize: 16 }}>
            NASDAQ Reference
          </Link>
        </div>
        <div className="d-flex position-relative" style={{ }}>
          <Input
            type="text"
            bsSize="sm"
            className="me-2"
            style={{ width: "45rem", fontSize: 14 }}
            value={search}
            onChange={handleSearchChange}
            placeholder="Search ticker"
          />
          {dropdownOpen && searchResults.length > 0 && (
            <div
              className="list-group shadow position-absolute mt-5 z-3 navbar-search-dropdown"
            >
              {searchResults.map((item, idx) => (
                <div key={idx} className="list-group-item d-flex justify-content-between" style={{ width: "45rem" }}>
                  <span><strong>{item.ticker}</strong> <small className="text-muted">{item.name}</small></span>
                  <span>
                    <Button size="sm" color="success" className="me-2" onClick={() => handleAddToPortfolio(item.ticker)} title="Add to Portfolio">
                      <FontAwesomeIcon icon={faPlus} />
                    </Button>
                    <Button size="sm" color="primary" onClick={() => handleSearchTicker(item.ticker)} title="Search">
                      <FontAwesomeIcon icon={faSearch} />
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
