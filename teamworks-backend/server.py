from flask import Flask, request, jsonify
from flask_cors import CORS
from model import calendar_collection 
from bson import ObjectId
from model import backlog_collection

app = Flask(__name__)
CORS(app)

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


# BackLog API

# @app.route('/backlog', methods=['GET'])
# def get_backlog():
#  return jsonify( [
#     {
#         "id": 1,
#         "title": "Login Page",
#         "description": "Implement login functionality",
#         "label": "Feature",
#         "status": "To Do",
#         "priority": "High",
#         "assignedTo": "Alice",
#         "dueDate": "2025-03-01",
#     },
#     {
#         "id": 2,
#         "title": "Dashboard UI",
#         "description": "Fix UI bug on dashboard",
#         "label": "Bug",
#         "status": "In Progress",
#         "priority": "Medium",
#         "assignedTo": "Bob",
#         "dueDate": "2025-03-05",
#     },
#     {
#         "id": 3,
#         "title": "Documentation",
#         "description": "Update documentation",
#         "label": "Task",
#         "status": "Done",
#         "priority": "Low",
#         "assignedTo": "Charlie",
#         "dueDate": "2025-03-10",
#     },
# ])
 
 
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

if __name__ == "__main__":
    app.run(debug=True)
