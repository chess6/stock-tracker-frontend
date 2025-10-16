import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApexCharts from 'react-apexcharts';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';

const SummaryPage = () => {
  const { ticker } = useParams();
  const [prices, setPrices] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(API_ENDPOINTS.SUMMARY(ticker)).then(res => {
      setPrices(res.data.prices || []);
      setLoading(false);
    });
    axios.get(API_ENDPOINTS.NEWS(ticker)).then(res => {
      setNews(res.data || []);
    });
  }, [ticker]);

  const chartOptions = {
    chart: { id: 'price-line' },
    xaxis: {
      categories: prices.map(p => p.date ? p.date.slice(0, 10) : ''),
      title: { text: 'Date' },
    },
    yaxis: { title: { text: 'Price' } },
    title: { text: `${ticker} Price History`, align: 'left' },
  };
  const chartSeries = [
    {
      name: 'Close',
      data: prices.map(p => p.close),
    },
  ];

  return (
    <div>
      <nav>
        <Link to={`/${ticker}`}>Summary</Link> |{' '}
        <Link to={`/${ticker}/financials`}>Financials</Link>
      </nav>
      <h1>Summary for {ticker}</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <ApexCharts options={chartOptions} series={chartSeries} type="line" height={320} />
          </div>
          <h2>News Feed</h2>
          <ul>
            {news.length === 0 && <li>No news found.</li>}
            {news.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 12 }}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                <div style={{ color: '#888', fontSize: 12 }}>{item.publishedDate ? item.publishedDate.slice(0, 10) : ''}</div>
                <div>{item.description}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default SummaryPage;
