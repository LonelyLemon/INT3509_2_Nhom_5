from fastapi import HTTPException, status


class PortfolioNotFound(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found.",
        )


class HoldingNotFound(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holding not found.",
        )


class HoldingAlreadyExists(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="This asset already exists in the portfolio.",
        )
