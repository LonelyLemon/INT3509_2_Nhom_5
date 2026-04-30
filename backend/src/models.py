"""Central model imports — all models must be imported here for Alembic autogenerate."""

from src.auth.models import User
from src.news.models import NewsArticle, NewsArticleTicker
from src.price.models import Asset, PriceData
from src.portfolio.models import Portfolio, Holding
from src.watchlist.models import WatchlistItem
from src.ai.models import Conversation, Message