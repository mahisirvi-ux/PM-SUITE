from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
import uuid
import os
# Import your database session and models
from database import get_db
from models import DBUsers, UserCreate 

router = APIRouter()

# ==========================================
# SECURITY CONFIGURATION
# ==========================================
# IMPORTANT: In a real production app, move this SECRET_KEY to a .env file!
SECRET_KEY =  os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # Wristband expires in 7 days



# ==========================================
# HELPER SCHEMAS
# ==========================================
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# ==========================================
# CORE SECURITY FUNCTIONS
# ==========================================
def verify_password(plain_password: str, hashed_password: str):
    """Compares a typed password against the scrambled DB password"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )

def get_password_hash(password):
    """Scrambles a new password before saving to DB"""
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Generates the JWT VIP Wristband"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
        
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@router.post("/signup", response_model=Token)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    
    db_user = db.query(DBUsers).filter(DBUsers.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    
    hashed_pw = get_password_hash(user.password)
    new_user = DBUsers(
        id=str(uuid.uuid4())[:8],
        email=user.email,
        name=user.name,
        password=hashed_pw,
        role="member" # Default role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 3. Generate a token so they are instantly logged in after signing up
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email, "role": new_user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login_for_access_token(user: UserLogin, db: Session = Depends(get_db)):
    # 1. Find the user in the database
    db_user = db.query(DBUsers).filter(DBUsers.email == user.email).first()
    if not db_user:
        # Security Best Practice: Never tell the user if the email or the password was wrong. Just say "Invalid".
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    # 2. Verify the password matches
    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    # 3. Create and return the token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email, "role": db_user.role, "id": db_user.id}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ==========================================
# THE "LOCK" (JWT Dependency)
# ==========================================
# This tells FastAPI where the frontend gets its tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    This function intercepts requests, reads the token, 
    and returns the logged-in user's database record.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the VIP Wristband
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        # Fails if the token is expired, tampered with, or invalid
        raise credentials_exception
        
    # Find the user in the DB to ensure they haven't been deleted
    user = db.query(DBUsers).filter(DBUsers.email == email).first()
    if user is None:
        raise credentials_exception
        
    return user