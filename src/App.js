import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import PortfolioPage from './pages/PortfolioPage';
import SummaryPage from './pages/SummaryPage';
import ResearchOverviewPage from './pages/ResearchOverviewPage';
import NasdaqColumnsGrid from './pages/NasdaqColumnsGrid';
// import GridDemoPage from './pages/GridDemoPage';
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
import FinancialsPage from './pages/FinancialsPage';
import ScreenPage from './pages/ScreenPage';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { loadMetricRegistry } from './config/metricRegistry';
import { loadUserPreferences } from './utils/portfolio';
import { tickerFindersUrl, tickerFinancialsUrl } from './utils/tickerLinks';

function LegacyOverviewRedirect() {
  const { ticker } = useParams();
  return <Navigate to={tickerFinancialsUrl(ticker)} replace />;
}

function LegacyFindersRedirect() {
  const { ticker } = useParams();
  return <Navigate to={tickerFindersUrl(ticker)} replace />;
}

function LegacyInsiderRedirect() {
  const { ticker } = useParams();
  return <Navigate to={tickerFindersUrl(ticker)} replace />;
}

function LegacyFinancialsRedirect() {
  const { ticker } = useParams();
  return <Navigate to={`/financials/${ticker}`} replace />;
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
          {/* <Route path="grid-demo" element={<GridDemoPage />} /> */}
          <Route path="screener" element={<StockScreenerPage />} />
          <Route path="industry" element={<IndustryPage />} />
          <Route path="movers" element={<MoversPage />} />
          <Route path="admin" element={<AdminConsolePage />} />
          <Route path="overview/:ticker" element={<ResearchOverviewPage />} />
          <Route path="finders/:ticker" element={<TickerDetailsPage />} />
          <Route path="financials/:ticker" element={<FinancialsPage />} />
          <Route path=":ticker/financials" element={<LegacyFinancialsRedirect />} />
          <Route path=":ticker/insiders" element={<LegacyFindersRedirect />} />
          {/* legacy: screener linked here before /finders/:ticker */}
          <Route path="ticker/:ticker" element={<LegacyInsiderRedirect />} />
          {/* legacy: <Route path="ticker/:ticker" element={<TickerDetailsPage />} /> */}
          <Route path=":ticker/summary" element={<SummaryPage />} />
          <Route path=":ticker" element={<LegacyOverviewRedirect />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
