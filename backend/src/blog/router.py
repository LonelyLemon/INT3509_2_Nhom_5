from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from src.auth.models import User
from .models import Post, Comment
from .schemas import PostCreate, PostOut, CommentCreate, CommentOut
from .deps import get_db, get_current_user
from sqlalchemy.orm import selectinload


blog_route = APIRouter(prefix="/blog", tags=["Blog"])


# ---------- POSTS ----------

@blog_route.post("/posts", response_model=PostOut, status_code=201)
async def create_post(
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = Post(title=data.title, content=data.content, author_id=current_user.id)
    db.add(post)
    await db.commit()

    # reload với eager load author
    result = await db.execute(
        select(Post).options(selectinload(Post.author)).where(Post.id == post.id)
    )
    post = result.scalar_one()
    return post

@blog_route.get("/posts", response_model=list[PostOut])
async def list_posts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Post).options(selectinload(Post.author))
    )
    return result.scalars().all()


@blog_route.get("/posts/{post_id}", response_model=PostOut)
async def get_post(post_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Post).options(selectinload(Post.author)).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@blog_route.delete("/posts/{post_id}", status_code=204)
async def delete_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.delete(post)
    await db.commit()


# ---------- COMMENTS ----------

@blog_route.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=201)
async def create_comment(
    post_id: UUID,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),  # fix: bỏ hardcode user
):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # fix: validate parent_id nếu có
    if data.parent_id:
        parent = await db.get(Comment, data.parent_id)
        if not parent or parent.post_id != post_id:
            raise HTTPException(status_code=400, detail="Invalid parent comment")

    comment = Comment(
        content=data.content,
        post_id=post_id,
        author_id=current_user.id,
        parent_id=data.parent_id,
    )
    db.add(comment)
    await db.commit()

    result = await db.execute(
        select(Comment).options(selectinload(Comment.author)).where(Comment.id == comment.id)
    )
    comment = result.scalar_one()
    return comment


@blog_route.get("/posts/{post_id}/comments", response_model=list[CommentOut])
async def list_comments(post_id: UUID, db: AsyncSession = Depends(get_db)):
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")  # fix: thiếu check post tồn tại

    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.post_id == post_id)
    )
    return result.scalars().all()


@blog_route.delete("/posts/{post_id}/comments/{comment_id}", status_code=204)
async def delete_comment(
    post_id: UUID,
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = await db.get(Comment, comment_id)
    if not comment or comment.post_id != post_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Xoá tất cả replies (comment con) trước để tránh FK constraint violation
    await db.execute(
        delete(Comment).where(Comment.parent_id == comment_id)
    )

    await db.delete(comment)
    await db.commit()