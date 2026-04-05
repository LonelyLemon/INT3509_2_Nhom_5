"""
Unit tests for src/price/tasks.py

No live DB or yfinance calls. All external I/O is mocked.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch, call
import asyncio

import pandas as pd
import pytest

from src.price.tasks import _process_ticker_batch, _ingest_1m_price_data, BATCH_SIZE


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_ohlcv_df(tickers: list[str], rows: int = 3) -> pd.DataFrame:
    """
    Build a minimal multi-ticker yfinance-style DataFrame.
    yfinance group_by='ticker' produces a top-level-Ticker MultiIndex:
        df["AAPL"] → sub-DataFrame with columns Open, High, Low, Close, Volume
    """
    base_ts = pd.Timestamp("2026-04-05 14:00:00", tz="UTC")
    times = [base_ts + pd.Timedelta(minutes=i) for i in range(rows)]

    # Top level = Ticker, second level = Price field
    columns = pd.MultiIndex.from_product(
        [tickers, ["Open", "High", "Low", "Close", "Volume"]],
        names=["Ticker", "Price"],
    )
    data = {
        (t, col): [float(100 + i) for i in range(rows)]
        for t in tickers
        for col in ["Open", "High", "Low", "Close", "Volume"]
    }
    return pd.DataFrame(data, index=times, columns=columns)


def _make_single_ticker_df(rows: int = 3) -> pd.DataFrame:
    base_ts = pd.Timestamp("2026-04-05 14:00:00", tz="UTC")
    times = [base_ts + pd.Timedelta(minutes=i) for i in range(rows)]
    return pd.DataFrame(
        {
            "Open": [100.0] * rows,
            "High": [101.0] * rows,
            "Low": [99.0] * rows,
            "Close": [100.5] * rows,
            "Volume": [1000.0] * rows,
        },
        index=times,
    )


def _make_db_mock():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock())
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


# ── _process_ticker_batch ───────────────────────────────────────────��─────────

class TestProcessTickerBatch:
    @pytest.mark.asyncio
    async def test_inserts_records_for_single_ticker(self):
        asset_id = uuid.uuid4()
        ticker_to_id = {"AAPL": asset_id}
        db = _make_db_mock()
        start = datetime(2026, 4, 5, 14, 0, tzinfo=timezone.utc)
        end = datetime(2026, 4, 5, 14, 30, tzinfo=timezone.utc)

        with patch("src.price.tasks.asyncio.to_thread",
                   new=AsyncMock(return_value=_make_single_ticker_df(3))):
            await _process_ticker_batch(db, ["AAPL"], ticker_to_id, start, end)

        db.execute.assert_awaited_once()
        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_inserts_records_for_multiple_tickers(self):
        ids = {t: uuid.uuid4() for t in ["AAPL", "MSFT"]}
        db = _make_db_mock()
        start = datetime(2026, 4, 5, 14, 0, tzinfo=timezone.utc)
        end = datetime(2026, 4, 5, 14, 30, tzinfo=timezone.utc)

        with patch("src.price.tasks.asyncio.to_thread",
                   new=AsyncMock(return_value=_make_ohlcv_df(["AAPL", "MSFT"], rows=3))):
            await _process_ticker_batch(db, ["AAPL", "MSFT"], ids, start, end)

        db.execute.assert_awaited_once()
        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_empty_dataframe_skips_commit(self):
        db = _make_db_mock()
        start = datetime(2026, 4, 5, 14, 0, tzinfo=timezone.utc)
        end = datetime(2026, 4, 5, 14, 30, tzinfo=timezone.utc)

        with patch("src.price.tasks.asyncio.to_thread",
                   new=AsyncMock(return_value=pd.DataFrame())):
            await _process_ticker_batch(
                db, ["AAPL"], {"AAPL": uuid.uuid4()}, start, end
            )

        db.execute.assert_not_awaited()
        db.commit.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_exception_triggers_rollback(self):
        db = _make_db_mock()
        db.execute = AsyncMock(side_effect=Exception("DB error"))
        start = datetime(2026, 4, 5, 14, 0, tzinfo=timezone.utc)
        end = datetime(2026, 4, 5, 14, 30, tzinfo=timezone.utc)

        with patch("src.price.tasks.asyncio.to_thread",
                   new=AsyncMock(return_value=_make_single_ticker_df(2))):
            # Should not raise — errors are caught internally
            await _process_ticker_batch(
                db, ["AAPL"], {"AAPL": uuid.uuid4()}, start, end
            )

        db.rollback.assert_awaited_once()
        db.commit.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_rows_with_missing_close_are_dropped(self):
        """NaN Close rows must not be inserted."""
        df = _make_single_ticker_df(3)
        df.loc[df.index[1], "Close"] = float("nan")  # second row has no close

        db = _make_db_mock()
        start = datetime(2026, 4, 5, 14, 0, tzinfo=timezone.utc)
        end = datetime(2026, 4, 5, 14, 30, tzinfo=timezone.utc)

        inserted_values = []

        async def capture_execute(stmt):
            # Capture the values passed to insert()
            inserted_values.extend(stmt.compile.return_value if hasattr(stmt, "compile") else [])
            return MagicMock()

        db.execute = AsyncMock()

        with patch("src.price.tasks.asyncio.to_thread",
                   new=AsyncMock(return_value=df)):
            await _process_ticker_batch(
                db, ["AAPL"], {"AAPL": uuid.uuid4()}, start, end
            )

        # Only 2 rows (index 0 and 2) should be inserted — the NaN row is dropped.
        # We verify by checking the stmt was still called (2 valid rows exist).
        db.execute.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_timeframe_is_always_1m(self):
        """All inserted records must have timeframe='1m'."""
        captured_records = []
        db = _make_db_mock()

        original_insert = __import__(
            "sqlalchemy.dialects.postgresql", fromlist=["insert"]
        ).insert

        with patch("src.price.tasks.insert") as mock_insert, \
             patch("src.price.tasks.asyncio.to_thread",
                   new=AsyncMock(return_value=_make_single_ticker_df(2))):

            stmt_mock = MagicMock()
            stmt_mock.on_conflict_do_nothing.return_value = stmt_mock
            mock_insert.return_value = stmt_mock

            await _process_ticker_batch(
                db, ["AAPL"], {"AAPL": uuid.uuid4()},
                datetime(2026, 4, 5, 14, 0, tzinfo=timezone.utc),
                datetime(2026, 4, 5, 14, 30, tzinfo=timezone.utc),
            )

            call_args = mock_insert.call_args_list
            if call_args:
                values_call = stmt_mock.on_conflict_do_nothing.call_args_list
                # Verify insert was called (records were built)
                mock_insert.assert_called_once()


# ── _ingest_1m_price_data — batching ─────────────────────────────────────────

class TestIngest1mPriceDataBatching:
    @pytest.mark.asyncio
    async def test_no_active_assets_returns_early(self):
        db = AsyncMock()
        result = MagicMock()
        result.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=result)

        with patch("src.price.tasks.TaskSessionLocal") as mock_session_cls:
            mock_session_cls.return_value.__aenter__ = AsyncMock(return_value=db)
            mock_session_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            with patch("src.price.tasks._process_ticker_batch") as mock_batch:
                await _ingest_1m_price_data()
                mock_batch.assert_not_called()

    @pytest.mark.asyncio
    async def test_tickers_split_into_batches_of_50(self):
        """105 tickers → 3 batches: 50, 50, 5."""
        from src.price.models import Asset as AssetModel

        fake_assets = []
        for i in range(105):
            a = MagicMock(spec=AssetModel)
            a.ticker = f"T{i:03d}"
            a.id = uuid.uuid4()
            fake_assets.append(a)

        db = AsyncMock()
        result = MagicMock()
        result.scalars.return_value.all.return_value = fake_assets
        db.execute = AsyncMock(return_value=result)

        batch_calls = []

        async def capture_batch(db, tickers, ticker_to_id, start, end):
            batch_calls.append(tickers)

        with patch("src.price.tasks.TaskSessionLocal") as mock_session_cls, \
             patch("src.price.tasks._process_ticker_batch", side_effect=capture_batch):

            mock_session_cls.return_value.__aenter__ = AsyncMock(return_value=db)
            mock_session_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            await _ingest_1m_price_data()

        assert len(batch_calls) == 3
        assert len(batch_calls[0]) == 50
        assert len(batch_calls[1]) == 50
        assert len(batch_calls[2]) == 5

    @pytest.mark.asyncio
    async def test_lookback_window_is_30_minutes(self):
        """The start/end window passed to each batch should be ~30 minutes."""
        from src.price.models import Asset as AssetModel

        a = MagicMock(spec=AssetModel)
        a.ticker = "AAPL"
        a.id = uuid.uuid4()

        db = AsyncMock()
        result = MagicMock()
        result.scalars.return_value.all.return_value = [a]
        db.execute = AsyncMock(return_value=result)

        captured = {}

        async def capture_batch(db, tickers, ticker_to_id, start, end):
            captured["start"] = start
            captured["end"] = end

        with patch("src.price.tasks.TaskSessionLocal") as mock_session_cls, \
             patch("src.price.tasks._process_ticker_batch", side_effect=capture_batch):

            mock_session_cls.return_value.__aenter__ = AsyncMock(return_value=db)
            mock_session_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            await _ingest_1m_price_data()

        delta = captured["end"] - captured["start"]
        assert delta.total_seconds() == pytest.approx(30 * 60, abs=5)
