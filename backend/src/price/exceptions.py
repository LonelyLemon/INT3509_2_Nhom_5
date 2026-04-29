from fastapi import HTTPException, status


class AssetNotFound(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticker not found.",
        )


class AssetAlreadyExists(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="A ticker with this symbol already exists.",
        )


class NoPriceDataAvailable(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No price data available for this ticker yet.",
        )


class InvalidTimeframe(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid timeframe. Must be one of: 1m, 5m, 15m, 30m, 1h, 4h, 1d.",
        )
