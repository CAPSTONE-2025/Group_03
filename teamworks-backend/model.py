from pymongo import MongoClient
import certifi
from dotenv import load_dotenv
import os


# Load the environment variables from the .env file
load_dotenv()

# Get MongoDB URI from environment variable
uri = os.getenv("MONGO_URI")

# Use certifi to get the proper CA file for SSL
client = MongoClient(
    uri,
    tls=True,  # Use TLS/SSL
    tlsCAFile=certifi.where()  # Provide the path to the CA bundle from certifi
)

# Send a ping to confirm the connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)
