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

function App() {
  return (
    <Router>
      <AppNavbar />
      <Routes>
        <Route path="/" element={<PortfolioPage />} />
        <Route path=":ticker" element={<SummaryPage />} />
        <Route path=":ticker/financials" element={<FinancialsPage />} />
        <Route path="nasdaq-columns" element={<NasdaqColumnsGrid />} />
        <Route path="grid-demo" element={<GridDemoPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
