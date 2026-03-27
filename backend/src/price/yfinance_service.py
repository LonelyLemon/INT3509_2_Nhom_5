import yfinance as yf
import pandas as pd
from typing import Dict, List, Optional, Any

def get_latest_price(ticker_symbol: str) -> Optional[float]:
    try:
        ticker = yf.Ticker(ticker_symbol)
        return ticker.fast_info.last_price
    except Exception as e:
        print(f"Error fetching latest price for {ticker_symbol}: {e}")
        return None

def get_historical_data(ticker_symbol: str, 
                        period: str = "1mo", 
                        interval: str = "1d") -> Optional[List[Dict[str, Any]]]:
    """
    Fetches historical price data.
    Valid periods: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    Valid intervals: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
    """
    try:
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
            return None
            
        hist = hist.reset_index()
        
        date_col = 'Datetime' if 'Datetime' in hist.columns else 'Date'
        hist[date_col] = hist[date_col].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        return hist.to_dict(orient="records")
        
    except Exception as e:
        print(f"Error fetching historical data for {ticker_symbol}: {e}")
        return None

def get_ticker_metadata(ticker_symbol: str) -> Optional[Dict[str, Any]]:
    try:
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        
        if not info or len(info) <= 1:
            return None
            
        return {
            "name": info.get("shortName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "market_cap": info.get("marketCap"),
            "currency": info.get("currency"),
            "exchange": info.get("exchange")
        }
    except Exception as e:
        print(f"Error fetching metadata for {ticker_symbol}: {e}")
        return None
    

#----------------------
#     DEV USE ONLY
#----------------------
if __name__ == "__main__":
    ticker = "AAPL"

    latest_price = get_latest_price(ticker)
    historical_data = get_historical_data(ticker)
    ticker_metadata = get_ticker_metadata(ticker)
    
    print(f"The latest price is: {latest_price}")
    print(f"\nThe ticker metadata are: {ticker_metadata}")
    print(f"\nThe historical data are: {historical_data}")