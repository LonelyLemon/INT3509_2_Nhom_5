from fastapi import HTTPException, status


class NewsArticleNotFound(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News article not found"
        )


class NewsFetchError(HTTPException):
    def __init__(self, detail: str = "Failed to fetch news from external provider"):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail
        )
