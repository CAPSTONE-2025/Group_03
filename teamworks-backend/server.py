from flask import Flask, request, jsonify
from flask_cors import CORS
from model import get_users_collection, get_comments_collection, get_projects_collection
from model import backlog_collection
import bcrypt
from bson import ObjectId
from datetime import datetime
from functools import wraps

app = Flask(__name__)
CORS(app)
CORS(app, origins=["http://localhost:3000"])  # CORS for frontend

@app.route('/')
def home():
    return jsonify({"message": "Welcome to Teamworks!"})


# -------------------- PROJECT ROUTES --------------------
@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.json
    project = {
        "name": data["name"],
        "description": data.get("description", ""),
        "createdBy": ObjectId(data["createdBy"]),
        "owner": ObjectId(data["createdBy"]),  
        "members": [ObjectId(data["createdBy"])],
        "pendingInvites": [],
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
    }
    result = get_projects_collection().insert_one(project)
    return jsonify({"message": "Project created", "id": str(result.inserted_id)}), 201 


@app.route('/api/projects/<user_id>', methods=['GET'])
def list_user_projects(user_id):
    projects = []
    for p in get_projects_collection().find({"members": ObjectId(user_id)}):
        projects.append({
            "id": str(p["_id"]),
            "name": p["name"],
            "description": p.get("description", ""),
            "createdBy": str(p["createdBy"]),
            "owner": str(p["owner"]) if p.get("owner") else None, 
            "members": [str(member) for member in p["members"]],
            "createdAt": p["createdAt"].isoformat() if isinstance(p["createdAt"], datetime) else str(p["createdAt"]),
            "updatedAt": p["updatedAt"].isoformat() if isinstance(p["updatedAt"], datetime) else str(p["updatedAt"]),
        })
    return jsonify(projects)

@app.route('/api/project/<project_id>', methods=['GET'])
def get_project(project_id):
    p = get_projects_collection().find_one({"_id": ObjectId(project_id)})
    if not p:
        return jsonify({"error": "Project not found"}), 404
    return jsonify({
        "id": str(p["_id"]),
        "name": p.get("name", ""),
        "description": p.get("description", ""),
        "createdBy": str(p.get("createdBy")) if p.get("createdBy") else None,
        "owner": str(p.get("owner")) if p.get("owner") else None,
        "members": [str(m) for m in p.get("members", [])],
    })

# -------------------- Owner/auth helpers--------------------
def get_request_user_id():
    uid = request.headers.get("X-User-Id")
    try:
        return ObjectId(uid) if uid else None
    except Exception:
        return None


def require_project_owner(fn):
    @wraps(fn)
    def wrapper(project_id, *args, **kwargs):
        user_id = get_request_user_id()
        if not user_id:
            return jsonify({"error": "Missing X-User-Id header"}), 401
        proj = get_projects_collection().find_one(
            {"_id": ObjectId(project_id)}, { "owner": 1}
        )
        if not proj:
            return jsonify({"error": "Project not found"}), 404
        if str(proj.get("owner")) != str(user_id):
            return jsonify({"error": "Only the project owner can invite"}), 403
        request._request_user_id = user_id
        return fn(project_id, *args, **kwargs)

    return wrapper


# -------------------- PROJECT INVITE ---------------------
# @app.route('/api/projects/<project_id>/invite', methods=['POST'])
# def invite_member(project_id):
#     data = request.json
#     user_id = data.get("userId")  # user being invited
#     if not user_id:
#         return jsonify({"error": "userId is required"}), 400

#     result = get_projects_collection().update_one(
#         {"_id": ObjectId(project_id)},
#         {"$addToSet": {"members": ObjectId(user_id)}}  # prevents duplicates
#     )

#     if result.modified_count == 0:
#         return jsonify({"error": "Project not found or user already a member"}), 404

#     return jsonify({"message": "User invited successfully"}), 200

@app.route('/api/projects/<project_id>/invite', methods=['POST'])
@require_project_owner
def invite_members(project_id):
    data = request.json or {}
    emails = data.get("emails", [])
    if not isinstance(emails, list) or not emails:
        return jsonify({"error": "Provide emails as a non-empty array"}), 400

    # normalize + dedupe
    normalized = list({(e or "").strip().lower() for e in emails if isinstance(e, str) and e.strip()})
    if not normalized:
        return jsonify({"error": "No valid emails provided"}), 400

    projects = get_projects_collection()
    proj = projects.find_one({"_id": ObjectId(project_id)}, {"pendingInvites": 1})
    if not proj:
        return jsonify({"error": "Project not found"}), 404

    # prevent duplicates
    already = { (pi.get("email") or "").lower() for pi in proj.get("pendingInvites", []) }
    new_pending = []
    for email in normalized:
        if email not in already:
            new_pending.append({
                "email": email,
                "status": "pending",
                "invitedBy": request._request_user_id,
                "invitedAt": datetime.utcnow()
            })

    if new_pending:
        projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$push": {"pendingInvites": {"$each": new_pending}},
             "$set": {"updatedAt": datetime.utcnow()}}
        )

    # return fresh pending list
    proj2 = projects.find_one({"_id": ObjectId(project_id)}, {"pendingInvites": 1})
    pending_serialized = [
        {
            "email": pi.get("email"),
            "status": pi.get("status", "pending"),
            "invitedBy": str(pi.get("invitedBy")) if pi.get("invitedBy") else None,
            "invitedAt": pi.get("invitedAt").isoformat() if isinstance(pi.get("invitedAt"), datetime) else str(pi.get("invitedAt", "")),
        }
        for pi in proj2.get("pendingInvites", [])
    ]
    return jsonify({"pendingInvites": pending_serialized}), 200


# -------------------- CHANGE PROJECT NAME ------------------
@app.route("/api/projects/<project_id>/name", methods=["PUT"])
@require_project_owner
def change_name(project_id):
    data = request.json
    new_project_name = data.get("projectName")  # get new project name
    if not new_project_name:
        return jsonify({"error": "projectName is required"}), 400

    try:
        result = get_projects_collection().update_one(
            {"_id": ObjectId(project_id), "name": {"$exists": True}},
            {"$set": {"name": new_project_name}},  # set new project name
        )
    except Exception:
        return jsonify({"error": "Invalid project ID"}), 404

    if result.modified_count == 0:
        return jsonify({"error": "Project name already set"}), 304  # 304 (Not Modified)

    return jsonify({"message": "Project name updated"}), 200


# -------------------- CHANGE PROJECT OWNER ------------------
@app.route("/api/projects/<project_id>/owner", methods=["PUT"])
@require_project_owner
def change_owner(project_id):
    data = request.json
    # get new project name from front-end form field, not through url params
    new_owner_email = data.get("ownerEmail") 
    if not new_owner_email:
        return jsonify({"error": "owner is required"}), 400

    try:
        user = get_users_collection().find_one(
            {"email": new_owner_email},          
        )
    except Exception:
        return jsonify({"error": "User not found"}), 404

    try:
        result = get_projects_collection().update_one(
            {"_id": ObjectId(project_id)},
            {
                "$set": {
                    "owner": ObjectId(user["_id"]),
                    "ownerEmail": new_owner_email,
                },  # set new owner
                "$addToSet": {"members": ObjectId(user["_id"])},
            },
        )
    except Exception:
        return jsonify({"error": "Cannot update owner with new owner"}), 404

    if result.modified_count == 0:
        return jsonify({"error": "Owner already owns project"}), 304  # 304 (Not Modified)

    return jsonify({"message": "Project owner updated"}), 200


# -------------------- DELETE PROJECT --------------------
@app.route("/api/projects/<project_id>", methods=["DELETE"])
@require_project_owner
def delete_project(project_id):

    try:
        result = get_projects_collection().delete_one(
            {"_id": ObjectId(project_id)},  # set new project name
        )
    except Exception:
        return jsonify({"error": "Invalid project ID"}), 400

    if result.deleted_count == 0:
        return jsonify({"error": "Project not found"}), 404

    return jsonify({"message": "Project deleted"}), 200


# -------------------- BACKLOG ROUTES --------------------

# @app.route('/api/backlog', methods=['GET'])
# def get_backlog():
#     tasks = []
#     for task in backlog_collection.find():
#         tasks.append({
#             "id": str(task["_id"]),
#             "title": task["title"],
#             "description": task["description"],
#             "label": task["label"],
#             "status": task["status"],
#             "priority": task["priority"],
#             "assignedTo": task["assignedTo"],
#             "dueDate": task["dueDate"]
#         })
#     return jsonify(tasks)


@app.route('/api/projects/<project_id>/backlog', methods=['GET'])
def get_project_backlog(project_id):
    tasks = []
    for task in backlog_collection.find({"projectId": ObjectId(project_id)}):
        tasks.append({
            "id": str(task["_id"]),
            "title": task["title"],
            "description": task["description"],
            "label": task["label"],
            "status": task["status"],
            "priority": task["priority"],
            "assignedTo": task["assignedTo"],
            "dueDate": task["dueDate"],
            "projectId": str(task["projectId"]),
        })
    return jsonify(tasks)


# @app.route('/api/backlog', methods=['POST'])
# def create_backlog():
#     data = request.json
#     required_fields = ["title", "description", "label", "status", "priority", "assignedTo", "dueDate"]
#     for field in required_fields:
#         if field not in data:
#             return jsonify({"error": f"{field} is required"}), 400

#     task = {
#         "title": data["title"],
#         "description": data["description"],
#         "label": data["label"],
#         "status": data["status"],
#         "priority": data["priority"],
#         "assignedTo": data["assignedTo"],
#         "dueDate": data["dueDate"]
#     }
#     result = backlog_collection.insert_one(task)
#     return jsonify({"message": "Task created", "id": str(result.inserted_id)}), 201


@app.route('/api/projects/<project_id>/backlog', methods=['POST'])
def create_project_backlog(project_id):
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
        "dueDate": data["dueDate"],
        "projectId": ObjectId(project_id),
    }
    result = backlog_collection.insert_one(task)
    return jsonify({"message": "Task created", "id": str(result.inserted_id)}), 201


@app.route("/api/projects/<project_id>/backlog/<task_id>", methods=["PUT"])
def update_task(project_id, task_id):
    data = request.json
    task = backlog_collection.find_one(
        {"_id": ObjectId(task_id), "projectId": ObjectId(project_id)}
    )
    if not task:
        return jsonify({"error": "Task not found"}), 404

    allowed_fields = [
        "title",
        "description",
        "label",
        "status",
        "priority",
        "assignedTo",
        "dueDate",
    ]
    update = {field: data[field] for field in allowed_fields if field in data}

    if not update:
        return jsonify({"error": "No valid fields to update"}), 400

    backlog_collection.update_one({"_id": ObjectId(task_id)}, {"$set": update})
    return jsonify({"message": "Task updated successfully"})


@app.route("/api/projects/<project_id>/backlog/<task_id>", methods=["DELETE"])
def delete_task(project_id, task_id):
    result = backlog_collection.delete_one(
        {"_id": ObjectId(task_id), "projectId": ObjectId(project_id)}
    )
    if result.deleted_count == 0:
        return jsonify({"error": "Task not found"}), 404
    return jsonify({"message": "Task deleted successfully"})


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

# @app.route('/api/backlog/<task_id>', methods=['PUT'])
# def update_task(task_id):
#     data = request.json
#     if not data:
#         return jsonify({"error": "Missing JSON payload"}), 400

#     task = backlog_collection.find_one({"_id": ObjectId(task_id)})
#     if not task:
#         return jsonify({"error": "Task not found"}), 404

#     allowed_fields = ["title", "description", "label", "status", "priority", "assignedTo", "dueDate"]
#     update = {}

#     for field in allowed_fields:
#         if field in data:
#             update[field] = data[field]

#     if not update:
#         return jsonify({"error": "No valid fields to update"}), 400

#     result = backlog_collection.update_one(
#         {"_id": ObjectId(task_id)},
#         {"$set": update}
#     )

#     if result.modified_count == 0:
#         return jsonify({"message": "No changes were made"}), 200

#     return jsonify({"message": "Task updated successfully"}), 200

# @app.route('/api/backlog/<task_id>', methods=['DELETE'])
# def delete_task(task_id):
#     result = backlog_collection.delete_one({"_id": ObjectId(task_id)})
#     if result.deleted_count == 0:
#         return jsonify({"error": "Task not found"}), 404
#     return jsonify({"message": "Task deleted successfully"})

# -------------------- GET USERS ROUTE -------------------- For getting user emails to change ownership
@app.route('/api/users', methods=['GET'])
def get_users_list():    
    try:
        users_collection = get_users_collection()
        users = []
        for user in users_collection.find({}, {"_id": 1, "email": 1, "firstName": 1, "lastName": 1}):
            users.append({
                "id": str(user["_id"]),
                "email": user["email"],
                "name": f"{user.get('firstName','')} {user.get('lastName','')}".strip()
            })
        return jsonify(users), 200

    except Exception as e:
        app.logger.error(f"Error getting users: {e}")
        return jsonify({"error": "An error occurred while getting users."}), 500
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
            # Only return safe fields
            response_user = {
                "id": str(user['_id']),
                "firstName": user.get('firstName', ''),
                "lastName": user.get('lastName', ''),
                "email": user.get('email', ''),
                "bio": user.get('bio', '')  # safe, default empty string
            }
            return jsonify({"message": "Login successful", "user": response_user}), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        app.logger.error(f"Error during login: {e}")
        return jsonify({"error": "An error occurred during login."}), 500

# -------------------- COMMENT ROUTES --------------------

# @app.route('/api/comments/<task_id>', methods=['GET'])
# def get_comments(task_id):
#     comments = []
#     for comment in get_comments_collection().find({"taskId": ObjectId(task_id)}):
#         comments.append({
#             "id": str(comment["_id"]),
#             "taskId": comment["taskId"],
#             "author": comment["author"],
#             "text": comment["text"],
#             "timestamp": comment["timestamp"]
#         })
#     return jsonify(comments)

# @app.route("/api/backlog/<task_id>/comments", methods=["POST"])
# def add_comment(task_id):
#     data = request.json
#     author = data.get("author", "Anonymous")
#     text = data.get("text")

#     if not text:
#         return jsonify({"error": "Comment text is required"}), 400

#     # Check if the task exists in the backlog_collection
#     task = backlog_collection.find_one({"_id": ObjectId(task_id)})
#     if not task:
#         return jsonify({"error": "Task not found"}), 404

#     # Insert comment into the comments collection
#     comment = {
#         "taskId": ObjectId(task_id),
#         "author": author,
#         "text": text,
#         "timestamp": datetime.now()
#     }
#     result = get_comments_collection().insert_one(comment)
#     comment["_id"] = str(result.inserted_id)

#     return jsonify(comment), 201
@app.route('/api/projects/<project_id>/backlog/<task_id>/comments', methods=['GET'])
def get_comments(project_id, task_id):
    comments = []
    for comment in get_comments_collection().find({"taskId": ObjectId(task_id)}).sort("timestamp", 1):
        comments.append({
            "id": str(comment["_id"]),
            "taskId": str(comment["taskId"]),
            "author": comment["author"],
            "text": comment["text"],
            "timestamp": comment["timestamp"].isoformat() if isinstance(comment["timestamp"], datetime) else str(comment["timestamp"])
        })
    return jsonify(comments)

@app.route('/api/projects/<project_id>/backlog/<task_id>/comments', methods=['POST'])
def add_comment(project_id, task_id):
    data = request.json
    text = data.get("text")
    if not text:
        return jsonify({"error": "Comment text is required"}), 400

    comment = {
        "taskId": ObjectId(task_id),
        "author": data.get("author", "Anonymous"),
        "text": text,
        "timestamp": datetime.utcnow()
    }
    result = get_comments_collection().insert_one(comment)

    response_comment = {
        "id": str(result.inserted_id),
        "taskId": str(comment["taskId"]),
        "author": comment["author"],
        "text": comment["text"],
        "timestamp": comment["timestamp"].isoformat()
    }
    return jsonify(response_comment), 201

# -------------------- PROFILE ROUTES --------------------

@app.route('/api/users/<user_id>', methods=['PUT'])
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

# -------------------- SERVER RUN --------------------
if __name__ == "__main__":
    app.run(debug=True, port=5001)
