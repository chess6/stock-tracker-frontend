import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import PortfolioPage from './pages/PortfolioPage';
import SummaryPage from './pages/SummaryPage';
import NasdaqColumnsGrid from './pages/NasdaqColumnsGrid';
import GridDemoPage from './pages/GridDemoPage';
import './App.css';
import "@svar-ui/react-grid/all.css";
import AppNavbar from './components/AppNavbar';
import StockScreenerPage from './pages/StockScreenerPage';
import { Provider } from 'react-redux';
import store from './store';
import TickerDetailsPage from './pages/TickerDetailsPage';
import AdminConsolePage from './pages/AdminConsolePage';
import NewsPage from './pages/NewsPage';
import DashboardPage from './pages/DashboardPage';
import IndustryPage from './pages/IndustryPage';
import MoversPage from './pages/MoversPage';
import ResearchPage from './pages/ResearchPage';
import ScreenPage from './pages/ScreenPage';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { loadMetricRegistry } from './config/metricRegistry';
import { loadUserPreferences } from './utils/portfolio';

function LegacyInsiderRedirect() {
  const { ticker } = useParams();
  return <Navigate to={`/${ticker}/insiders`} replace />;
}

function LegacyFinancialsRedirect() {
  const { ticker } = useParams();
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  return <Navigate to={`/research/${ticker}${qs ? `?${qs}` : ''}`} replace />;
}

function App() {
  useEffect(() => {
    loadUserPreferences();
    loadMetricRegistry();
  }, []);
  return (
    <Provider store={store}>
      <ThemeProvider>
      <ToastProvider>
      <Router>
        <AppNavbar />
        <Routes>
          <Route path="/" element={<PortfolioPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/research/:ticker" element={<ResearchPage />} />
          <Route path="/screen" element={<ScreenPage />} />
          <Route path="columns" element={<NasdaqColumnsGrid />} />
          {/* legacy: direct Nasdaq reference path — redirect kept for bookmarks */}
          <Route path="nasdaq-columns" element={<Navigate to="/columns" replace />} />
          {/* legacy: <Route path="nasdaq-columns" element={<NasdaqColumnsGrid />} /> */}
          <Route path="grid-demo" element={<GridDemoPage />} />
          <Route path="screener" element={<StockScreenerPage />} />
          <Route path="industry" element={<IndustryPage />} />
          <Route path="movers" element={<MoversPage />} />
          <Route path="admin" element={<AdminConsolePage />} />
          <Route path=":ticker/financials" element={<LegacyFinancialsRedirect />} />
          <Route path=":ticker/insiders" element={<TickerDetailsPage />} />
          {/* legacy: screener linked here before /:ticker/insiders */}
          <Route path="ticker/:ticker" element={<LegacyInsiderRedirect />} />
          {/* legacy: <Route path="ticker/:ticker" element={<TickerDetailsPage />} /> */}
          <Route path=":ticker" element={<SummaryPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
