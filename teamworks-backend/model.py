# model.py
from pymongo import MongoClient
import certifi
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Get MongoDB URI from .env or fallback to localhost
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/teamworks_db")

# Connect to MongoDB with or without SSL depending on URI
if "localhost" in MONGO_URI or "127.0.0.1" in MONGO_URI:
    client = MongoClient(MONGO_URI)
else:
    client = MongoClient(MONGO_URI, tls=True, tlsCAFile=certifi.where())

# Access database and collections
db = client["teamworks_db"]

projects_collection = db["projects"]
backlog_collection = db["backlog_items"]
users_collection = db["users"]
comments_collection = db["task_comments"]


# Getter functions
def get_projects_collection():
    return projects_collection

def get_users_collection():
    return users_collection

def get_comments_collection():
    return comments_collection

def get_notifications_collection():
    return db["notifications"]

# Test connection
try:
    client.admin.command("ping")
    print("✅ Connected to MongoDB!")
except Exception as e:
    print(f"❌ MongoDB Connection Failed: {e}")
