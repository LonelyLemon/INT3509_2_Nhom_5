from fastapi import HTTPException, status


class NewsProviderError(HTTPException):
    """Raised when the upstream news provider returns an unexpected response."""
    def __init__(self, detail: str = "Unexpected response from news provider."):
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


class ArticleNotFound(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found.",
        )
