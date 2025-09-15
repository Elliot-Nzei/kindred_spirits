from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import Base, User, get_password_hash
import os

# --- Database Configuration ---
DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_master_user():
    db = SessionLocal()
    try:
        # Check if master user already exists
        master_user = db.query(User).filter(User.username == "master").first()
        
        if master_user:
            print("Master user already exists.")
            # Optionally update password if needed
            # master_user.hashed_password = get_password_hash("p@$&w0rd")
            # db.commit()
            # print("Master user password updated.")
        else:
            print("Creating master user...")
            hashed_password = get_password_hash("p@$&w0rd")
            db_user = User(
                username="master",
                email="master@example.com", # You can change this email
                hashed_password=hashed_password,
                full_name="Master Admin",
                is_master=True
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            print(f"Master user '{db_user.username}' created successfully!")
    except Exception as e:
        print(f"Error creating master user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_master_user()