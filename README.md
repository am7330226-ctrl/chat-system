# Aura Chat // Frosted Glassmorphism Private Workspace ❄️✨

Aura Chat is a premium, real-time, desktop-first private chat application designed with a modern light glassmorphic user interface. It combines interactive workspaces, files sharing, dynamic search, live typing cues, presence indicator status, and Web Audio synthesized UI chimes in a single responsive Single Page Application (SPA).

---

## 🌟 Key Features

* **Frosted Glassmorphism Layout:** Sleek 3-column desktop layout (Sidebar Workspace Rail, Chat Explorer List, Active Communication Workspace) with custom backdrop blurs, soft colors, and interactive spring-physics animations.
* **1-on-1 Private Messaging:** Fully private rooms routed dynamically over Socket.IO and saved to a local SQLite database.
* **Online Presence Indicators:** Real-time online/offline indicators with dynamic status changes.
* **Live Typing Indicators:** Instant cues when the user you are chatting with is typing.
* **Read Receipts & Badges:** Double checkmarks (✔️✔️) that turn blue when read, and numerical unread badges.
* **Image & File Sharing:** In-chat attachment picker supporting image previews, static file cards, and download links (max 10MB).
* **Instant Message Search:** Magnifying glass search filter that matches, filters, and highlights matching keywords dynamically.
* **Synthesized UI Sounds (Web Audio API):** Clean programmatic sound effects (send pops and receive chimes) without downloading heavy audio assets.
* **Mobile-Responsive Design:** Columns adapt and collapse cleanly into a toggleable view on tablet and phone screen dimensions.

---

## 🛠️ Technology Stack

* **Backend:** Flask, Flask-SQLAlchemy, Flask-SocketIO, Flask-JWT-Extended, SQLite.
* **Frontend:** Vanilla HTML5, CSS3 Custom Properties (Glassmorphism design tokens), Native JavaScript (ES6+), Socket.IO client, Web Audio API.

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone <your-github-repo-url>
cd chat-system
```

### 2. Install dependencies
Make sure you have Python 3.8+ installed, then run:
```bash
pip install -r requirements.txt
```

### 3. Start the application
```bash
python app.py
```
The Flask development server will start running at **`http://127.0.0.1:5000`**.

### 4. Open in browser
Open your browser and navigate to **`http://localhost:5000`** (or `http://127.0.0.1:5000`).
* **Test accounts:** You can register new accounts or log in as `alice` or `bob` (password: `password`).
