import { Link } from 'react-router-dom';
import { tickerFinancialsUrl } from '../../utils/tickerLinks';
import {
  saveScreenerScrollBeforeLeave,
} from '../../utils/researchNavigation';

export default function ResearchTickerLink({
  ticker,
  className,
  children,
  onBeforeNavigate = saveScreenerScrollBeforeLeave,
}) {
  return (
    <Link
      to={tickerFinancialsUrl(ticker)}
      className={className}
      onClick={() => onBeforeNavigate?.()}
    >
      {children ?? ticker}
    </Link>
  );
}
