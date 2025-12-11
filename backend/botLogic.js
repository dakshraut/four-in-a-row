const GameLogic = require('./gameLogic');

class BotLogic {
  static getBestMove(board, botPlayer, players) {
    const opponent = players.find(p => p !== botPlayer);
    
    // 1. Check for immediate winning move
    const winningMove = this.findWinningMove(board, botPlayer);
    if (winningMove !== -1) {
      console.log(`🤖 Bot ${botPlayer}: Found winning move at column ${winningMove}`);
      return winningMove;
    }
    
    // 2. Check for opponent's immediate winning move (block it)
    const blockingMove = this.findWinningMove(board, opponent);
    if (blockingMove !== -1) {
      console.log(`🤖 Bot ${botPlayer}: Blocking opponent at column ${blockingMove}`);
      return blockingMove;
    }
    
    // 3. Look for potential double threats
    const doubleThreatMove = this.findDoubleThreatMove(board, botPlayer, opponent);
    if (doubleThreatMove !== -1) {
      console.log(`🤖 Bot ${botPlayer}: Creating double threat at column ${doubleThreatMove}`);
      return doubleThreatMove;
    }
    
    // 4. Block opponent's potential double threats
    const blockDoubleThreat = this.findDoubleThreatMove(board, opponent, botPlayer);
    if (blockDoubleThreat !== -1) {
      console.log(`🤖 Bot ${botPlayer}: Blocking double threat at column ${blockDoubleThreat}`);
      return blockDoubleThreat;
    }
    
    // 5. Look for strategic positions (center control, building connections)
    const strategicMove = this.findStrategicMove(board, botPlayer, opponent);
    if (strategicMove !== -1) {
      console.log(`🤖 Bot ${botPlayer}: Strategic move at column ${strategicMove}`);
      return strategicMove;
    }
    
    // 6. Fallback: Best scoring move using minimax
    const bestMove = this.getBestScoringMove(board, botPlayer, opponent);
    console.log(`🤖 Bot ${botPlayer}: Best scoring move at column ${bestMove}`);
    return bestMove;
  }
  
  static findWinningMove(board, player) {
    for (let col = 0; col < 7; col++) {
      if (this.isValidMove(board, col)) {
        const row = this.getNextEmptyRow(board, col);
        if (row === -1) continue;
        
        // Make a copy of the board with this move
        const testBoard = this.copyBoard(board);
        testBoard[row][col] = player;
        
        // Check if this move results in a win
        if (this.checkWin(testBoard, row, col, player)) {
          return col;
        }
      }
    }
    return -1;
  }
  
  static findDoubleThreatMove(board, player, opponent) {
    // Find moves that create multiple winning opportunities
    const threatScores = new Array(7).fill(0);
    
    for (let col = 0; col < 7; col++) {
      if (!this.isValidMove(board, col)) continue;
      
      const row = this.getNextEmptyRow(board, col);
      if (row === -1) continue;
      
      const testBoard = this.copyBoard(board);
      testBoard[row][col] = player;
      
      // Count how many winning threats this move creates
      let threatCount = 0;
      
      // Check all possible next moves that could win
      for (let nextCol = 0; nextCol < 7; nextCol++) {
        if (!this.isValidMove(testBoard, nextCol)) continue;
        
        const nextRow = this.getNextEmptyRow(testBoard, nextCol);
        if (nextRow === -1) continue;
        
        const nextBoard = this.copyBoard(testBoard);
        nextBoard[nextRow][nextCol] = player;
        
        if (this.checkWin(nextBoard, nextRow, nextCol, player)) {
          threatCount++;
        }
      }
      
      threatScores[col] = threatCount;
    }
    
    // Find column with maximum threats (at least 2 threats for double threat)
    const maxThreats = Math.max(...threatScores);
    if (maxThreats >= 2) {
      const bestColumns = threatScores
        .map((score, idx) => ({ score, idx }))
        .filter(item => item.score === maxThreats)
        .map(item => item.idx);
      
      // Prefer center columns for double threats
      return this.preferCenter(bestColumns);
    }
    
    return -1;
  }
  
  static findStrategicMove(board, player, opponent) {
    const strategicScores = new Array(7).fill(0);
    
    // Scoring weights for different positions
    const CENTER_WEIGHT = 3;
    const BUILD_WEIGHT = 2;
    const BLOCK_WEIGHT = 2;
    const HEIGHT_PENALTY = 0.5;
    
    for (let col = 0; col < 7; col++) {
      if (!this.isValidMove(board, col)) continue;
      
      const row = this.getNextEmptyRow(board, col);
      if (row === -1) continue;
      
      let score = 0;
      
      // 1. Center preference (columns 3, 2, 4, 1, 5, 0, 6)
      const centerDistance = Math.abs(col - 3);
      score += (3 - centerDistance) * CENTER_WEIGHT;
      
      // 2. Build on existing pieces
      score += this.evaluateConnectionPotential(board, row, col, player) * BUILD_WEIGHT;
      
      // 3. Block opponent's potential connections
      score += this.evaluateConnectionPotential(board, row, col, opponent) * BLOCK_WEIGHT;
      
      // 4. Penalize moves that help opponent (don't play directly above opponent's piece)
      if (row < 5 && board[row + 1][col] === opponent) {
        score -= 1;
      }
      
      // 5. Height penalty (lower rows are generally better)
      score -= row * HEIGHT_PENALTY;
      
      strategicScores[col] = score;
    }
    
    // Find best strategic move
    const maxScore = Math.max(...strategicScores);
    const bestColumns = strategicScores
      .map((score, idx) => ({ score, idx }))
      .filter(item => item.score === maxScore)
      .map(item => item.idx);
    
    return this.preferCenter(bestColumns);
  }
  
  static getBestScoringMove(board, player, opponent) {
    const scores = new Array(7).fill(-Infinity);
    
    for (let col = 0; col < 7; col++) {
      if (!this.isValidMove(board, col)) {
        scores[col] = -10000;
        continue;
      }
      
      const row = this.getNextEmptyRow(board, col);
      if (row === -1) {
        scores[col] = -10000;
        continue;
      }
      
      // Evaluate move using minimax with limited depth for performance
      const testBoard = this.copyBoard(board);
      testBoard[row][col] = player;
      
      const score = this.minimax(testBoard, 3, false, -Infinity, Infinity, player, opponent);
      scores[col] = score;
    }
    
    // Find best score
    const maxScore = Math.max(...scores);
    const bestColumns = scores
      .map((score, idx) => ({ score, idx }))
      .filter(item => item.score === maxScore)
      .map(item => item.idx);
    
    return this.preferCenter(bestColumns);
  }
  
  static minimax(board, depth, isMaximizing, alpha, beta, player, opponent) {
    // Terminal conditions
    const currentPlayer = isMaximizing ? player : opponent;
    
    // Check for win
    for (let col = 0; col < 7; col++) {
      if (this.isValidMove(board, col)) {
        const row = this.getNextEmptyRow(board, col);
        if (row === -1) continue;
        
        const testBoard = this.copyBoard(board);
        testBoard[row][col] = currentPlayer;
        
        if (this.checkWin(testBoard, row, col, currentPlayer)) {
          return isMaximizing ? 1000 - depth : -1000 + depth;
        }
      }
    }
    
    // Check for draw (board full)
    if (this.isBoardFull(board)) {
      return 0;
    }
    
    // Depth limit reached
    if (depth === 0) {
      return this.evaluateBoard(board, player, opponent);
    }
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let col = 0; col < 7; col++) {
        if (!this.isValidMove(board, col)) continue;
        
        const row = this.getNextEmptyRow(board, col);
        if (row === -1) continue;
        
        const testBoard = this.copyBoard(board);
        testBoard[row][col] = player;
        
        const evalScore = this.minimax(testBoard, depth - 1, false, alpha, beta, player, opponent);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let col = 0; col < 7; col++) {
        if (!this.isValidMove(board, col)) continue;
        
        const row = this.getNextEmptyRow(board, col);
        if (row === -1) continue;
        
        const testBoard = this.copyBoard(board);
        testBoard[row][col] = opponent;
        
        const evalScore = this.minimax(testBoard, depth - 1, true, alpha, beta, player, opponent);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minEval;
    }
  }
  
  static evaluateBoard(board, player, opponent) {
    let score = 0;
    
    // Evaluate all possible lines
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        if (board[row][col] !== null) continue;
        
        // Check horizontal
        if (col <= 3) {
          const line = [
            board[row][col],
            board[row][col + 1],
            board[row][col + 2],
            board[row][col + 3]
          ];
          score += this.evaluateLine(line, player, opponent);
        }
        
        // Check vertical
        if (row <= 2) {
          const line = [
            board[row][col],
            board[row + 1][col],
            board[row + 2][col],
            board[row + 3][col]
          ];
          score += this.evaluateLine(line, player, opponent);
        }
        
        // Check diagonal down-right
        if (row <= 2 && col <= 3) {
          const line = [
            board[row][col],
            board[row + 1][col + 1],
            board[row + 2][col + 2],
            board[row + 3][col + 3]
          ];
          score += this.evaluateLine(line, player, opponent);
        }
        
        // Check diagonal up-right
        if (row >= 3 && col <= 3) {
          const line = [
            board[row][col],
            board[row - 1][col + 1],
            board[row - 2][col + 2],
            board[row - 3][col + 3]
          ];
          score += this.evaluateLine(line, player, opponent);
        }
      }
    }
    
    return score;
  }
  
  static evaluateLine(line, player, opponent) {
    let playerCount = 0;
    let opponentCount = 0;
    let emptyCount = 0;
    
    for (const cell of line) {
      if (cell === player) playerCount++;
      else if (cell === opponent) opponentCount++;
      else emptyCount++;
    }
    
    // Scoring based on line potential
    if (playerCount === 4) return 10000;
    if (opponentCount === 4) return -10000;
    
    if (playerCount === 3 && emptyCount === 1) return 100; // Win in 1
    if (playerCount === 2 && emptyCount === 2) return 10;  // Potential
    if (playerCount === 1 && emptyCount === 3) return 1;   // Building
    
    if (opponentCount === 3 && emptyCount === 1) return -100; // Block required
    if (opponentCount === 2 && emptyCount === 2) return -10;  // Threat
    
    return 0;
  }
  
  static evaluateConnectionPotential(board, row, col, player) {
    let potential = 0;
    
    // Check all directions for connection potential
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [1, -1]   // diagonal up-right
    ];
    
    for (const [dr, dc] of directions) {
      // Count consecutive pieces in both directions
      let count = 1; // Current position
      
      // Positive direction
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== player) break;
        count++;
      }
      
      // Negative direction
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== player) break;
        count++;
      }
      
      potential += Math.max(0, count - 1); // Add bonus for each connected piece
    }
    
    return potential;
  }
  
  static checkWin(board, row, col, player) {
    if (board[row][col] !== player) return false;
    
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];
    
    for (const [dr, dc] of directions) {
      let count = 1;
      
      // Positive direction
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== player) break;
        count++;
      }
      
      // Negative direction
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== player) break;
        count++;
      }
      
      if (count >= 4) return true;
    }
    
    return false;
  }
  
  static isValidMove(board, column) {
    return column >= 0 && column < 7 && board[0][column] === null;
  }
  
  static getNextEmptyRow(board, column) {
    for (let row = 5; row >= 0; row--) {
      if (board[row][column] === null) {
        return row;
      }
    }
    return -1;
  }
  
  static copyBoard(board) {
    return board.map(row => [...row]);
  }
  
  static isBoardFull(board) {
    return board[0].every(cell => cell !== null);
  }
  
  static preferCenter(columns) {
    if (columns.length === 0) return 3; // Default to center
    
    // Prefer center columns (3, 2, 4, 1, 5, 0, 6)
    const centerPreference = [3, 2, 4, 1, 5, 0, 6];
    
    for (const preferredCol of centerPreference) {
      if (columns.includes(preferredCol)) {
        return preferredCol;
      }
    }
    
    return columns[0]; // Fallback
  }
}

module.exports = BotLogic;