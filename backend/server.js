const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const WS_PORT = 8080;

// Game constants
const ROWS = 6;
const COLS = 7;

// In-memory storage
const players = new Map();
const games = new Map();
const leaderboard = new Map();

// HTTP endpoints
app.get('/api/leaderboard', (req, res) => {
  const leaderboardArray = Array.from(leaderboard.entries())
    .map(([username, wins]) => ({ username, wins }))
    .sort((a, b) => b.wins - a.wins);
  res.json(leaderboardArray);
});

app.listen(PORT, () => {
  console.log(`✅ HTTP server running on port ${PORT}`);
});

// WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket disconnected');
  });
});

function handleMessage(ws, data) {
  console.log('📨 Message received:', data.type);

  switch (data.type) {
    case 'REGISTER':
      registerPlayer(ws, data.username);
      break;
    case 'JOIN_GAME':
      startGame(ws, data.username);
      break;
    case 'MAKE_MOVE':
      makeMove(ws, data.gameId, data.column, data.username);
      break;
  }
}

function registerPlayer(ws, username) {
  if (players.has(username)) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Username already taken'
    }));
    return;
  }

  players.set(username, { ws, gameId: null });
  ws.send(JSON.stringify({
    type: 'REGISTERED',
    username
  }));
  console.log(`👤 Player registered: ${username}`);
}

function startGame(ws, username) {
  const playerInfo = players.get(username);
  if (!playerInfo) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Please register first'
    }));
    return;
  }

  playerInfo.ws = ws;

  // Create game with bot
  const gameId = uuidv4();
  const botName = `Bot_${Math.floor(Math.random() * 1000)}`;
  
  // Create empty board
  const board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
  
  const game = {
    id: gameId,
    players: [username, botName],
    board: board,
    currentPlayer: username,
    status: 'playing',
    winner: null
  };

  games.set(gameId, game);
  playerInfo.gameId = gameId;
  players.set(botName, { ws: null, gameId, isBot: true });

  console.log(`🎮 Game ${gameId} started: ${username} vs ${botName}`);

  // Send game started message
  ws.send(JSON.stringify({
    type: 'GAME_STARTED',
    gameId,
    opponent: botName,
    isBot: true,
    board: board,
    yourTurn: true
  }));
}

function makeMove(ws, gameId, column, username) {
  const game = games.get(gameId);
  if (!game) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Game not found'
    }));
    return;
  }

  if (game.currentPlayer !== username) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Not your turn'
    }));
    return;
  }

  // Find empty row in column
  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!game.board[r][column]) {
      row = r;
      break;
    }
  }

  if (row === -1) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Column is full'
    }));
    return;
  }

  // Make move
  game.board[row][column] = username;

  // Check for win
  const winner = checkWin(game.board, row, column, username);
  
  if (winner) {
    game.status = 'ended';
    game.winner = username;
    
    // Update leaderboard
    const currentWins = leaderboard.get(username) || 0;
    leaderboard.set(username, currentWins + 1);
  } else {
    // Switch player
    game.currentPlayer = game.players.find(p => p !== username);
  }

  // Send update
  ws.send(JSON.stringify({
    type: 'MOVE_MADE',
    board: game.board,
    column,
    currentPlayer: game.currentPlayer,
    status: game.status,
    winner: game.winner
  }));

  console.log(`🎯 Move made by ${username} at column ${column}`);

  // If bot's turn, make bot move after delay
  if (game.status === 'playing' && game.currentPlayer.includes('Bot')) {
    setTimeout(() => makeBotMove(gameId), 1000);
  }
}

function makeBotMove(gameId) {
  const game = games.get(gameId);
  if (!game || game.status !== 'playing') return;

  const botPlayer = game.players.find(p => p.includes('Bot'));
  
  // Simple bot: choose random valid column
  const validColumns = [];
  for (let col = 0; col < COLS; col++) {
    if (game.board[0][col] === null) {
      validColumns.push(col);
    }
  }

  if (validColumns.length === 0) return;

  const randomCol = validColumns[Math.floor(Math.random() * validColumns.length)];
  
  // Find row
  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!game.board[r][randomCol]) {
      row = r;
      break;
    }
  }

  game.board[row][randomCol] = botPlayer;
  
  // Check if bot wins
  const winner = checkWin(game.board, row, randomCol, botPlayer);
  
  if (winner) {
    game.status = 'ended';
    game.winner = botPlayer;
  } else {
    game.currentPlayer = game.players.find(p => !p.includes('Bot'));
  }

  // Find human player socket
  const humanPlayer = game.players.find(p => !p.includes('Bot'));
  const humanInfo = players.get(humanPlayer);
  
  if (humanInfo && humanInfo.ws) {
    humanInfo.ws.send(JSON.stringify({
      type: 'OPPONENT_MOVE',
      board: game.board,
      column: randomCol,
      currentPlayer: game.currentPlayer,
      status: game.status,
      winner: game.winner,
      yourTurn: game.currentPlayer === humanPlayer
    }));
  }

  console.log(`🤖 Bot moved at column ${randomCol}`);
}

function checkWin(board, row, col, player) {
  // Check horizontal
  let count = 0;
  for (let c = 0; c < COLS; c++) {
    count = board[row][c] === player ? count + 1 : 0;
    if (count >= 4) return true;
  }

  // Check vertical
  count = 0;
  for (let r = 0; r < ROWS; r++) {
    count = board[r][col] === player ? count + 1 : 0;
    if (count >= 4) return true;
  }

  // Check diagonal (top-left to bottom-right)
  count = 0;
  let startRow = row - Math.min(row, col);
  let startCol = col - Math.min(row, col);
  while (startRow < ROWS && startCol < COLS) {
    count = board[startRow][startCol] === player ? count + 1 : 0;
    if (count >= 4) return true;
    startRow++;
    startCol++;
  }

  // Check diagonal (top-right to bottom-left)
  count = 0;
  startRow = row - Math.min(row, COLS - 1 - col);
  startCol = col + Math.min(row, COLS - 1 - col);
  while (startRow < ROWS && startCol >= 0) {
    count = board[startRow][startCol] === player ? count + 1 : 0;
    if (count >= 4) return true;
    startRow++;
    startCol--;
  }

  return false;
}

console.log(`✅ WebSocket server running on port ${WS_PORT}`);