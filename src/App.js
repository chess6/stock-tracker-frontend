import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import DashboardPage from './pages/DashboardPage';
import IndustryPage from './pages/IndustryPage';
import MoversPage from './pages/MoversPage';
import { ToastProvider } from './context/ToastContext';

function LegacyInsiderRedirect() {
  const { ticker } = useParams();
  return <Navigate to={`/${ticker}/insiders`} replace />;
}

function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
      <Router>
        <AppNavbar />
        <Routes>
          <Route path="/" element={<PortfolioPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="columns" element={<NasdaqColumnsGrid />} />
          {/* legacy: direct Nasdaq reference path — redirect kept for bookmarks */}
          <Route path="nasdaq-columns" element={<Navigate to="/columns" replace />} />
          {/* legacy: <Route path="nasdaq-columns" element={<NasdaqColumnsGrid />} /> */}
          <Route path="grid-demo" element={<GridDemoPage />} />
          <Route path="screener" element={<StockScreenerPage />} />
          <Route path="industry" element={<IndustryPage />} />
          <Route path="movers" element={<MoversPage />} />
          <Route path="admin" element={<AdminConsolePage />} />
          <Route path=":ticker/financials" element={<FinancialsPage />} />
          <Route path=":ticker/insiders" element={<TickerDetailsPage />} />
          {/* legacy: screener linked here before /:ticker/insiders */}
          <Route path="ticker/:ticker" element={<LegacyInsiderRedirect />} />
          {/* legacy: <Route path="ticker/:ticker" element={<TickerDetailsPage />} /> */}
          <Route path=":ticker" element={<SummaryPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      </ToastProvider>
    </Provider>
  );
}

export default App;
