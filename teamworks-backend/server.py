from flask import Flask, request, jsonify
from flask_cors import CORS
from model import get_users_collection, get_comments_collection
from model import backlog_collection
import bcrypt
from bson import ObjectId
from datetime import datetime

app = Flask(__name__)
CORS(app)
CORS(app, origins=["http://localhost:3000"])  # CORS for frontend

@app.route('/')
def home():
    return jsonify({"message": "Welcome to Teamworks!"})

# -------------------- BACKLOG ROUTES --------------------

@app.route('/api/backlog', methods=['GET'])
def get_backlog():
    tasks = []
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

@app.route('/api/backlog', methods=['POST'])
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

# ORIGINAL GREEN BLOCK (Do not remove or modify)
# @app.route('/backlog/<task_id>', methods=['PUT'])
# def update_task(task_id):
#     data = request.json
#     task = backlog_collection.find_one({"_id": ObjectId(task_id)})
#     if not task:
#         return jsonify({"error": "Task not found"}), 404

#     update = {}
#     if data.get("title"):
#         update["title"] = data["title"]
#     if data.get("description"):
#         update["description"] = data["description"]
#     if data.get("label"):
#         update["label"] = data["label"]
#     if data.get("status"):
#         update["status"] = data["status"]
#     if data.get("priority"):
#         update["priority"] = data["priority"]
#     if data.get("assignedTo"):
#         update["assignedTo"] = data["assignedTo"]
#     if data.get("dueDate"):
#         update["dueDate"] = data["dueDate"]

#     result = backlog_collection.update_one({"_id": ObjectId(task_id)}, {"$set": update})
#     if result.modified_count == 0:
#         return jsonify({"error": "Task not updated"}), 400
#     return jsonify({"message": "Task updated successfully"})

@app.route('/api/backlog/<task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    if not data:
        return jsonify({"error": "Missing JSON payload"}), 400

    task = backlog_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        return jsonify({"error": "Task not found"}), 404

    allowed_fields = ["title", "description", "label", "status", "priority", "assignedTo", "dueDate"]
    update = {}

    for field in allowed_fields:
        if field in data:
            update[field] = data[field]

    if not update:
        return jsonify({"error": "No valid fields to update"}), 400

    result = backlog_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update}
    )

    if result.modified_count == 0:
        return jsonify({"message": "No changes were made"}), 200

    return jsonify({"message": "Task updated successfully"}), 200

@app.route('/api/backlog/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    result = backlog_collection.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Task not found"}), 404
    return jsonify({"message": "Task deleted successfully"})

# -------------------- USER AUTH ROUTES --------------------

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    app.logger.info(f"Received signup data: {data}")

    if not data.get('firstName') or not data.get('lastName') or not data.get('email') or not data.get('password'):
        app.logger.error("Missing required fields.")
        return jsonify({"error": "All fields are required"}), 400

    try:
        users_collection = get_users_collection()
        existing_user = users_collection.find_one({"email": data['email']})
        if existing_user:
            app.logger.warning("Attempt to create an account with an existing email.")
            return jsonify({"error": "An account with this email already exists."}), 409
        
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        app.logger.info(f"Using collection: {str(get_users_collection())}")

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

@app.route('/api/users/login', methods=['POST'])
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
                "email": user['email']
            }}), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        app.logger.error(f"Error during login: {e}")
        return jsonify({"error": "An error occurred during login."}), 500

# -------------------- COMMENT ROUTES --------------------

@app.route('/api/comments/<task_id>', methods=['GET'])
def get_comments(task_id):
    comments = []
    for comment in get_comments_collection().find({"taskId": task_id}):
        comments.append({
            "id": str(comment["_id"]),
            "taskId": comment["taskId"],
            "author": comment["author"],
            "text": comment["text"],
            "timestamp": comment["timestamp"]
        })
    return jsonify(comments)

@app.route('/api/comments/<task_id>', methods=['POST'])
def post_comment(task_id):
    data = request.json
    if not data.get("author") or not data.get("text"):
        return jsonify({"error": "Missing author or text"}), 400

    comment = {
        "taskId": task_id,
        "author": data["author"],
        "text": data["text"],
        "timestamp": data.get("timestamp", datetime.utcnow().isoformat())
    }
    result = get_comments_collection().insert_one(comment)
    return jsonify({"message": "Comment added", "id": str(result.inserted_id)}), 201

# -------------------- SERVER RUN --------------------
if __name__ == "__main__":
    app.run(debug=True)
