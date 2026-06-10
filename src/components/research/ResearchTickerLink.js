import { Link } from 'react-router-dom';
import {
  buildResearchTickerPath,
  saveScreenerScrollBeforeLeave,
} from '../../utils/researchNavigation';

export default function ResearchTickerLink({
  ticker,
  dimension = 'MRY',
  className,
  children,
  onBeforeNavigate = saveScreenerScrollBeforeLeave,
}) {
  return (
    <Link
      to={buildResearchTickerPath(ticker, dimension)}
      className={className}
      onClick={() => onBeforeNavigate?.()}
    >
      {children ?? ticker}
    </Link>
  );
}
