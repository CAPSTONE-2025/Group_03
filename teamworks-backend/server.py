from flask import Flask, request, jsonify
from flask_cors import CORS
from model import calendar_collection , get_users_collection

import bcrypt
from bson import ObjectId

app = Flask(__name__)
CORS(app)

CORS(app, origins=["http://localhost:3000"])

@app.route('/')
def home():
    return jsonify({"message": "Welcome to Teamworks!"})

@app.route('/calendar', methods=['POST'])
def create_event():
    data = request.json
    if not data.get("title") or not data.get("date"):
        return jsonify({"error": "Title and date are required"}), 400

    event = {
        "title": data["title"],
        "date": data["date"],  
        "description": data.get("description", "")
    }
    result = calendar_collection.insert_one(event)
    return jsonify({"message": "Event created", "id": str(result.inserted_id)})

@app.route('/calendar', methods=['GET'])
def get_events():
    events = []
    for event in calendar_collection.find():
        events.append({
            "id": str(event["_id"]),
            "title": event["title"],
            "date": event["date"],
            "description": event.get("description", "")
        })
    return jsonify(events)

@app.route('/calendar/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    result = calendar_collection.delete_one({"_id": ObjectId(event_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Event not found"}), 404
    return jsonify({"message": "Event deleted successfully"})

@app.route('/backlog', methods=['GET'])
def get_backlog():
 return jsonify( [
    {
        "id": 1,
        "title": "Login Page",
        "description": "Implement login functionality",
        "label": "Feature",
        "status": "To Do",
        "priority": "High",
        "assignedTo": "Alice",
        "dueDate": "2025-03-01",
    },
    {
        "id": 2,
        "title": "Dashboard UI",
        "description": "Fix UI bug on dashboard",
        "label": "Bug",
        "status": "In Progress",
        "priority": "Medium",
        "assignedTo": "Bob",
        "dueDate": "2025-03-05",
    },
    {
        "id": 3,
        "title": "Documentation",
        "description": "Update documentation",
        "label": "Task",
        "status": "Done",
        "priority": "Low",
        "assignedTo": "Charlie",
        "dueDate": "2025-03-10",
    },
])

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    app.logger.info(f"Received signup data: {data}")

    # Check if the required fields are provided
    if not data.get('firstName') or not data.get('lastName') or not data.get('email') or not data.get('password'):
        app.logger.error("Missing required fields.")
        return jsonify({"error": "All fields are required"}), 400

    try:
        # Hash the password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())

        # Log the collection info to ensure it works
        app.logger.info(f"Using collection: {str(get_users_collection())}")

        # Store the user in MongoDB
        user = {
            "firstName": data["firstName"],
            "lastName": data["lastName"],
            "email": data["email"],
            "password": hashed_password,
        }
        result = get_users_collection().insert_one(user)
        app.logger.info(f"User created with ID: {result.inserted_id}")

        return jsonify({"message": "User created successfully", "id": str(result.inserted_id)}), 201
    except Exception as e:
        app.logger.error(f"Error during signup: {e}")
        return jsonify({"error": "An error occurred during signup."}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    app.logger.info(f"Received login data: {data}")

    if not data.get('email') or not data.get('password'):
        app.logger.error("Missing email or password.")
        return jsonify({"error": "Email and password are required"}), 400

    try:
        user = get_users_collection().find_one({"email": data['email']})
        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
            return jsonify({"message": "Login successful", "user": {
                "id": str(user['_id']),
                "firstName": user['firstName'],
                "lastName": user['lastName'],
                "email": user['email']
            }}), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        app.logger.error(f"Error during login: {e}")
        return jsonify({"error": "An error occurred during login."}), 500


    
if __name__ == "__main__":
    app.run(debug=True)
