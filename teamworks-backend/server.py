from flask import Flask, request, jsonify
from flask_cors import CORS
from model import calendar_collection 
from bson import ObjectId

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

if __name__ == "__main__":
    app.run(debug=True)
