# Stock Tracker

A full-stack web application for managing stock portfolios, screening stocks, analyzing insider buying, and viewing detailed financial data. Built with React (frontend) and Flask (backend), using SQLite, SEC EDGAR CompanyFacts, RSS feeds, and optional Nasdaq Data Link compatibility endpoints.

## Features

- **Stock Screener**: View insider buying analytics, sortable and filterable by ticker, company, and time window (6M, 3M, 1M).
- **Insider Buying Analytics**: Aggregates insider purchases, highlights tickers with significant activity, and shows unique owner counts.
- **Ticker Details Page**: View all financial data for a selected ticker, with readable formatting and easy navigation.
- **Portfolio Management**: Add tickers to your portfolio and receive notifications for new insider buys.
- **Responsive DataGrid**: Fast, virtualized grid with sticky headers, column resizing, and infinite scroll.

## Tech Stack

- **Frontend**: React, Redux Toolkit, @tanstack/react-table, Bootstrap
- **Backend**: Flask, pandas, requests, pandas_market_calendars
- **APIs and Sources**: SEC EDGAR CompanyFacts, RSS feeds, optional Nasdaq Data Link (SHARADAR/SF2, SEP)

## Setup

### Backend
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Set up `.env` with your API keys:
   ```
   NASDAQ_API_KEY=your_nasdaq_key
   SEC_USER_AGENT=you@example.com
   ```
3. Run the backend:
   ```bash
   cd stock_tracker_backend
   python api.py
   ```

### Frontend
1. Install dependencies:
   ```bash
   cd stock_tracker_frontend
   npm install
   ```
2. Start the frontend:
   ```bash
   npm start
   ```

## Usage
- Open the frontend in your browser (usually at `http://localhost:3000`).
- Use the screener to explore insider buying trends.
- Click a ticker to view detailed financials.
- Add tickers to your portfolio.

## API Endpoints
- `/api/insiders/buying-sums`: Insider buying aggregation
- `/api/ticker/<ticker>/sf2`: All SHARADAR/SF2 columns for a ticker
- `/api/ticker/financials`: SHARADAR/SF1 financials
- `/api/tickers/daily-change`: Previous and current close prices
- `/api/ticker/<ticker>/news`: Latest news for a ticker

## Customization
- Adjust DataGrid columns, formatting, and analytics in `src/pages/StockScreenerPage.js` and `src/pages/TickerDetailsPage.js`.
- Backend logic and endpoints in `backend/api.py`.

## License
MIT

## Credits
- [Nasdaq Data Link](https://data.nasdaq.com/)
- [SEC EDGAR CompanyFacts](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- [React](https://react.dev/)
- [Flask](https://flask.palletsprojects.com/)
