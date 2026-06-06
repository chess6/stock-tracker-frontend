import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PortfolioPage from './pages/PortfolioPage';
import SummaryPage from './pages/SummaryPage';
import FinancialsPage from './pages/FinancialsPage';
import NasdaqColumnsGrid from './pages/NasdaqColumnsGrid';
import GridDemoPage from './pages/GridDemoPage';
import './App.css';
import "@svar-ui/react-grid/all.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import AppNavbar from './components/AppNavbar';
import StockScreenerPage from './pages/StockScreenerPage';
import { Provider } from 'react-redux';
import store from './store';
import TickerDetailsPage from './pages/TickerDetailsPage';
import AdminConsolePage from './pages/AdminConsolePage';
import NewsPage from './pages/NewsPage';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppNavbar />
        <Routes>
          <Route path="/" element={<PortfolioPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path=":ticker" element={<SummaryPage />} />
          <Route path=":ticker/financials" element={<FinancialsPage />} />
          <Route path="nasdaq-columns" element={<NasdaqColumnsGrid />} />
          <Route path="grid-demo" element={<GridDemoPage />} />
          <Route path="screener" element={<StockScreenerPage />} />
          <Route path="admin" element={<AdminConsolePage />} />
          <Route path="ticker/:ticker" element={<TickerDetailsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
