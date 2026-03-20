"""Central model imports — all models must be imported here for Alembic autogenerate."""

from src.auth.models import User
from src.news.models import NewsArticle, NewsArticleTicker, NewsArticleTopic