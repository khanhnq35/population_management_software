from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.dependencies import get_optional_user
from ..core.security import create_access_token, get_password_hash, verify_password
from ..models.user import User
from ..schemas.auth import LoginRequest, Token
from ..schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)) -> Token:
    user = db.query(User).filter(User.username == data.username).first()
    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    token = create_access_token(subject=user.username)
    return Token(access_token=token)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> UserOut:
    user_count = db.query(User).count()
    if user_count > 0 and (current_user is None or current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can register new users",
        )
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    user = User(
        username=user_in.username,
        full_name=user_in.full_name,
        role=user_in.role,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
