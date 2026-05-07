from enum import StrEnum

from src.price.constants import AssetType


class SentimentLabel(StrEnum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"


class NewsCategory(StrEnum):
    STOCK = "STOCK"
    CRYPTO = "CRYPTO"
    FOREX = "FOREX"
    ETF = "ETF"
    INDEX = "INDEX"
    MACRO = "MACRO"


_ASSET_TYPE_TO_CATEGORY: dict[AssetType, NewsCategory] = {
    AssetType.STOCK: NewsCategory.STOCK,
    AssetType.CRYPTO: NewsCategory.CRYPTO,
    AssetType.FOREX: NewsCategory.FOREX,
    AssetType.ETF: NewsCategory.ETF,
    AssetType.INDEX: NewsCategory.INDEX,
}


def asset_type_to_category(asset_type: AssetType | None) -> NewsCategory | None:
    """Map an asset's type to the corresponding news category. Returns None for unknown types."""
    if asset_type is None:
        return None
    return _ASSET_TYPE_TO_CATEGORY.get(asset_type)
