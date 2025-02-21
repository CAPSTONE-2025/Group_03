from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def hello():
    return jsonify({"message": "Welcome to Teamworks!"})

if __name__ == "__main__":
    app.run(debug=True)