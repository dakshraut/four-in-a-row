import React, { useState, useEffect } from 'react';

const WS_URL = 'ws://localhost:8080';

function App() {
  const [username, setUsername] = useState('');
  const [registered, setRegistered] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('Enter username and click Register');
  const [gameId, setGameId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerColor, setPlayerColor] = useState('#3B82F6'); // Blue
  const [botColor, setBotColor] = useState('#EF4444'); // Red

  // Initialize WebSocket
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('✅ Connected to game server');
      setSocket(ws);
      setStatus('Connected! Enter username and click Register');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Server:', data.type);
        handleServerMessage(data);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('Connection error. Make sure backend is running.');
    };
    
    return () => ws.close();
  }, []);

  // Fetch leaderboard
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/leaderboard');
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const handleServerMessage = (data) => {
    switch (data.type) {
      case 'REGISTERED':
        setRegistered(true);
        setStatus(`Welcome ${data.username}! Click "Start Game" to play.`);
        // Assign player color
        setPlayerColor(['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'][Math.floor(Math.random() * 4)]);
        break;
        
      case 'GAME_STARTED':
        setGameState({
          board: data.board,
          currentPlayer: data.currentPlayer,
          yourTurn: data.yourTurn,
          opponent: data.opponent,
          isBot: data.isBot,
          status: 'playing'
        });
        setGameId(data.gameId);
        setStatus(data.yourTurn ? 'Your turn! Click a column.' : 'Bot\'s turn...');
        // Assign bot color (different from player)
        setBotColor(playerColor === '#3B82F6' ? '#EF4444' : 
                   playerColor === '#10B981' ? '#F59E0B' :
                   playerColor === '#8B5CF6' ? '#06B6D4' : '#EF4444');
        break;
        
      case 'MOVE_MADE':
      case 'OPPONENT_MOVE':
        setGameState(prev => ({
          ...prev,
          board: data.board,
          currentPlayer: data.currentPlayer,
          yourTurn: data.yourTurn,
          status: data.status,
          winner: data.winner
        }));
        
        if (data.status === 'ended') {
          if (data.isDraw) {
            setStatus('Game ended in a draw! 🎭');
          } else if (data.isWinner) {
            setStatus('🎉 You won! Click "New Game" to play again.');
          } else {
            setStatus(`Game over. ${data.winner} won. Click "New Game" to play again.`);
          }
        } else {
          setStatus(data.yourTurn ? 'Your turn! Click a column to drop your disc.' : `Bot's turn...`);
        }
        break;
    }
  };

  const handleRegister = () => {
    if (!username.trim()) {
      setStatus('Please enter a username');
      return;
    }
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'REGISTER',
        username: username.trim()
      }));
    } else {
      setStatus('Not connected. Refresh page.');
    }
  };

  const handleStartGame = () => {
    if (!registered) {
      setStatus('Please register first');
      return;
    }
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'JOIN_GAME',
        username
      }));
      setStatus('Starting game with bot...');
    }
  };

  const handleColumnClick = (column) => {
    if (!gameState || !gameState.yourTurn || gameState.status !== 'playing') {
      return;
    }
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'MAKE_MOVE',
        gameId,
        column,
        username
      }));
    }
  };

  const renderCell = (row, col) => {
    const cell = gameState.board[row][col];
    const isPlayer = cell === username;
    const isOpponent = cell && cell !== username;
    
    return (
      <div 
        key={`${row}-${col}`}
        style={{
          ...styles.cell,
          backgroundColor: isPlayer ? playerColor : 
                         isOpponent ? botColor : '#60A5FA',
          cursor: gameState.yourTurn && gameState.status === 'playing' ? 'pointer' : 'default',
          opacity: cell ? 1 : 0.3,
          transform: cell ? 'scale(1.05)' : 'scale(1)',
          boxShadow: cell ? '0 4px 8px rgba(0,0,0,0.2)' : 'none',
        }}
        onClick={() => handleColumnClick(col)}
        title={`Column ${col + 1}, Row ${row + 1}`}
      >
        {cell && (
          <div style={{
            ...styles.disc,
            backgroundColor: isPlayer ? playerColor : botColor,
            boxShadow: isPlayer 
              ? 'inset 0 -8px 0 rgba(0,0,0,0.3), 0 0 20px rgba(59, 130, 246, 0.5)'
              : 'inset 0 -8px 0 rgba(0,0,0,0.3), 0 0 20px rgba(239, 68, 68, 0.5)'
          }} />
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.animatedBg}></div>
      
      <header style={styles.header}>
        <div style={styles.titleContainer}>
          <h1 style={styles.title}>🎯 CONNECT FOUR</h1>
          <p style={styles.subtitle}>Real-time Strategy Game</p>
        </div>
      </header>
      
      <div style={styles.main}>
        {/* Left Sidebar */}
        <div style={styles.sidebar}>
          {/* Player Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>👤 Player Profile</h3>
              <div style={{...styles.colorIndicator, backgroundColor: playerColor}}></div>
            </div>
            
            {!registered ? (
              <div style={styles.registerSection}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose your username"
                  style={styles.input}
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                />
                <button 
                  onClick={handleRegister}
                  style={styles.primaryButton}
                >
                  ✨ Join Game
                </button>
              </div>
            ) : !gameState ? (
              <div style={styles.gameStartSection}>
                <div style={styles.playerInfo}>
                  <span style={styles.playerName}>{username}</span>
                  <span style={styles.playerTag}>Player</span>
                </div>
                <p style={styles.readyText}>Ready to challenge the bot?</p>
                <button 
                  onClick={handleStartGame}
                  style={styles.startButton}
                >
                  🚀 Start Game vs Bot
                </button>
              </div>
            ) : (
              <div style={styles.gameActiveSection}>
                <div style={styles.playerVs}>
                  <div style={styles.playerBadge}>
                    <div style={{...styles.colorDot, backgroundColor: playerColor}}></div>
                    <span>{username}</span>
                  </div>
                  <span style={styles.vs}>VS</span>
                  <div style={styles.playerBadge}>
                    <div style={{...styles.colorDot, backgroundColor: botColor}}></div>
                    <span>{gameState.opponent}</span>
                  </div>
                </div>
                
                <div style={styles.gameStatus}>
                  <div style={styles.statusBadge}>
                    {gameState.status === 'playing' ? '🕹️ Playing' : '🏁 Game Over'}
                  </div>
                  {gameState.status === 'playing' && (
                    <div style={{
                      ...styles.turnIndicator,
                      backgroundColor: gameState.yourTurn ? '#D1FAE5' : '#FEF3C7'
                    }}>
                      {gameState.yourTurn ? '✅ Your Turn' : '🤖 Bot\'s Turn'}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleStartGame}
                  style={styles.secondaryButton}
                >
                  🔄 New Game
                </button>
              </div>
            )}
          </div>
          
          {/* Status Card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📊 Game Status</h3>
            <div style={{
              ...styles.connectionStatus,
              backgroundColor: socket?.readyState === WebSocket.OPEN ? '#10B981' : '#EF4444'
            }}>
              {socket?.readyState === WebSocket.OPEN ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
            </div>
            <div style={styles.statusMessage}>
              <p>{status}</p>
            </div>
          </div>
          
          {/* Leaderboard Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>🏆 Leaderboard</h3>
              <span style={styles.updateText}>Updated just now</span>
            </div>
            
            {leaderboard.length === 0 ? (
              <p style={styles.emptyText}>No games played yet</p>
            ) : (
              <div style={styles.leaderboard}>
                {leaderboard.slice(0, 5).map((player, index) => (
                  <div 
                    key={player.username} 
                    style={{
                      ...styles.leaderboardRow,
                      backgroundColor: index === 0 ? '#FEF3C7' : 'transparent'
                    }}
                  >
                    <div style={styles.rank}>
                      <span style={styles.rankNumber}>{index + 1}</span>
                      <span style={styles.playerNameSmall}>{player.username}</span>
                    </div>
                    <div style={styles.stats}>
                      <span style={styles.wins}>{player.wins} wins</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Game Board Area */}
        <div style={styles.gameArea}>
          <div style={styles.gameCard}>
            <h2 style={styles.boardTitle}>Game Board</h2>
            
            {gameState ? (
              <>
                {/* Column Headers */}
                <div style={styles.columnHeaders}>
                  {[0,1,2,3,4,5,6].map(col => (
                    <button
                      key={col}
                      style={styles.columnButton}
                      onClick={() => handleColumnClick(col)}
                      disabled={!gameState.yourTurn || gameState.status !== 'playing'}
                      title={`Drop in column ${col + 1}`}
                    >
                      {col + 1}
                    </button>
                  ))}
                </div>
                
                {/* Game Grid */}
                <div style={styles.boardContainer}>
                  <div style={styles.board}>
                    {gameState.board.map((row, rowIndex) => (
                      <div key={rowIndex} style={styles.row}>
                        {row.map((cell, colIndex) => renderCell(rowIndex, colIndex))}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Game Controls & Info */}
                <div style={styles.gameInfo}>
                  <div style={styles.legend}>
                    <div style={styles.legendItem}>
                      <div style={{...styles.legendColor, backgroundColor: playerColor}}></div>
                      <span>You ({username})</span>
                    </div>
                    <div style={styles.legendItem}>
                      <div style={{...styles.legendColor, backgroundColor: botColor}}></div>
                      <span>Bot ({gameState.opponent})</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={styles.welcomeScreen}>
                <div style={styles.welcomeHeader}>
                  <h3>Welcome to Connect Four!</h3>
                  <p style={styles.welcomeSubtitle}>The classic strategy game, now with AI!</p>
                </div>
                
                <div style={styles.instructions}>
                  <div style={styles.step}>
                    <div style={styles.stepNumber}>1</div>
                    <div>
                      <strong>Enter a username</strong> and click "Join Game"
                    </div>
                  </div>
                  <div style={styles.step}>
                    <div style={styles.stepNumber}>2</div>
                    <div>
                      <strong>Start a game</strong> against our smart bot
                    </div>
                  </div>
                  <div style={styles.step}>
                    <div style={styles.stepNumber}>3</div>
                    <div>
                      <strong>Click column numbers</strong> to drop your discs
                    </div>
                  </div>
                  <div style={styles.step}>
                    <div style={styles.stepNumber}>4</div>
                    <div>
                      <strong>Connect 4 in a row</strong> to win the game!
                    </div>
                  </div>
                </div>
                
                {/* Preview Board */}
                <div style={styles.previewContainer}>
                  <div style={styles.previewBoard}>
                    {Array.from({ length: 42 }).map((_, i) => (
                      <div key={i} style={{
                        ...styles.previewCell,
                        backgroundColor: i % 3 === 0 ? playerColor : 
                                       i % 3 === 1 ? botColor : '#93C5FD',
                        opacity: 0.8
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  animatedBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
    animation: 'pulse 4s ease-in-out infinite',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    position: 'relative',
  },
  titleContainer: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '20px 40px',
    display: 'inline-block',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: '3.5rem',
    fontWeight: '900',
    margin: 0,
    background: 'linear-gradient(45deg, #60A5FA, #A78BFA)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 2px 10px rgba(96, 165, 250, 0.3)',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#CBD5E1',
    marginTop: '10px',
    fontWeight: '300',
  },
  main: {
    display: 'flex',
    gap: '30px',
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative',
  },
  sidebar: {
    flex: 1,
    minWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
  },
  gameArea: {
    flex: 2,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '25px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  cardTitle: {
    margin: 0,
    color: '#1F2937',
    fontSize: '1.3rem',
    fontWeight: '600',
  },
  colorIndicator: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid white',
    boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
  },
  registerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  input: {
    width: '100%',
    padding: '15px',
    border: '2px solid #E5E7EB',
    borderRadius: '12px',
    fontSize: '16px',
    transition: 'all 0.3s',
    outline: 'none',
    boxSizing: 'border-box',
    ':focus': {
      borderColor: '#3B82F6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    },
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    color: 'white',
    border: 'none',
    padding: '15px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    ':hover': {
      backgroundColor: '#4338CA',
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 15px rgba(79, 70, 229, 0.4)',
    },
  },
  gameStartSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  playerInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#F3F4F6',
    borderRadius: '12px',
  },
  playerName: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#1F2937',
  },
  playerTag: {
    backgroundColor: '#10B981',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  readyText: {
    color: '#6B7280',
    textAlign: 'center',
    margin: 0,
  },
  startButton: {
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    padding: '15px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    ':hover': {
      backgroundColor: '#059669',
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 15px rgba(16, 185, 129, 0.4)',
    },
  },
  gameActiveSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  playerVs: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '15px',
  },
  playerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 15px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    flex: 1,
  },
  colorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  vs: {
    color: '#6B7280',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  gameStatus: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  statusBadge: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    padding: '10px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: '600',
  },
  turnIndicator: {
    padding: '12px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: '600',
    color: '#1F2937',
  },
  secondaryButton: {
    backgroundColor: 'white',
    color: '#4F46E5',
    border: '2px solid #4F46E5',
    padding: '15px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    ':hover': {
      backgroundColor: '#4F46E5',
      color: 'white',
      transform: 'translateY(-2px)',
    },
  },
  connectionStatus: {
    color: 'white',
    padding: '12px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '0.9rem',
    marginBottom: '15px',
  },
  statusMessage: {
    backgroundColor: '#F3F4F6',
    padding: '15px',
    borderRadius: '12px',
    color: '#4B5563',
    textAlign: 'center',
  },
  updateText: {
    fontSize: '0.8rem',
    color: '#9CA3AF',
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    padding: '20px 0',
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  leaderboardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 15px',
    borderRadius: '10px',
    transition: 'all 0.3s',
  },
  rank: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  rankNumber: {
    width: '28px',
    height: '28px',
    backgroundColor: '#E5E7EB',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    color: '#4B5563',
  },
  playerNameSmall: {
    fontWeight: '500',
    color: '#1F2937',
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  wins: {
    backgroundColor: '#10B981',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  gameCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
  },
  boardTitle: {
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: '25px',
    fontSize: '2rem',
    fontWeight: '700',
  },
  columnHeaders: {
    display: 'flex',
    justifyContent: 'center',
    gap: '5px',
    marginBottom: '15px',
  },
  columnButton: {
    width: '70px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  boardContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  },
  board: {
    backgroundColor: '#1E40AF',
    padding: '20px',
    borderRadius: '15px',
    border: '8px solid #1E3A8A',
    boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.3), 0 10px 30px rgba(0, 0, 0, 0.4)',
  },
  row: {
    display: 'flex',
    justifyContent: 'center',
  },
  cell: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    margin: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    position: 'relative',
  },
  disc: {
    width: '65px',
    height: '65px',
    borderRadius: '50%',
  },
  gameInfo: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '2px solid #E5E7EB',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    marginTop: '15px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#4B5563',
    fontWeight: '500',
  },
  legendColor: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid white',
    boxShadow: '0 0 5px rgba(0,0,0,0.2)',
  },
  welcomeScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  welcomeHeader: {
    marginBottom: '40px',
  },
  welcomeSubtitle: {
    color: '#6B7280',
    fontSize: '1.1rem',
    marginTop: '10px',
  },
  instructions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '500px',
    marginBottom: '40px',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '15px 25px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    textAlign: 'left',
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    backgroundColor: '#3B82F6',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.2rem',
  },
  previewContainer: {
    marginTop: '20px',
  },
  previewBoard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 45px)',
    gridTemplateRows: 'repeat(6, 45px)',
    gap: '6px',
    backgroundColor: '#1E40AF',
    padding: '20px',
    borderRadius: '12px',
    border: '5px solid #1E3A8A',
  },
  previewCell: {
    borderRadius: '50%',
    transition: 'all 0.3s',
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes dropIn {
    0% {
      transform: translateY(-100px) scale(0.5);
      opacity: 0;
    }
    100% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.1;
      transform: scale(1);
    }
    50% {
      opacity: 0.2;
      transform: scale(1.05);
    }
  }
  
  .board .cell:hover {
    transform: scale(1.1) !important;
    z-index: 1;
  }
  
  .column-button:hover:not(:disabled) {
    background-color: #2563EB !important;
    transform: translateY(-3px) !important;
    box-shadow: 0 5px 15px rgba(37, 99, 235, 0.4) !important;
  }
  
  .column-button:disabled {
    background-color: #9CA3AF !important;
    cursor: not-allowed !important;
    opacity: 0.6 !important;
  }
  
  .input:focus {
    border-color: #3B82F6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
  
  .primary-button:hover {
    background-color: #4338CA !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 5px 15px rgba(79, 70, 229, 0.4) !important;
  }
  
  .start-button:hover {
    background-color: #059669 !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4) !important;
  }
  
  .secondary-button:hover {
    background-color: #4F46E5 !important;
    color: white !important;
    transform: translateY(-2px) !important;
  }
  
  .leaderboard-row:hover {
    background-color: #F3F4F6 !important;
  }
`;
document.head.appendChild(styleSheet);

export default App;