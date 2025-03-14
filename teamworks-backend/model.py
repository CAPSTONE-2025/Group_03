from pymongo import MongoClient
import certifi
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get MongoDB URI from .env or use local MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/teamworks_db")

# If using local MongoDB, disable SSL
if "localhost" in MONGO_URI or "127.0.0.1" in MONGO_URI:
    client = MongoClient(MONGO_URI)
else:
    client = MongoClient(MONGO_URI, tls=True, tlsCAFile=certifi.where())

# Select database
db = client["teamworks_db"]
calendar_collection = db["calendar_events"]
backlog_collection = db["backlog_items"]

# Test connection
try:
    client.admin.command("ping")
    print("✅ Connected to MongoDB!")
except Exception as e:
    print(f"❌ MongoDB Connection Failed: {e}")
