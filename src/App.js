import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PortfolioPage from './pages/PortfolioPage';
import SummaryPage from './pages/SummaryPage';
import FinancialsPage from './pages/FinancialsPage';
import "@svar-ui/react-grid/all.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PortfolioPage />} />
        <Route path=":ticker" element={<SummaryPage />} />
        <Route path=":ticker/financials" element={<FinancialsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
