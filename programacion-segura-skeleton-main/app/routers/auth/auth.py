from pydantic import BaseModel
from sqlmodel import select, Session
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import User
from app.models.schemas import UserCreate, UserOut, Token
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.database import get_session

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/register", status_code=201)
def register(user: UserCreate, session: Session = Depends(get_session)):
    exists = session.exec(select(User).where(User.username == user.username)).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username already registered")

    exists_email = session.exec(select(User).where(User.email == user.email)).first()
    if exists_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        email=user.email
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    # Devolver en el formato que espera el frontend
    return {
        "success": True,
        "user_id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
        "role": db_user.role
    }
    



@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    db_user = session.exec(select(User).where(User.username == form_data.username)).first()
    if not db_user or not verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": db_user.username, "role": db_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": db_user.username,
        "email": db_user.email,
        "role": db_user.role
    }
