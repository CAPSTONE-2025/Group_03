from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from model import get_users_collection, get_comments_collection, get_projects_collection, get_notifications_collection
from model import backlog_collection
import bcrypt
from bson import ObjectId
from datetime import datetime
from functools import wraps
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)
CORS(app, origins=["http://localhost:3000"])  # CORS for frontend

# Email configuration
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', app.config['MAIL_USERNAME'])
app.config['FRONTEND_URL'] = os.getenv('FRONTEND_URL', 'http://localhost:3000')

mail = Mail(app)

@app.route('/')
def home():
    return jsonify({"message": "Welcome to Teamworks!"})


# -------------------- Owner/auth helpers--------------------

def get_request_user_id():
    uid = request.headers.get("X-User-Id")
    try:
        return ObjectId(uid) if uid else None
    except Exception:
        return None
    
    
def get_request_user():
    uid = get_request_user_id()
    if not uid:
        return None
    return get_users_collection().find_one({"_id": uid})


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


def require_project_member(fn):
    @wraps(fn)
    def wrapper(project_id, *args, **kwargs):
        user_id = get_request_user_id()
        if not user_id:
            return jsonify({"error": "Missing X-User-Id header"}), 401

        proj = get_projects_collection().find_one(
            {"_id": ObjectId(project_id), "members": user_id},
            {"_id": 1}
        )
        if not proj:
            return jsonify({"error": "You are not a member of this project"}), 403

        # stash for later if needed
        request._request_user_id = user_id
        return fn(project_id, *args, **kwargs)

    return wrapper

# --------------------  ---------------------

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
        "status": "Active",
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
            "status": p.get("status", "Active"),
        })
    return jsonify(projects)

@app.route('/api/project/<project_id>', methods=['GET'])
@require_project_member
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
        "status": p.get("status", "Active"),
    })


# -------------------- LEAVE PROJECT (member) --------------------
@app.route("/api/projects/<project_id>/members/self", methods=["DELETE"])
@require_project_member
def leave_project(project_id):
    """
    Current logged-in user leaves the project.
    Owner is not allowed to leave this way.
    Auth: X-User-Id header required (handled by require_project_member).
    """
    user_id = get_request_user_id()
    if not user_id:
        return jsonify({"error": "Missing X-User-Id header"}), 401

    projects = get_projects_collection()
    proj = projects.find_one(
        {"_id": ObjectId(project_id)},
        {"owner": 1, "members": 1}
    )
    if not proj:
        return jsonify({"error": "Project not found"}), 404

    # Prevent owner from leaving without transferring / deleting
    if str(proj.get("owner")) == str(user_id):
        return jsonify({
            "error": "Project owner cannot leave the project. "
                     "Transfer ownership or delete the project instead."
        }), 400

    result = projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$pull": {"members": user_id},
            "$set": {"updatedAt": datetime.utcnow()}
        }
    )

    if result.modified_count == 0:
        return jsonify({"error": "You are not a member of this project"}), 400

    return jsonify({"message": "You have left the project."}), 200

# -------------------- REMOVE PROJECT MEMBER (by owner) --------------------
@app.route("/api/projects/<project_id>/members/<member_id>", methods=["DELETE"])
@require_project_owner
def remove_member(project_id, member_id):
    """
    Owner removes a member from the project.
    Cannot remove the current owner.
    Auth: X-User-Id must be the owner (handled by require_project_owner).
    """
    projects = get_projects_collection()

    try:
        member_oid = ObjectId(member_id)
    except Exception:
        return jsonify({"error": "Invalid member id"}), 400

    proj = projects.find_one(
        {"_id": ObjectId(project_id)},
        {"owner": 1, "members": 1}
    )
    if not proj:
        return jsonify({"error": "Project not found"}), 404

    # Back-end safety: do not allow removing owner
    if str(proj.get("owner")) == str(member_oid):
        return jsonify({"error": "Cannot remove the project owner."}), 400

    # Ensure the user is actually in members
    if not any(str(m) == str(member_oid) for m in proj.get("members", [])):
        return jsonify({"error": "User is not a member of this project."}), 400

    result = projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$pull": {"members": member_oid},
            "$set": {"updatedAt": datetime.utcnow()}
        }
    )

    if result.modified_count == 0:
        return jsonify({"error": "Member not removed"}), 400

    return jsonify({"message": "Member removed from project."}), 200

# -------------------- Owner/auth helpers--------------------

def get_request_user_id():
    uid = request.headers.get("X-User-Id")
    try:
        return ObjectId(uid) if uid else None
    except Exception:
        return None
    
    
def get_request_user():
    uid = get_request_user_id()
    if not uid:
        return None
    return get_users_collection().find_one({"_id": uid})


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

# --------------------  ---------------------

@app.route("/api/projects/<project_id>/status", methods=["PATCH"])
@require_project_owner
def update_project_status(project_id):
    data = request.json or {}
    new_status = (data.get("status") or "").strip()
    if new_status not in ("Active", "Completed"):
        return jsonify({"error": "status must be 'Active' or 'Completed'"}), 400

    res = get_projects_collection().update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"status": new_status, "updatedAt": datetime.utcnow()}}
    )
    if res.matched_count == 0:
        return jsonify({"error": "Project not found"}), 404
    return jsonify({"message": "Status updated", "status": new_status}), 200

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


# -------------------- PROJECT INVITE (Receiving)---------------------

@app.route("/api/invitations", methods=["GET"])
def list_invitations():
    """
    Auth required: X-User-Id
    Returns pending invites for the logged-in user's email.
    """
    udoc = get_request_user()
    if not udoc:
        return jsonify({"error": "Missing X-User-Id header"}), 401

    email = (udoc.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "User has no email on file"}), 400

    cursor = get_projects_collection().find(
        {"pendingInvites.email": email},
        {"name": 1, "pendingInvites": 1, "owner": 1}
    )

    results = []
    for p in cursor:
        for inv in p.get("pendingInvites", []):
            if (inv.get("email") or "").lower() == email:
                results.append({
                    "projectId": str(p["_id"]),
                    "projectName": p.get("name", ""),
                    "invitedAt": inv.get("invitedAt").isoformat() if isinstance(inv.get("invitedAt"), datetime) else str(inv.get("invitedAt", "")),
                    "invitedBy": str(inv.get("invitedBy")) if inv.get("invitedBy") else None,
                    "ownerId": str(p.get("owner")) if p.get("owner") else None
                })
                break
    return jsonify(results), 200


@app.route("/api/invitations/respond", methods=["POST"])
def respond_invitation():
    """
    Body: { "projectId": "...", "action": "accept" | "decline" }
    Auth required: X-User-Id
    Uses the logged-in user's email; ignores any email in the body.
    """
    user_id = get_request_user_id()
    udoc = get_request_user()
    if not user_id or not udoc:
        return jsonify({"error": "Missing X-User-Id header"}), 401

    data = request.json or {}
    project_id = data.get("projectId")
    action = (data.get("action") or "").strip().lower()
    if not project_id or action not in ("accept", "decline"):
        return jsonify({"error": "projectId and action are required"}), 400

    email = (udoc.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Your account has no email"}), 400

    projects = get_projects_collection()
    proj = projects.find_one(
        {"_id": ObjectId(project_id), "pendingInvites.email": email},
        {"owner": 1, "name": 1, "pendingInvites": 1}
    )
    if not proj:
        return jsonify({"error": "Invite not found"}), 404

    pull_invite = {
        "$pull": {"pendingInvites": {"email": email}},
        "$set": {"updatedAt": datetime.utcnow()}
    }

    if action == "accept":
        projects.update_one(
            {"_id": ObjectId(project_id)},
            { "$addToSet": {"members": user_id}, **pull_invite }
        )
        status_text = "accepted"
    else:
        projects.update_one({"_id": ObjectId(project_id)}, pull_invite)
        status_text = "declined"

    # Notify owner
    owner = proj.get("owner")
    if owner:
        ncol = get_notifications_collection()
        ncol.insert_one({
            "userId": owner,
            "projectId": ObjectId(project_id),
            "type": "invite-response",
            "message": f'{udoc.get("firstName","")} {udoc.get("lastName","")} {status_text} your invitation to "{proj.get("name","")}".',
            "createdAt": datetime.utcnow(),
            "isRead": False
        })

    return jsonify({"message": f"Invitation {status_text}."}), 200


#---------------------Owner notifications list & mark read---------------------

@app.route("/api/notifications", methods=["GET"])
def list_notifications():
    user_id = get_request_user_id()
    if not user_id:
        return jsonify({"error": "Missing X-User-Id header"}), 401
    cur = get_notifications_collection().find(
        {"userId": user_id}
    ).sort("createdAt", -1)
    out = []
    for n in cur:
        out.append({
            "id": str(n["_id"]),
            "projectId": str(n.get("projectId")) if n.get("projectId") else None,
            "type": n.get("type"),
            "message": n.get("message", ""),
            "isRead": bool(n.get("isRead", False)),
            "createdAt": n.get("createdAt").isoformat() if isinstance(n.get("createdAt"), datetime) else str(n.get("createdAt",""))
        })
    return jsonify(out), 200


@app.route("/api/notifications/<nid>/read", methods=["PATCH"])
def mark_notification_read(nid):
    user_id = get_request_user_id()
    if not user_id:
        return jsonify({"error": "Missing X-User-Id header"}), 401

    get_notifications_collection().update_one(
        {"_id": ObjectId(nid), "userId": user_id},
        {"$set": {"isRead": True}}
    )
    return jsonify({"message": "Marked read"}), 200


# -------------------- PROJECT INVITE (Sending)---------------------

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
    users = get_users_collection()
    
    # Get project details for email
    proj = projects.find_one({"_id": ObjectId(project_id)}, {"name": 1, "description": 1, "pendingInvites": 1, "owner": 1})
    if not proj:
        return jsonify({"error": "Project not found"}), 404

    # Get inviter details
    inviter = get_request_user()
    inviter_name = f"{inviter.get('firstName', '')} {inviter.get('lastName', '')}".strip() or inviter.get('email', 'Someone')

    # prevent duplicates
    already = { (pi.get("email") or "").lower() for pi in proj.get("pendingInvites", []) }
    new_pending = []
    emails_sent = []
    emails_not_found = []
    
    for email in normalized:
        if email not in already:
            # Check if email exists in users database
            user = users.find_one({"email": email})
            
            if user:
                # User exists - send email invitation
                try:
                    project_name = proj.get("name", "a project")
                    frontend_url = app.config['FRONTEND_URL']
                    
                    # Create email message
                    msg = Message(
                        subject=f"Invitation to join {project_name} on Teamworks",
                        recipients=[email],
                        html=f"""
                        <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #4a90e2;">Project Invitation</h2>
                                <p>Hello,</p>
                                <p><strong>{inviter_name}</strong> has invited you to join the project <strong>"{project_name}"</strong> on Teamworks.</p>
                                
                                {f'<p style="color: #666;">{proj.get("description", "")}</p>' if proj.get("description") else ''}
                                
                                <p>To accept this invitation, please log in to your Teamworks account and check your invitations.</p>
                                
                                <div style="margin: 30px 0;">
                                    <a href="{frontend_url}" 
                                       style="background-color: #4a90e2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                        Go to Teamworks
                                    </a>
                                </div>
                                
                                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                                    If you did not expect this invitation, you can safely ignore this email.
                                </p>
                            </div>
                        </body>
                        </html>
                        """,
                        body=f"""
Hello,

{inviter_name} has invited you to join the project "{project_name}" on Teamworks.

{f'Description: {proj.get("description", "")}' if proj.get("description") else ''}

To accept this invitation, please log in to your Teamworks account at {frontend_url} and check your invitations.

If you did not expect this invitation, you can safely ignore this email.
                        """
                    )
                    mail.send(msg)
                    emails_sent.append(email)
                except Exception as e:
                    print(f"Error sending email to {email}: {str(e)}")
                    # Still add to pending invites even if email fails
                    pass
            
            # Add to pending invites regardless (for both existing users and non-existing)
            # But only send email if user exists
            new_pending.append({
                "email": email,
                "status": "pending",
                "invitedBy": request._request_user_id,
                "invitedAt": datetime.utcnow(),
                "emailSent": user is not None  # Track if email was sent
            })
            
            if not user:
                emails_not_found.append(email)

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
            "emailSent": pi.get("emailSent", False)
        }
        for pi in proj2.get("pendingInvites", [])
    ]
    
    response_data = {
        "pendingInvites": pending_serialized,
        "emailsSent": len(emails_sent),
        "emailsNotFound": emails_not_found
    }
    
    if emails_not_found:
        response_data["message"] = f"Invitations added. {len(emails_sent)} email(s) sent to existing users. {len(emails_not_found)} email(s) not sent (no account found)."
    else:
        response_data["message"] = f"Invitations sent successfully! {len(emails_sent)} email(s) sent."
    
    return jsonify(response_data), 200


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
    new_owner_email = (data.get("ownerEmail") or "").strip().lower()
    if not new_owner_email:
        return jsonify({"error": "ownerEmail is required"}), 400

    users = get_users_collection()
    projects = get_projects_collection()

    # Find the new owner user
    user = users.find_one({"email": new_owner_email})
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Load project with current members
    proj = projects.find_one({"_id": ObjectId(project_id)}, {"members": 1, "owner": 1})
    if not proj:
        return jsonify({"error": "Project not found"}), 404

    # Enforce: new owner must already be a member
    user_id = user["_id"]
    is_member = any(str(m) == str(user_id) for m in proj.get("members", []))
    if not is_member:
        return jsonify({"error": "New owner must already be a project member."}), 400

    # If already owner, short-circuit
    if str(proj.get("owner")) == str(user_id):
        return jsonify({"error": "User is already the project owner."}), 304

    # Update owner only (do NOT add to members here)
    result = projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {
                "owner": ObjectId(user_id),
                "ownerEmail": new_owner_email,
                "updatedAt": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:
        return jsonify({"error": "Project not found"}), 404

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


def _as_iso_date(value):
    """
    Accepts: 'YYYY-MM-DD', full ISO8601 string, datetime/date objects, or missing.
    Returns: ISO date string 'YYYY-MM-DD' or '' if value is falsy.
    """
    if not value:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, str):
        # try plain date
        try:
            return datetime.strptime(value, "%Y-%m-%d").date().isoformat()
        except ValueError:
            # try full ISO (and tolerate Z)
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
            except Exception:
                # if it's some other string, just return as-is to avoid 500s
                return value
    return str(value)


def _parse_iso_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
            except Exception:
                return None
    return None


def _normalize_progress(value):
    if value is None:
        return 0
    try:
        progress = float(value)
    except (TypeError, ValueError):
        raise ValueError("progress must be a number")
    if progress < 0 or progress > 100:
        raise ValueError("progress must be between 0 and 100")
    return round(progress, 2)


def _normalize_dependencies(dep_ids, project_id, exclude_task_id=None):
    if dep_ids is None:
        return []
    if not isinstance(dep_ids, list):
        raise ValueError("dependencies must be an array of task ids")
    normalized = []
    project_oid = ObjectId(project_id)
    exclude_oid = ObjectId(exclude_task_id) if exclude_task_id else None
    for dep in dep_ids:
        try:
            dep_oid = ObjectId(dep)
        except Exception:
            raise ValueError("Each dependency id must be a valid task id")
        if exclude_oid and dep_oid == exclude_oid:
            raise ValueError("A task cannot depend on itself")
        task_exists = backlog_collection.find_one(
            {"_id": dep_oid, "projectId": project_oid},
            {"_id": 1}
        )
        if not task_exists:
            raise ValueError("Dependency task not found in this project")
        if dep_oid not in normalized:
            normalized.append(dep_oid)
    return normalized


@app.route('/api/projects/<project_id>/backlog', methods=['GET'])
@require_project_member
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
            "startDate": task["startDate"],
            "dueDate": task["dueDate"],
            "progress": task.get("progress", 0),
            "dependencies": [str(dep) for dep in task.get("dependencies", [])],
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
    required_fields = ["title", "description", "label", "status", "priority", "assignedTo", "startDate", "dueDate"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    # single assignee → ObjectId
    try:
        assigned_id = ObjectId(data["assignedTo"])
    except Exception:
        return jsonify({"error": "assignedTo must be a valid user id"}), 400

    start_date_obj = _parse_iso_date(data["startDate"])
    due_date_obj = _parse_iso_date(data["dueDate"])
    if not start_date_obj or not due_date_obj:
        return jsonify({"error": "startDate and dueDate must be valid ISO dates"}), 400
    if due_date_obj < start_date_obj:
        return jsonify({"error": "dueDate cannot be before startDate"}), 400

    try:
        progress_value = _normalize_progress(data.get("progress"))
        dependencies_list = _normalize_dependencies(data.get("dependencies"), project_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    project_doc = getattr(request, "_project_doc", None)
    if project_doc and not any(str(member) == str(assigned_id) for member in project_doc.get("members", [])):
        return jsonify({"error": "assignedTo must be a member of this project"}), 400

    task = {
        "title": data["title"],
        "description": data["description"],
        "label": data["label"],
        "status": data["status"],
        "priority": data["priority"],
        "assignedTo": str(assigned_id),
        "startDate": start_date_obj.isoformat(),
        "dueDate": due_date_obj.isoformat(),
        "progress": progress_value,
        "dependencies": dependencies_list,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
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
        "startDate",
        "dueDate",
        "progress",
    ]
    update = {}
    
    # Handle regular fields
    for field in allowed_fields:
        if field in data:
            update[field] = data[field]
    
    # Normalize progress if provided
    if "progress" in update:
        try:
            update["progress"] = _normalize_progress(update["progress"])
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    if not update:
        return jsonify({"error": "No valid fields to update"}), 400

    update["updatedAt"] = datetime.utcnow()
    backlog_collection.update_one({"_id": ObjectId(task_id)}, {"$set": update})
    return jsonify({"message": "Task updated successfully"})


@app.route("/api/projects/<project_id>/backlog/<task_id>", methods=["DELETE"])
def delete_task(project_id, task_id):
    result = backlog_collection.delete_one(
        {"_id": ObjectId(task_id), "projectId": ObjectId(project_id)}
    )
    if result.deleted_count == 0:
        return jsonify({"error": "Task not found"}), 404
    # Remove the deleted task from other dependency lists
    try:
        backlog_collection.update_many(
            {"projectId": ObjectId(project_id)},
            {
                "$pull": {"dependencies": ObjectId(task_id)},
                "$set": {"updatedAt": datetime.utcnow()}
            }
        )
    except Exception:
        pass
    return jsonify({"message": "Task deleted successfully"})


@app.route("/api/projects/<project_id>/backlog/<task_id>/dependencies", methods=["POST"])
@require_project_member
def add_dependency(project_id, task_id):
    data = request.json or {}
    dependency_id = data.get("dependencyId")
    
    if not dependency_id:
        return jsonify({"error": "dependencyId is required"}), 400
    
    # Verify task exists
    task = backlog_collection.find_one(
        {"_id": ObjectId(task_id), "projectId": ObjectId(project_id)}
    )
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    # Verify dependency task exists in same project
    dep_task = backlog_collection.find_one(
        {"_id": ObjectId(dependency_id), "projectId": ObjectId(project_id)}
    )
    if not dep_task:
        return jsonify({"error": "Dependency task not found in this project"}), 404
    
    # Prevent self-dependency
    if str(task_id) == str(dependency_id):
        return jsonify({"error": "A task cannot depend on itself"}), 400
    
    # Get current dependencies
    current_deps = task.get("dependencies", [])
    dep_oid = ObjectId(dependency_id)
    
    # Check if already a dependency
    if dep_oid in current_deps:
        return jsonify({"error": "Dependency already exists"}), 400
    
    # Add dependency
    new_deps = current_deps + [dep_oid]
    try:
        normalized_deps = _normalize_dependencies(
            [str(d) for d in new_deps],
            project_id,
            exclude_task_id=task_id
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    
    backlog_collection.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "dependencies": normalized_deps,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    # Return updated task with dependencies as strings
    updated_task = backlog_collection.find_one({"_id": ObjectId(task_id)})
    return jsonify({
        "message": "Dependency added successfully",
        "dependencies": [str(dep) for dep in updated_task.get("dependencies", [])]
    }), 200


@app.route("/api/projects/<project_id>/backlog/<task_id>/dependencies/<dependency_id>", methods=["DELETE"])
@require_project_member
def remove_dependency(project_id, task_id, dependency_id):
    # Verify task exists
    task = backlog_collection.find_one(
        {"_id": ObjectId(task_id), "projectId": ObjectId(project_id)}
    )
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    # Get current dependencies
    current_deps = task.get("dependencies", [])
    dep_oid = ObjectId(dependency_id)
    
    # Remove dependency
    new_deps = [d for d in current_deps if d != dep_oid]
    
    backlog_collection.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "dependencies": new_deps,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    # Return updated task with dependencies as strings
    updated_task = backlog_collection.find_one({"_id": ObjectId(task_id)})
    return jsonify({
        "message": "Dependency removed successfully",
        "dependencies": [str(dep) for dep in updated_task.get("dependencies", [])]
    }), 200


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
@require_project_member
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
@require_project_member
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
