function handleMakeMove(socket, gameId, column) {
  const game = games.get(gameId);
  if (!game) {
    socket.send(JSON.stringify({
      type: 'ERROR',
      message: 'Game not found'
    }));
    return;
  }
  
  // Find player making the move
  let playerUsername = null;
  for (const [username, info] of players.entries()) {
    if (info.socket === socket) {
      playerUsername = username;
      break;
    }
  }
  
  if (!playerUsername || game.currentPlayer !== playerUsername) {
    socket.send(JSON.stringify({
      type: 'ERROR',
      message: 'Not your turn'
    }));
    return;
  }
  
  const result = GameLogic.makeMove(game, column);
  
  if (result.success) {
    // Update game state
    game.board = result.board;
    game.currentPlayer = result.currentPlayer;
    game.status = result.status;
    game.winner = result.winner;
    
    console.log(`📊 Game ${gameId} update:`);
    console.log(`   Status: ${game.status}`);
    console.log(`   Winner: ${game.winner}`);
    console.log(`   Current Player: ${game.currentPlayer}`);
    
    const opponentUsername = game.players.find(p => p !== playerUsername);
    const opponentInfo = players.get(opponentUsername);
    
    // Determine win message
    let winMessage = '';
    if (game.winner === 'draw') {
      winMessage = 'Game ended in a draw!';
    } else if (game.winner === playerUsername) {
      winMessage = 'You won! 🎉';
    } else if (game.winner === opponentUsername) {
      winMessage = `You lost. ${opponentUsername} won.`;
    }
    
    // Send to current player
    socket.send(JSON.stringify({
      type: 'MOVE_MADE',
      board: game.board,
      column,
      currentPlayer: game.currentPlayer,
      status: game.status,
      winner: game.winner,
      message: winMessage,
      isWinner: game.winner === playerUsername,
      isDraw: game.winner === 'draw'
    }));
    
    // Send to opponent if human
    if (opponentInfo && opponentInfo.socket && !opponentInfo.isBot) {
      let opponentMessage = '';
      if (game.winner === 'draw') {
        opponentMessage = 'Game ended in a draw!';
      } else if (game.winner === opponentUsername) {
        opponentMessage = 'You won! 🎉';
      } else if (game.winner === playerUsername) {
        opponentMessage = `You lost. ${playerUsername} won.`;
      }
      
      opponentInfo.socket.send(JSON.stringify({
        type: 'OPPONENT_MOVE',
        board: game.board,
        column,
        currentPlayer: game.currentPlayer,
        status: game.status,
        winner: game.winner,
        message: opponentMessage,
        yourTurn: game.status === 'playing' && game.currentPlayer === opponentUsername,
        isWinner: game.winner === opponentUsername,
        isDraw: game.winner === 'draw'
      }));
    }
    
    produceAnalyticsEvent('move_made', {
      gameId,
      player: playerUsername,
      column,
      winner: game.winner,
      status: game.status,
      timestamp: Date.now()
    });
    
    // Handle game end
    if (game.status !== 'playing') {
      handleGameEnd(game);
      
      if (game.winner && game.winner !== 'draw') {
        // Update leaderboard
        const currentWins = leaderboard.get(game.winner) || 0;
        leaderboard.set(game.winner, currentWins + 1);
        console.log(`🏆 ${game.winner} now has ${currentWins + 1} wins`);
      }
    } else if (game.currentPlayer === opponentUsername && opponentInfo && opponentInfo.isBot) {
      // Bot's turn
      setTimeout(() => makeBotMove(gameId), 500);
    }
  } else {
    socket.send(JSON.stringify({
      type: 'ERROR',
      message: result.message
    }));
  }
}