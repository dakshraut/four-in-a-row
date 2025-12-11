# 🎮 Four-in-a-Row Game

A modern implementation of the classic Connect Four game with real-time multiplayer capabilities.

![Game Preview](https://img.shields.io/badge/status-live-success) ![React](https://img.shields.io/badge/React-18.2-blue) ![Node.js](https://img.shields.io/badge/Node.js-18-green) ![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Live Demo

[**Play Now →**](https://four-in-a-row.vercel.app)

## ✨ Features

- 🎯 **Two-player gameplay** - Play against a friend locally
- ⚡ **Real-time updates** - Instant game state synchronization
- 🎨 **Responsive design** - Works on desktop and mobile
- 🏆 **Win detection** - Automatic winner announcement
- 🔄 **Game reset** - Start fresh anytime
- 📱 **Modern UI** - Clean, intuitive interface

## 🏗️ Project Architecture
four-in-a-row/
├── frontend/ # React + Vite application
│ ├── src/ # React components & logic
│ ├── public/ # Static assets
│ └── package.json # Frontend dependencies
└── backend/ # Node.js + Express server
├── server.js # Game server
├── gameLogic.js # Game logic
└── package.json # Backend dependencies

text

## 🛠️ Technologies Used

### **Frontend**
- ⚛️ **React 18** - UI library
- ⚡ **Vite** - Build tool & dev server
- 🎨 **CSS3** - Styling
- 🔗 **Axios/Fetch** - API communication

### **Backend**
- 🟢 **Node.js** - Runtime environment
- 🚂 **Express** - Web framework
- 🌐 **Socket.io** (if used) - Real-time communication

### **Deployment**
- ▲ **Vercel** - Frontend hosting
- 🚂 **Railway/Render** - Backend hosting

## 📦 Installation & Setup

### **Prerequisites**
- Node.js 16+ and npm/yarn
- Git

### **1. Clone Repository**
```bash
git clone https://github.com/dakshraut/four-in-a-row.git
cd four-in-a-row
2. Frontend Setup
bash
cd frontend
npm install
npm run dev
Frontend runs at: http://localhost:5173

3. Backend Setup
bash
cd backend
npm install
npm start
Backend runs at: http://localhost:3000

🎮 How to Play
Open the game in two browser tabs/windows

Player 1 (Red) goes first

Click on a column to drop your disc

First to connect 4 discs vertically, horizontally, or diagonally wins!

Click "Reset Game" to play again

🔧 API Endpoints (Backend)
Method	Endpoint	Description
GET	/api/game/state	Get current game state
POST	/api/game/move	Make a move
POST	/api/game/reset	Reset game
GET	/api/game/winner	Check winner
🤝 Contributing
Contributions are welcome! Follow these steps:

Fork the repository

Create a feature branch: git checkout -b feature-name

Commit changes: git commit -m 'Add feature'

Push to branch: git push origin feature-name

Open a Pull Request

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

👨‍💻 Author
Daksh Raut

GitHub: @dakshraut

Project Link: https://github.com/dakshraut/four-in-a-row

🙏 Acknowledgments
Connect Four game concept by Milton Bradley

Inspired by classic board games

Built as a learning project for modern web development
