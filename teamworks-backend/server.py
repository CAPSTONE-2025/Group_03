from flask import Flask, request, jsonify
from flask_cors import CORS
from model import get_users_collection

import bcrypt
from bson import ObjectId
from model import backlog_collection

app = Flask(__name__)
CORS(app)

CORS(app, origins=["http://localhost:3000"])

@app.route('/')
def home():
    return jsonify({"message": "Welcome to Teamworks!"})
 
 
@app.route('/backlog', methods=['GET'])
def get_backlog():
    tasks= []
    for task in backlog_collection.find():
        tasks.append({
            "id": str(task["_id"]),
            "title": task["title"],
            "description": task["description"],
            "label": task["label"],
            "status": task["status"],
            "priority": task["priority"],
            "assignedTo": task["assignedTo"],
            "dueDate": task["dueDate"]
        })
    return jsonify(tasks)


@app.route('/backlog', methods=['POST'])
def create_backlog():
    data = request.json
    required_fields = ["title", "description", "label", "status", "priority", "assignedTo", "dueDate"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    task = {
        "title": data["title"],
        "description": data["description"],
        "label": data["label"],
        "status": data["status"],
        "priority": data["priority"],
        "assignedTo": data["assignedTo"],
        "dueDate": data["dueDate"]
    }
    result = backlog_collection.insert_one(task)
    return jsonify({"message": "Task created", "id": str(result.inserted_id)}), 201


@app.route('/backlog/<task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    task = backlog_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        return jsonify({"error": "Task not found"}), 404

    update = {}
    if data.get("title"):
        update["title"] = data["title"]
    if data.get("description"):
        update["description"] = data["description"]
    if data.get("label"):
        update["label"] = data["label"]
    if data.get("status"):
        update["status"] = data["status"]
    if data.get("priority"):
        update["priority"] = data["priority"]
    if data.get("assignedTo"):
        update["assignedTo"] = data["assignedTo"]
    if data.get("dueDate"):
        update["dueDate"] = data["dueDate"]

    result = backlog_collection.update_one({"_id": ObjectId(task_id)}, {"$set": update})
    if result.modified_count == 0:
        return jsonify({"error": "Task not updated"}), 400
    return jsonify({"message": "Task updated successfully"})


@app.route('/backlog/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    result = backlog_collection.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Task not found"}), 404
    return jsonify({"message": "Task deleted successfully"})

@app.route('/users', methods=['POST'])
def create_user():
    data = request.json
    app.logger.info(f"Received signup data: {data}")

    # Check if the required fields are provided
    if not data.get('firstName') or not data.get('lastName') or not data.get('email') or not data.get('password'):
        app.logger.error("Missing required fields.")
        return jsonify({"error": "All fields are required"}), 400

    try:
        users_collection = get_users_collection()

        # Check if a user with the given email already exists
        existing_user = users_collection.find_one({"email": data['email']})
        if existing_user:
            app.logger.warning("Attempt to create an account with an existing email.")
            return jsonify({"error": "An account with this email already exists."}), 409
        
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


@app.route('/users/login', methods=['POST'])
def login_user():
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
                "email": user['email'],
                "bio": user.get('bio', '')
            }}), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        app.logger.error(f"Error during login: {e}")
        return jsonify({"error": "An error occurred during login."}), 500


@app.route('/users/<user_id>', methods=['PUT'])
def update_user_profile(user_id):
    data = request.json
    app.logger.info(f"Received profile update data for user {user_id}: {data}")

    # Check if the required fields are provided
    if not data.get('firstName') or not data.get('lastName') or not data.get('email'):
        app.logger.error("Missing required fields.")
        return jsonify({"error": "First name, last name, and email are required"}), 400

    try:
        users_collection = get_users_collection()
        
        # Check if user exists
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            app.logger.error(f"User with ID {user_id} not found.")
            return jsonify({"error": "User not found"}), 404

        # Check if email is being changed and if the new email already exists
        if data['email'] != user['email']:
            existing_user = users_collection.find_one({"email": data['email']})
            if existing_user:
                app.logger.warning("Attempt to update email to an existing email.")
                return jsonify({"error": "An account with this email already exists."}), 409

        # Update the user profile
        update_data = {
            "firstName": data["firstName"],
            "lastName": data["lastName"],
            "email": data["email"]
        }
        
        # Add bio if provided
        if data.get("bio"):
            update_data["bio"] = data["bio"]

        result = users_collection.update_one(
            {"_id": ObjectId(user_id)}, 
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            app.logger.warning("No changes were made to the user profile.")
            return jsonify({"error": "No changes were made"}), 400

        app.logger.info(f"User profile updated successfully for user {user_id}")
        return jsonify({"message": "Profile updated successfully", "user": {
            "id": user_id,
            "firstName": data["firstName"],
            "lastName": data["lastName"],
            "email": data["email"],
            "bio": data.get("bio", "")
        }}), 200

    except Exception as e:
        app.logger.error(f"Error during profile update: {e}")
        return jsonify({"error": "An error occurred during profile update."}), 500


    
if __name__ == "__main__":
    app.run(debug=True, port=5001)
