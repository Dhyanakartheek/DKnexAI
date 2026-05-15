"""Auth routes: login and user management."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from db.database import get_db
from db import crud
from api.auth_utils import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "staff"
    skills: str | None = None


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    skills: str | None
    is_active: bool

    class Config:
        from_attributes = True


@router.post("/login")
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await crud.get_user_by_email(db, form.username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = create_access_token({"sub": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": UserOut.model_validate(user)}


@router.post("/register", response_model=UserOut)
async def register(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    existing = await crud.get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = await crud.create_user(db, {
        "name": body.name,
        "email": body.email,
        "hashed_password": hash_password(body.password),
        "role": body.role,
        "skills": body.skills,
    })
    return user


@router.get("/me", response_model=UserOut)
async def me(current_user=Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role == "admin":
        return await crud.get_all_users(db)  # includes inactive
    return await crud.get_users(db)


class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    skills: str | None = None
    is_active: bool | None = None


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    user = await crud.update_user(db, user_id, data)
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot deactivate your own account")
    ok = await crud.deactivate_user(db, user_id)
    if not ok:
        raise HTTPException(404, "User not found")
    return {"message": "User deactivated"}
