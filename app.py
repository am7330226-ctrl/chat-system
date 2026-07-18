from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import (
    JWTManager, create_access_token, decode_token
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timezone
import os, uuid, re

app = Flask(__name__, static_folder='frontend/dist', static_url_path='/static')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-fallback-change-in-prod')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-fallback-change-in-prod')
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0 # Prevent caching HTML/CSS/JS
CORS(app, origins="*")

# File upload configuration
UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'txt', 'doc', 'docx', 'zip', 'webm', 'mp3', 'ogg', 'wav', 'm4a'}
MAX_FILE_SIZE_MB = 10
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE_MB * 1024 * 1024
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    print(f"serve_react called with path: '{path}'")
    # Ignore API and upload routes in catch-all
    if path.startswith('api/') or path.startswith('upload'):
        print(f"Path starts with api/ or upload, returning 404")
        return "Not Found", 404
        
    full_path = os.path.join(app.static_folder, path)
    print(f"Checking if {full_path} exists: {os.path.exists(full_path)}")
    if path != "" and os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)
    else:
        print(f"Returning index.html")
        return send_from_directory(app.static_folder, 'index.html')

# Database
basedir = os.path.abspath(os.path.dirname(__file__))
db_url = os.environ.get('DATABASE_URL')
if db_url:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'chat.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db       = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")
jwt      = JWTManager(app)

# ─── Models ──────────────────────────────────────────────────────────────────

class User(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    avatar_url    = db.Column(db.String(255), nullable=True)
    bio           = db.Column(db.String(255), nullable=True)

    def __init__(self, username, password_hash):
        self.username      = username
        self.password_hash = password_hash

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'avatar_url': self.avatar_url,
            'bio': self.bio
        }


class ConversationMember(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversation.id', ondelete='CASCADE'), nullable=False)
    username = db.Column(db.String(80), nullable=False)

    def __init__(self, conversation_id, username):
        self.conversation_id = conversation_id
        self.username = username

class Conversation(db.Model):
    """A private 1-on-1 conversation between two users or a group chat."""
    id         = db.Column(db.Integer, primary_key=True)
    is_group   = db.Column(db.Boolean, default=False)
    name       = db.Column(db.String(80), nullable=True)
    user_a     = db.Column(db.String(80), nullable=True)   # Legacy 1-on-1 field
    user_b     = db.Column(db.String(80), nullable=True)   # Legacy 1-on-1 field
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    messages   = db.relationship('Message', backref='conversation', lazy=True,
                                 order_by='Message.timestamp')
    members_rel = db.relationship('ConversationMember', backref='conversation_obj', lazy='joined', cascade='all, delete-orphan')

    def __init__(self, user_a=None, user_b=None, is_group=False, name=None):
        self.is_group = is_group
        self.name = name
        if user_a and user_b and not is_group:
            pair = sorted([user_a, user_b])
            self.user_a = pair[0]
            self.user_b = pair[1]

    def involves(self, username):
        return any(m.username == username for m in self.members_rel)

    def other_user(self, username):
        for m in self.members_rel:
            if m.username != username:
                return m.username
        return username

    def get_members(self):
        return [m.username for m in self.members_rel]

    def unread_count(self, for_user):
        return sum(1 for m in self.messages if not m.read and m.sender_username != for_user)

    def to_dict(self, for_user):
        last = self.messages[-1] if self.messages else None
        return {
            'id':            self.id,
            'is_group':      self.is_group,
            'name':          self.name,
            'with':          self.other_user(for_user) if not self.is_group else None,
            'members':       self.get_members(),
            'last_message':  last.content if last else '',
            'last_timestamp': last.timestamp.strftime('%H:%M') if last else '',
            'unread_count':  self.unread_count(for_user),
        }


class Message(db.Model):
    id              = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversation.id'), nullable=False)
    sender_username = db.Column(db.String(80), nullable=False)
    content         = db.Column(db.Text, nullable=False)
    timestamp       = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    read            = db.Column(db.Boolean, default=False, nullable=False)
    file_url        = db.Column(db.String(300), nullable=True)   # path to uploaded file
    file_type       = db.Column(db.String(20),  nullable=True)   # 'image' | 'file'
    is_edited       = db.Column(db.Boolean, default=False, nullable=False)
    is_deleted      = db.Column(db.Boolean, default=False, nullable=False)

    def __init__(self, conversation_id, sender_username, content,
                 read=False, file_url=None, file_type=None):
        self.conversation_id = conversation_id
        self.sender_username = sender_username
        self.content         = content
        self.read            = read
        self.file_url        = file_url
        self.file_type       = file_type

    def to_dict(self):
        reactions = db.session.scalars(db.select(Reaction).filter_by(message_id=self.id)).all()
        rx_dict = {}
        for r in reactions:
            if r.emoji not in rx_dict:
                rx_dict[r.emoji] = []
            rx_dict[r.emoji].append(r.username)
        return {
            'id':        self.id,
            'username':  self.sender_username,
            'text':      self.content if not self.is_deleted else '🚫 This message was deleted',
            'timestamp': self.timestamp.strftime('%H:%M'),
            'read':      self.read,
            'file_url':  self.file_url if not self.is_deleted else None,
            'file_type': self.file_type if not self.is_deleted else None,
            'reactions': rx_dict,
            'is_edited': self.is_edited,
            'is_deleted': self.is_deleted,
        }


class Reaction(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id', ondelete='CASCADE'), nullable=False)
    username   = db.Column(db.String(80), nullable=False)
    emoji      = db.Column(db.String(10), nullable=False)

    __table_args__ = (db.UniqueConstraint('message_id', 'username', name='_message_user_reaction_uc'),)

    def __init__(self, message_id, username, emoji):
        self.message_id = message_id
        self.username   = username
        self.emoji      = emoji


# Create tables
with app.app_context():
    db.create_all()

# ─── Helpers ─────────────────────────────────────────────────────────────────

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def verify_token(token):
    """Decode and validate a JWT token. Returns the username or None."""
    try:
        decoded = decode_token(token)
        return decoded.get('sub')
    except Exception:
        return None

def get_or_create_conversation(user_a, user_b):
    """Return existing private conversation or create a new one."""
    pair = sorted([user_a, user_b])
    conv = db.session.scalar(
        db.select(Conversation)
        .filter_by(is_group=False, user_a=pair[0], user_b=pair[1])
    )
    if not conv:
        conv = Conversation(user_a=pair[0], user_b=pair[1], is_group=False)
        db.session.add(conv)
        db.session.commit()
        db.session.add(ConversationMember(conversation_id=conv.id, username=user_a))
        db.session.add(ConversationMember(conversation_id=conv.id, username=user_b))
        db.session.commit()
    return conv

# ─── HTTP Routes ─────────────────────────────────────────────────────────────

@app.route('/api/register', methods=['POST'])
def register():
    data     = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    if not re.match(r'^[a-zA-Z0-9_]{3,80}$', username):
        return jsonify({'message': 'Username must be 3-80 characters and contain only letters, numbers, and underscores'}), 400

    if db.session.scalar(db.select(User).filter_by(username=username)):
        return jsonify({'message': 'Username already exists'}), 409

    hashed_password = generate_password_hash(password)
    new_user        = User(username=username, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    user = db.session.scalar(db.select(User).filter_by(username=username))

    if user and check_password_hash(user.password_hash, password):
        token = create_access_token(identity=username)
        return jsonify({'message': 'Login successful', 'token': token, 'username': username}), 200
    else:
        return jsonify({'message': 'Invalid username or password'}), 401


@app.route('/api/users', methods=['GET'])
def get_users():
    """Return all registered usernames (so users can discover who to chat with)."""
    token    = request.headers.get('Authorization', '').replace('Bearer ', '')
    me       = verify_token(token)
    if not me:
        return jsonify({'message': 'Unauthorized'}), 401

    users = db.session.scalars(db.select(User)).all()
    return jsonify([u.to_dict() for u in users if u.username != me]), 200


@app.route('/api/user/<username>', methods=['GET'])
def get_user_profile(username):
    """Return public profile for a user."""
    user = db.session.scalar(db.select(User).filter_by(username=username))
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify(user.to_dict()), 200


@app.route('/api/profile', methods=['PUT'])
def update_profile():
    """Update authenticated user's profile."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    me    = verify_token(token)
    if not me:
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    user = db.session.scalar(db.select(User).filter_by(username=me))
    if not user:
        return jsonify({'message': 'User not found'}), 404

    if 'avatar_url' in data:
        if len(data['avatar_url']) > 255:
            return jsonify({'message': 'Avatar URL cannot exceed 255 characters'}), 400
        user.avatar_url = data['avatar_url']
    if 'bio' in data:
        if len(data['bio']) > 255:
            return jsonify({'message': 'Bio cannot exceed 255 characters'}), 400
        user.bio = data['bio']

    db.session.commit()
    return jsonify({'message': 'Profile updated successfully', 'user': user.to_dict()}), 200


@app.route('/conversations', methods=['GET'])
def get_conversations():
    """Return all conversations the logged-in user is part of."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    me    = verify_token(token)
    if not me:
        return jsonify({'message': 'Unauthorized'}), 401

    convs = db.session.scalars(
        db.select(Conversation)
        .join(ConversationMember)
        .filter(ConversationMember.username == me)
        .order_by(Conversation.created_at.desc())
    ).unique().all()

    return jsonify([c.to_dict(me) for c in convs]), 200


@app.route('/conversations', methods=['POST'])
def create_or_get_conversation():
    """Create or retrieve a private conversation with another user."""
    token      = request.headers.get('Authorization', '').replace('Bearer ', '')
    me         = verify_token(token)
    if not me:
        return jsonify({'message': 'Unauthorized'}), 401

    data       = request.get_json()
    other_user = data.get('with', '').strip()

    if not other_user:
        return jsonify({'message': 'Target user required'}), 400
    if other_user == me:
        return jsonify({'message': 'Cannot chat with yourself'}), 400
    if not db.session.scalar(db.select(User).filter_by(username=other_user)):
        return jsonify({'message': 'User not found'}), 404

    conv = get_or_create_conversation(me, other_user)
    return jsonify({'conversation_id': conv.id, 'with': other_user, 'is_group': False}), 200

@app.route('/api/conversations/group', methods=['POST'])
def create_group_conversation():
    """Create a new group conversation."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    me    = verify_token(token)
    if not me:
        return jsonify({'message': 'Unauthorized'}), 401

    data    = request.get_json()
    name    = data.get('name', '').strip()
    members = data.get('members', [])
    
    if not name:
        return jsonify({'message': 'Group name required'}), 400
    if len(name) > 80:
        return jsonify({'message': 'Group name cannot exceed 80 characters'}), 400
    if not members or not isinstance(members, list):
        return jsonify({'message': 'Members list required'}), 400
        
    if me not in members:
        members.append(me)

    conv = Conversation(is_group=True, name=name)
    db.session.add(conv)
    db.session.commit()
    
    for m in members:
        db.session.add(ConversationMember(conversation_id=conv.id, username=m))
    db.session.commit()
    
    return jsonify({'conversation_id': conv.id, 'is_group': True, 'name': name}), 200


@app.route('/conversations/<int:conv_id>/messages', methods=['GET'])
def get_conversation_messages(conv_id):
    """Return last 50 messages in a specific private conversation."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    me    = verify_token(token)
    if not me:
        return jsonify({'message': 'Unauthorized'}), 401

    conv = db.session.get(Conversation, conv_id)
    if not conv or not conv.involves(me):
        return jsonify({'message': 'Forbidden'}), 403

    messages = (
        db.session.scalars(
            db.select(Message)
            .filter_by(conversation_id=conv_id)
            .order_by(Message.timestamp.desc())
            .limit(50)
        ).all()
    )
    return jsonify([m.to_dict() for m in reversed(messages)]), 200


@app.route('/upload', methods=['POST'])
def upload_file():
    """Upload an image or file attachment for chat."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    me    = verify_token(token)
    if not me:
        return jsonify({'message': 'Unauthorized'}), 401

    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'message': 'Empty filename'}), 400

    if not allowed_file(file.filename):
        return jsonify({'message': 'File type not allowed'}), 400

    ext      = file.filename.rsplit('.', 1)[1].lower()
    unique   = f'{uuid.uuid4().hex}.{ext}'
    save_path = os.path.join(UPLOAD_FOLDER, unique)
    file.save(save_path)

    if ext in {'png', 'jpg', 'jpeg', 'gif', 'webp'}:
        file_type = 'image'
    elif ext in {'webm', 'mp3', 'ogg', 'wav', 'm4a'}:
        file_type = 'audio'
    else:
        file_type = 'file'

    file_url = f'/uploads/{unique}'

    return jsonify({'file_url': file_url, 'file_type': file_type, 'original_name': secure_filename(file.filename)}), 200


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve an uploaded file."""
    return send_from_directory(UPLOAD_FOLDER, filename)


# ─── WebSocket Events ─────────────────────────────────────────────────────────

# Global mappings for online presence
sid_to_user = {}  # {sid: username}
user_to_sids = {} # {username: [sid, sid]}

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    username = sid_to_user.pop(sid, None)
    if username:
        if username in user_to_sids:
            if sid in user_to_sids[username]:
                user_to_sids[username].remove(sid)
            if not user_to_sids[username]:
                user_to_sids.pop(username, None)
                # User has no more active tabs, broadcast offline
                emit('status_change', {'username': username, 'status': 'offline'}, broadcast=True)
    print(f'Client disconnected: {sid}')

@socketio.on('register_presence')
def handle_register_presence(data):
    token = data.get('token', '')
    username = verify_token(token)
    if not username:
        return

    sid = request.sid
    sid_to_user[sid] = username
    if username not in user_to_sids:
        user_to_sids[username] = []
        # First time online, broadcast to everyone
        emit('status_change', {'username': username, 'status': 'online'}, broadcast=True)
    
    if sid not in user_to_sids[username]:
        user_to_sids[username].append(sid)

    # Join user-specific notification room
    join_room(f"user_{username}")

    # Send the list of current online users to this client
    online_list = list(user_to_sids.keys())
    emit('online_user_list', {'online_users': online_list})

@socketio.on('join_conversation')
def handle_join_conversation(data):
    """User joins a private Socket.IO room for a conversation."""
    token   = data.get('token', '')
    conv_id = data.get('conversation_id')
    me      = verify_token(token)
    if not me or not conv_id:
        return

    conv = db.session.get(Conversation, conv_id)
    if not conv or not conv.involves(me):
        return  # Reject: user is not part of this conversation

    room = f'conv_{conv_id}'
    join_room(room)
    print(f'{me} joined room {room}')

@socketio.on('typing')
def handle_typing(data):
    token   = data.get('token', '')
    conv_id = data.get('conversation_id')
    typing  = data.get('typing', False)
    me      = verify_token(token)
    if not me or not conv_id:
        return

    room = f'conv_{conv_id}'
    emit('user_typing', {
        'conversation_id': conv_id,
        'username':        me,
        'typing':          typing
    }, to=room, include_self=False)

@socketio.on('mark_read')
def handle_mark_read(data):
    token   = data.get('token', '')
    conv_id = data.get('conversation_id')
    me      = verify_token(token)
    if not me or not conv_id:
        return

    conv = db.session.get(Conversation, conv_id)
    if not conv or not conv.involves(me):
        return

    # Find all unread messages sent by the other participant
    unread_messages = db.session.scalars(
        db.select(Message)
        .filter_by(conversation_id=conv_id, read=False)
        .where(Message.sender_username != me)
    ).all()

    if unread_messages:
        for m in unread_messages:
            m.read = True
        db.session.commit()

        # Broadcast to room to notify the sender that their messages have been read
        room = f'conv_{conv_id}'
        emit('messages_read', {
            'conversation_id': conv_id,
            'reader':          me
        }, to=room)

@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    conv_id = data.get('conversation_id')
    if conv_id:
        leave_room(f'conv_{conv_id}')

@socketio.on('send_private_message')
def handle_send_private_message(data):
    token    = data.get('token', '')
    conv_id  = data.get('conversation_id')
    text     = data.get('text', '').strip()
    file_url = data.get('file_url')    # optional
    file_type = data.get('file_type')  # optional

    me = verify_token(token)
    if not me or not conv_id:
        return
    # Must have either text or a file
    if not text and not file_url:
        return

    conv = db.session.get(Conversation, conv_id)
    if not conv or not conv.involves(me):
        return

    # Use a placeholder for file-only messages
    content = text or ('[image]' if file_type == 'image' else '[file]')

    # Persist to database
    msg = Message(
        conversation_id=conv_id,
        sender_username=me,
        content=content,
        file_url=file_url,
        file_type=file_type
    )
    db.session.add(msg)
    db.session.commit()

    room = f'conv_{conv_id}'
    emit('receive_private_message', {
        'conversation_id': conv_id,
        'message_id':      msg.id,
        'username':        me,
        'text':            content,
        'timestamp':       msg.timestamp.strftime('%H:%M'),
        'file_url':        file_url,
        'file_type':       file_type,
        'reactions':       {}
     }, to=room)

    # Notify all members of a new message (for inbox badges and sound alerts)
    notification_payload = {
        'conversation_id': conv_id,
        'username':        me,
        'text':            content,
        'file_url':        file_url,
        'file_type':       file_type,
        'timestamp':       msg.timestamp.strftime('%H:%M')
    }
    for member in conv.get_members():
        emit('new_message_notification', notification_payload, to=f"user_{member}")

@socketio.on('add_reaction')
def handle_add_reaction(data):
    token      = data.get('token', '')
    message_id = data.get('message_id')
    emoji      = data.get('emoji', '').strip()

    me = verify_token(token)
    if not me or not message_id or not emoji:
        return
        
    if len(emoji) > 10:
        return

    msg = db.session.get(Message, message_id)
    if not msg:
        return

    conv = db.session.get(Conversation, msg.conversation_id)
    if not conv or not conv.involves(me):
        return

    existing = db.session.scalar(
        db.select(Reaction).filter_by(message_id=message_id, username=me)
    )

    if existing:
        if existing.emoji == emoji:
            db.session.delete(existing)
        else:
            existing.emoji = emoji
    else:
        new_rx = Reaction(message_id=message_id, username=me, emoji=emoji)
        db.session.add(new_rx)
    
    db.session.commit()

    all_rx = db.session.scalars(db.select(Reaction).filter_by(message_id=message_id)).all()
    rx_dict = {}
    for r in all_rx:
        if r.emoji not in rx_dict:
            rx_dict[r.emoji] = []
        rx_dict[r.emoji].append(r.username)

    room = f'conv_{msg.conversation_id}'
    emit('message_reaction_updated', {
        'message_id': message_id,
        'reactions':  rx_dict
    }, to=room)

@socketio.on('edit_message')
def handle_edit_message(data):
    token = data.get('token', '')
    message_id = data.get('message_id')
    new_text = data.get('text', '').strip()
    me = verify_token(token)
    
    if not me or not message_id or not new_text:
        return
        
    msg = db.session.get(Message, message_id)
    if not msg or msg.sender_username != me:
        return
        
    msg.content = new_text
    msg.is_edited = True
    db.session.commit()
    
    room = f'conv_{msg.conversation_id}'
    emit('message_edited', {
        'message_id': msg.id,
        'text': new_text
    }, to=room)

@socketio.on('delete_message')
def handle_delete_message(data):
    token = data.get('token', '')
    message_id = data.get('message_id')
    me = verify_token(token)
    
    if not me or not message_id:
        return
        
    msg = db.session.get(Message, message_id)
    if not msg or msg.sender_username != me:
        return
        
    msg.is_deleted = True
    db.session.commit()
    
    room = f'conv_{msg.conversation_id}'
    emit('message_deleted', {
        'message_id': msg.id,
        'text': '🚫 This message was deleted'
    }, to=room)

# ─── Run ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
