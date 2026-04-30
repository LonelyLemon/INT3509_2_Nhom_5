from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import Post, Comment, User
from .schemas import PostCreate, PostOut, CommentCreate, CommentOut
from .deps import get_db

blog_route = APIRouter(prefix="/blog", tags=["Blog"])


# ---------- POSTS ----------

@blog_route.post("/posts", response_model=PostOut)
async def create_post(data: PostCreate, db: AsyncSession = Depends(get_db)):
    user_id = UUID("3f9d2c8e-7a4b-4d1e-9c2f-5b6a8e1f0d3c") # cần có user sẵn đề test
    user = await db.get(User, user_id)

    post = Post(title=data.title, content=data.content, author=user)
    db.add(post)
    await db.commit()
    await db.refresh(post)

    return post


@blog_route.get("/posts", response_model=list[PostOut])
async def list_posts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post))
    return result.scalars().all()


@blog_route.get("/posts/{post_id}", response_model=PostOut)
async def get_post(post_id: UUID, db: AsyncSession = Depends(get_db)):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(404)
    return post


# ---------- COMMENTS ----------

@blog_route.post("/posts/{post_id}/comments", response_model=CommentOut)
async def create_comment(post_id: UUID, data: CommentCreate, db: AsyncSession = Depends(get_db)):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(404)

    user = await db.get(User, 1)

    comment = Comment(
        content=data.content,
        post=post,
        author=user,
        parent_id=data.parent_id
    )

    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return comment


@blog_route.get("/posts/{post_id}/comments", response_model=list[CommentOut])
async def list_comments(post_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comment).where(Comment.post_id == post_id)
    )
    return result.scalars().all()