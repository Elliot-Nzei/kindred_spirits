from fastapi import FastAPI, Depends, HTTPException, status, Form, UploadFile, File
from pydantic import BaseModel, EmailStr, Field
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Boolean, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, List
import os
import shutil
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

# --- JWT Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-" + os.urandom(24).hex())
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# --- Database Configuration ---
DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

# --- Utility Functions ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Database Models ---
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    profile_picture = Column(String, nullable=True)
    location = Column(String, nullable=True)
    website = Column(String, nullable=True)
    joined_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Relationships
    posts = relationship("Post", back_populates="owner", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="owner", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="owner", cascade="all, delete-orphan")
    
    # Follow relationships
    followers = relationship(
        "Follow",
        foreign_keys="Follow.followed_id",
        back_populates="followed",
        cascade="all, delete-orphan"
    )
    following = relationship(
        "Follow",
        foreign_keys="Follow.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan"
    )
    
    # Notification relationships
    received_notifications = relationship(
        "Notification",
        foreign_keys="Notification.recipient_id",
        back_populates="recipient",
        cascade="all, delete-orphan"
    )
    sent_notifications = relationship(
        "Notification",
        foreign_keys="Notification.sender_id",
        back_populates="sender",
        cascade="all, delete-orphan"
    )

class Follow(Base):
    __tablename__ = "follows"
    
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"))
    followed_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    followed = relationship("User", foreign_keys=[followed_id], back_populates="followers")

class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    image_url = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_published = Column(Boolean, default=True)
    view_count = Column(Integer, default=0)
    
    owner = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"))
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    owner = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")
    replies = relationship("Comment", backref="parent", remote_side=[id])

class Like(Base):
    __tablename__ = "likes"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"))
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    type = Column(String)  # like, comment, follow, mention, etc.
    message = Column(Text)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    link = Column(String, nullable=True)
    
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_notifications")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_notifications")
    post = relationship("Post", back_populates="notifications")

# Create database tables
Base.metadata.create_all(bind=engine)

# --- Pydantic Models ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    email: str
    profile_picture: Optional[str]

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    email: Optional[EmailStr] = None

class UserResponse(UserBase):
    id: int
    bio: Optional[str]
    profile_picture: Optional[str]
    location: Optional[str]
    website: Optional[str]
    joined_date: datetime
    is_verified: bool
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    
    class Config:
        from_attributes = True

class UserProfile(UserResponse):
    is_following: bool = False
    
    class Config:
        from_attributes = True

class PostBase(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None

class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    owner_username: str
    owner_profile_picture: str | None = None

    @classmethod
    def from_orm_with_owner(cls, post):
        return cls(
            id=post.id,
            title=post.title,
            content=post.content,
            owner_username=post.owner.username if post.owner else "",
            owner_profile_picture=post.owner.profile_picture if post.owner else None,
        )

    class Config:
        orm_mode = True

class CommentBase(BaseModel):
    text: str
    parent_id: Optional[int] = None

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: int
    owner_id: int
    owner_username: str
    owner_profile_picture: Optional[str]
    post_id: int
    created_at: datetime
    updated_at: datetime
    replies_count: int = 0
    
    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    sender_username: Optional[str]
    sender_profile_picture: Optional[str]
    type: str
    message: str
    post_id: Optional[int]
    read: bool
    timestamp: datetime
    link: Optional[str]
    
    class Config:
        from_attributes = True

# --- Authentication Dependencies ---
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        return await get_current_user(token, db)
    except:
        return None

# --- FastAPI App Setup ---
app = FastAPI(title="Social Platform API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/profiles", exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/posts", exist_ok=True)

# --- Authentication Routes ---
@app.post("/api/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if username or email already exists
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=db_user.id,
        username=db_user.username,
        email=db_user.email,
        profile_picture=db_user.profile_picture
    )

@app.post("/api/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Authenticate user
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        email=user.email,
        profile_picture=user.profile_picture
    )

# --- User Profile Routes ---
@app.get("/api/users/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    response = UserResponse.from_orm(current_user)
    response.followers_count = db.query(Follow).filter(Follow.followed_id == current_user.id).count()
    response.following_count = db.query(Follow).filter(Follow.follower_id == current_user.id).count()
    response.posts_count = db.query(Post).filter(Post.owner_id == current_user.id).count()
    return response

@app.get("/api/users/{username}", response_model=UserProfile)
async def get_user_profile(
    username: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    response = UserProfile.from_orm(user)
    response.followers_count = db.query(Follow).filter(Follow.followed_id == user.id).count()
    response.following_count = db.query(Follow).filter(Follow.follower_id == user.id).count()
    response.posts_count = db.query(Post).filter(Post.owner_id == user.id).count()
    
    if current_user:
        response.is_following = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.followed_id == user.id
        ).first() is not None
    
    return response

@app.put("/api/users/me", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Update user fields
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    response = UserResponse.from_orm(current_user)
    response.followers_count = db.query(Follow).filter(Follow.followed_id == current_user.id).count()
    response.following_count = db.query(Follow).filter(Follow.follower_id == current_user.id).count()
    response.posts_count = db.query(Post).filter(Post.owner_id == current_user.id).count()
    return response

@app.post("/api/users/me/upload-profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save file
    file_extension = file.filename.split(".")[-1]
    file_name = f"{current_user.id}_{datetime.utcnow().timestamp()}.{file_extension}"
    file_path = f"{UPLOAD_DIR}/profiles/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update user profile picture
    current_user.profile_picture = f"/uploads/profiles/{file_name}"
    db.commit()
    
    return {"profile_picture": current_user.profile_picture}

# --- Follow/Unfollow Routes ---
@app.post("/api/users/{username}/follow")
async def follow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_to_follow = db.query(User).filter(User.username == username).first()
    if not user_to_follow:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_to_follow.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if already following
    existing_follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.followed_id == user_to_follow.id
    ).first()
    
    if existing_follow:
        raise HTTPException(status_code=400, detail="Already following this user")
    
    # Create follow relationship
    follow = Follow(follower_id=current_user.id, followed_id=user_to_follow.id)
    db.add(follow)
    
    # Create notification
    notification = Notification(
        recipient_id=user_to_follow.id,
        sender_id=current_user.id,
        type="follow",
        message=f"{current_user.username} started following you",
        link=f"/pages/profile.html?user={current_user.username}"
    )
    db.add(notification)
    db.commit()
    
    return {"message": "Successfully followed user"}

@app.delete("/api/users/{username}/unfollow")
async def unfollow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_to_unfollow = db.query(User).filter(User.username == username).first()
    if not user_to_unfollow:
        raise HTTPException(status_code=404, detail="User not found")
    
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.followed_id == user_to_unfollow.id
    ).first()
    
    if not follow:
        raise HTTPException(status_code=400, detail="Not following this user")
    
    db.delete(follow)
    db.commit()
    
    return {"message": "Successfully unfollowed user"}

# --- Post Routes ---
@app.post("/api/posts", response_model=PostResponse)
async def create_post(
    post: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_post = Post(**post.dict(), owner_id=current_user.id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    response = PostResponse.from_orm_with_owner(db_post)
    response.likes_count = 0
    response.comments_count = 0
    response.is_liked = False
    
    return response

@app.get("/api/posts", response_model=List[PostResponse])
async def get_posts(
    skip: int = 0,
    limit: int = 20,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    posts = db.query(Post).filter(Post.is_published == True).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    
    response = []
    for post in posts:
        post_response = PostResponse.from_orm_with_owner(post)
        post_response.likes_count = db.query(Like).filter(Like.post_id == post.id).count()
        post_response.comments_count = db.query(Comment).filter(Comment.post_id == post.id).count()
        
        if current_user:
            post_response.is_liked = db.query(Like).filter(
                Like.post_id == post.id,
                Like.owner_id == current_user.id
            ).first() is not None
        
        response.append(post_response)
    
    return response

@app.get("/api/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Increment view count
    post.view_count += 1
    db.commit()
    
    response = PostResponse.from_orm_with_owner(post)
    response.likes_count = db.query(Like).filter(Like.post_id == post.id).count()
    response.comments_count = db.query(Comment).filter(Comment.post_id == post.id).count()
    
    if current_user:
        response.is_liked = db.query(Like).filter(
            Like.post_id == post.id,
            Like.owner_id == current_user.id
        ).first() is not None
    
    return response

@app.get("/api/users/{username}/posts", response_model=List[PostResponse])
async def get_user_posts(
    username: str,
    skip: int = 0,
    limit: int = 20,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    posts = db.query(Post).filter(
        Post.owner_id == user.id,
        Post.is_published == True
    ).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    
    response = []
    for post in posts:
        post_response = PostResponse.from_orm_with_owner(post)
        post_response.likes_count = db.query(Like).filter(Like.post_id == post.id).count()
        post_response.comments_count = db.query(Comment).filter(Comment.post_id == post.id).count()
        
        if current_user:
            post_response.is_liked = db.query(Like).filter(
                Like.post_id == post.id,
                Like.owner_id == current_user.id
            ).first() is not None
        
        response.append(post_response)
    
    return response

@app.put("/api/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    post_update: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this post")
    
    # Update post fields
    for field, value in post_update.dict(exclude_unset=True).items():
        setattr(post, field, value)
    
    post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    
    response = PostResponse.from_orm_with_owner(post)
    response.likes_count = db.query(Like).filter(Like.post_id == post.id).count()
    response.comments_count = db.query(Comment).filter(Comment.post_id == post.id).count()
    response.is_liked = db.query(Like).filter(
        Like.post_id == post.id,
        Like.owner_id == current_user.id
    ).first() is not None
    
    return response

@app.delete("/api/posts/{post_id}")
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    
    db.delete(post)
    db.commit()
    
    return {"message": "Post deleted successfully"}

# --- Like Routes ---
@app.post("/api/posts/{post_id}/like")
async def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already liked
    existing_like = db.query(Like).filter(
        Like.post_id == post_id,
        Like.owner_id == current_user.id
    ).first()
    
    if existing_like:
        raise HTTPException(status_code=400, detail="Already liked this post")
    
    # Create like
    like = Like(owner_id=current_user.id, post_id=post_id)
    db.add(like)
    
    # Create notification (if not liking own post)
    if post.owner_id != current_user.id:
        notification = Notification(
            recipient_id=post.owner_id,
            sender_id=current_user.id,
            type="like",
            message=f"{current_user.username} liked your post",
            post_id=post_id,
            link=f"/pages/post.html?id={post_id}"
        )
        db.add(notification)
    
    db.commit()
    
    likes_count = db.query(Like).filter(Like.post_id == post_id).count()
    return {"message": "Post liked", "likes_count": likes_count}

@app.delete("/api/posts/{post_id}/unlike")
async def unlike_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    like = db.query(Like).filter(
        Like.post_id == post_id,
        Like.owner_id == current_user.id
    ).first()
    
    if not like:
        raise HTTPException(status_code=400, detail="Post not liked")
    
    db.delete(like)
    db.commit()
    
    likes_count = db.query(Like).filter(Like.post_id == post_id).count()
    return {"message": "Post unliked", "likes_count": likes_count}

# --- Comment Routes ---
@app.post("/api/posts/{post_id}/comments", response_model=CommentResponse)
async def create_comment(
    post_id: int,
    comment: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Create comment
    db_comment = Comment(
        text=comment.text,
        parent_id=comment.parent_id,
        owner_id=current_user.id,
        post_id=post_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    # Create notification (if not commenting on own post)
    if post.owner_id != current_user.id:
        notification = Notification(
            recipient_id=post.owner_id,
            sender_id=current_user.id,
            type="comment",
            message=f"{current_user.username} commented on your post",
            post_id=post_id,
            link=f"/pages/post.html?id={post_id}"
        )
        db.add(notification)
        db.commit()
    
    response = CommentResponse.from_orm(db_comment)
    response.owner_username = current_user.username
    response.owner_profile_picture = current_user.profile_picture
    response.replies_count = 0
    
    return response

@app.get("/api/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    post_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    comments = db.query(Comment).filter(
        Comment.post_id == post_id,
        Comment.parent_id == None
    ).order_by(Comment.created_at.desc()).offset(skip).limit(limit).all()
    
    response = []
    for comment in comments:
        comment_response = CommentResponse.from_orm(comment)
        comment_response.owner_username = comment.owner.username
        comment_response.owner_profile_picture = comment.owner.profile_picture
        comment_response.replies_count = db.query(Comment).filter(Comment.parent_id == comment.id).count()
        response.append(comment_response)
    
    return response

@app.delete("/api/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    db.delete(comment)
    db.commit()
    
    return {"message": "Comment deleted successfully"}

# --- Notification Routes ---
@app.get("/api/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    skip: int = 0,
    limit: int = 20,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(Notification.recipient_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.read == False)
    
    notifications = query.order_by(Notification.timestamp.desc()).offset(skip).limit(limit).all()
    
    response = []
    for notification in notifications:
        notif_response = NotificationResponse.from_orm(notification)
        if notification.sender:
            notif_response.sender_username = notification.sender.username
            notif_response.sender_profile_picture = notification.sender.profile_picture
        response.append(notif_response)
    
    return response

@app.get("/api/notifications/unread-count")
async def get_unread_notifications_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.read == False
    ).count()
    
    return {"unread_count": count}

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read = True
    db.commit()
    
    return {"message": "Notification marked as read"}

@app.put("/api/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.read == False
    ).update({"read": True})
    db.commit()
    
    return {"message": "All notifications marked as read"}

# --- Feed Routes ---
@app.get("/api/feed", response_model=List[PostResponse])
async def get_feed(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get posts from users the current user follows
    following_ids = db.query(Follow.followed_id).filter(Follow.follower_id == current_user.id).subquery()
    
    posts = db.query(Post).filter(
        (Post.owner_id.in_(following_ids)) | (Post.owner_id == current_user.id),
        Post.is_published == True
    ).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    
    response = []
    for post in posts:
        post_response = PostResponse.from_orm_with_owner(post)
        post_response.likes_count = db.query(Like).filter(Like.post_id == post.id).count()
        post_response.comments_count = db.query(Comment).filter(Comment.post_id == post.id).count()
        post_response.is_liked = db.query(Like).filter(
            Like.post_id == post.id,
            Like.owner_id == current_user.id
        ).first() is not None
        
        response.append(post_response)
    
    return response

# --- Search Routes ---
@app.get("/api/search/users", response_model=List[UserResponse])
async def search_users(
    q: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(
        (User.username.contains(q)) | 
        (User.full_name.contains(q)) |
        (User.bio.contains(q))
    ).offset(skip).limit(limit).all()
    
    response = []
    for user in users:
        user_response = UserResponse.from_orm(user)
        user_response.followers_count = db.query(Follow).filter(Follow.followed_id == user.id).count()
        user_response.following_count = db.query(Follow).filter(Follow.follower_id == user.id).count()
        user_response.posts_count = db.query(Post).filter(Post.owner_id == user.id).count()
        response.append(user_response)
    
    return response

@app.get("/api/search/posts", response_model=List[PostResponse])
async def search_posts(
    q: str,
    skip: int = 0,
    limit: int = 20,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    posts = db.query(Post).filter(
        (Post.title.contains(q)) | (Post.content.contains(q)),
        Post.is_published == True
    ).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    
    response = []
    for post in posts:
        post_response = PostResponse.from_orm_with_owner(post)
        post_response.likes_count = db.query(Like).filter(Like.post_id == post.id).count()
        post_response.comments_count = db.query(Comment).filter(Comment.post_id == post.id).count()
        
        if current_user:
            post_response.is_liked = db.query(Like).filter(
                Like.post_id == post.id,
                Like.owner_id == current_user.id
            ).first() is not None
        
        response.append(post_response)
    
    return response

# --- Statistics Routes ---
@app.get("/api/stats/overview")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_posts = db.query(Post).filter(Post.owner_id == current_user.id).count()
    user_post_ids = db.query(Post.id).filter(Post.owner_id == current_user.id).subquery()
    total_likes = db.query(Like).filter(Like.post_id.in_(user_post_ids)).count()
    total_comments = db.query(Comment).filter(Comment.post_id.in_(user_post_ids)).count()
    total_followers = db.query(Follow).filter(Follow.followed_id == current_user.id).count()
    total_following = db.query(Follow).filter(Follow.follower_id == current_user.id).count()
    
    # Get total views across all posts
    total_views = db.query(Post).filter(Post.owner_id == current_user.id).with_entities(
        db.func.sum(Post.view_count)
    ).scalar() or 0
    
    return {
        "total_posts": total_posts,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_followers": total_followers,
        "total_following": total_following,
        "total_views": total_views
    }

# --- Serve Static Files ---
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")
app.mount("/img", StaticFiles(directory="img"), name="img")
app.mount("/pages", StaticFiles(directory="pages"), name="pages")
app.mount("/public", StaticFiles(directory="public"), name="public")
app.mount("/data", StaticFiles(directory="data"), name="data")

# --- Root Routes ---
@app.get("/")
async def read_root():
    return FileResponse("index.html")

@app.get("/index.html")
async def read_index():
    return FileResponse("index.html")

# --- Health Check ---
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)