class ChessGame {
    constructor() {
        this.board = document.getElementById('board');
        this.turn = 'white';
        this.selectedPiece = null;
        this.validMoves = [];
        this.moveHistory = []; // Keep this for undo functionality even without display
        this.promotionCallback = null;
        this.gameState = {
            boardState: Array(8).fill().map(() => Array(8).fill(null)),
            castlingRights: {
                white: { kingSide: true, queenSide: true },
                black: { kingSide: true, queenSide: true }
            },
            enPassantTarget: null,
            halfMoveClock: 0,
            fullMoveNumber: 1,
            kings: { white: null, black: null }
        };
        this.setupBoard();
        this.setupEventListeners();
    }

    setupBoard() {
        // Clear the board first
        this.board.innerHTML = '';
        
        // Create board squares and pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 ? 'black' : 'white'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Position pieces according to standard chess setup
                if (row === 1) {
                    this.addPiece(square, 'pawn', 'black');
                    this.gameState.boardState[row][col] = { type: 'pawn', color: 'black' };
                } else if (row === 6) {
                    this.addPiece(square, 'pawn', 'white');
                    this.gameState.boardState[row][col] = { type: 'pawn', color: 'white' };
                } else if (row === 0) {
                    let type;
                    if (col === 0 || col === 7) {
                        type = 'rook';
                    } else if (col === 1 || col === 6) {
                        type = 'knight';
                    } else if (col === 2 || col === 5) {
                        type = 'bishop';
                    } else if (col === 3) {
                        type = 'queen';
                    } else {
                        type = 'king';
                        this.gameState.kings.black = { row, col };
                    }
                    this.addPiece(square, type, 'black');
                    this.gameState.boardState[row][col] = { type, color: 'black' };
                } else if (row === 7) {
                    let type;
                    if (col === 0 || col === 7) {
                        type = 'rook';
                    } else if (col === 1 || col === 6) {
                        type = 'knight';
                    } else if (col === 2 || col === 5) {
                        type = 'bishop';
                    } else if (col === 3) {
                        type = 'queen';
                    } else {
                        type = 'king';
                        this.gameState.kings.white = { row, col };
                    }
                    this.addPiece(square, type, 'white');
                    this.gameState.boardState[row][col] = { type, color: 'white' };
                }
                
                this.board.appendChild(square);
            }
        }
        
        // Clear move history display removed
        this.moveHistory = [];
        
        // Update the turn display
        this.updateTurnDisplay();
    }

    addPiece(square, type, color) {
        const piece = document.createElement('div');
        piece.className = `piece ${color} ${type}`;
        piece.dataset.color = color;
        piece.dataset.type = type;
        square.appendChild(piece);
    }
    
    setupEventListeners() {
        // Board click event
        this.board.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            const piece = e.target.closest('.piece');

            if (!square) return;

            if (this.selectedPiece) {
                if (this.isValidMove(square)) {
                    this.movePiece(square);
                    
                    // Check for checkmate or stalemate after move
                    if (this.isCheckmate(this.turn)) {
                        setTimeout(() => {
                            alert(`Checkmate! ${this.turn === 'white' ? 'Black' : 'White'} wins!`);
                            this.resetGame();
                        }, 300);
                    } else if (this.isStalemate(this.turn)) {
                        setTimeout(() => {
                            alert(`Stalemate! The game is a draw.`);
                            this.resetGame();
                        }, 300);
                    }
                }
                this.clearHighlights();
                this.selectedPiece = null;
            } else if (piece && piece.dataset.color === this.turn) {
                this.selectedPiece = piece;
                this.highlightValidMoves(piece);
            }
        });

        // Reset button
        document.getElementById('reset').addEventListener('click', () => {
            this.resetGame();
        });
        
        // Undo button
        document.getElementById('undo').addEventListener('click', () => {
            this.undoMove();
        });
        
        // Promotion piece selection
        document.querySelectorAll('.promotion-piece').forEach(piece => {
            piece.addEventListener('click', () => {
                if (this.promotionCallback) {
                    this.promotionCallback(piece.dataset.piece);
                    this.hidePromotionModal();
                }
            });
        });

        // Speech input button
        document.getElementById('speech').addEventListener('click', () => {
            this.handleSpeechInput();
        });

        // Help button
        const helpLink = document.getElementById('show-help');
        if (helpLink) {
            helpLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('help-modal').classList.add('show');
            });
        }
        
        // Close modal
        const closeModal = document.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                document.getElementById('help-modal').classList.remove('show');
            });
        }

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const helpModal = document.getElementById('help-modal');
            if (e.target === helpModal) {
                helpModal.classList.remove('show');
            }
        });
    }

    async handleSpeechInput() {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            
            // Show feedback to user that we're listening
            const speechBtn = document.getElementById('speech');
            const originalText = speechBtn.textContent;
            speechBtn.textContent = "Listening...";
            speechBtn.classList.add('listening');

            recognition.start();

            recognition.onresult = async (event) => {
                const speechResult = event.results[0][0].transcript.toLowerCase();
                console.log('Speech recognized: ' + speechResult);
                
                // Update button to show we heard something
                speechBtn.textContent = "Processing...";
                
                try {
                    const move = await this.getMoveFromGemini(speechResult);
                    if (move) {
                        console.log('Move from Gemini:', move);
                        this.executeMove(move);
                    } else {
                        this.showNotification('Could not interpret the move. Try saying something like "Pawn to e4" or "Knight to f3".');
                    }
                } catch (error) {
                    console.error('Error processing speech input:', error);
                    this.showNotification('Error processing speech input. Please try again.');
                } finally {
                    // Reset button
                    speechBtn.textContent = originalText;
                    speechBtn.classList.remove('listening');
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showNotification('Speech recognition error. Please try again.');
                speechBtn.textContent = originalText;
                speechBtn.classList.remove('listening');
            };

            recognition.onend = () => {
                console.log('Speech recognition ended.');
                // Make sure button text is reset
                speechBtn.textContent = originalText;
                speechBtn.classList.remove('listening');
            };
        } else {
            this.showNotification('Speech recognition is not supported in this browser. Try Chrome.');
        }
    }

    async getMoveFromGemini(speechText) {
        const apiKey = 'AIzaSyC4mCuQuGYBnS_8AVNesUDOQsk7_kBX6R8';
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            // Include the current board state to help Gemini interpret the move correctly
            const boardStateText = this.getBoardStateAsText();
            const legalMovesText = this.getLegalMovesDescription();
            
            // Create a better prompt to improve interpretation accuracy
            const prompt = `
                You are an expert chess move interpreter. Convert the following spoken chess command to a move in the format "e2 to e4" (origin square to destination square).
                
                Current board state (where uppercase=white, lowercase=black):
                ${boardStateText}
                
                Current turn: ${this.turn}
                
                Legal moves from current position include:
                ${legalMovesText}

                The player said: "${speechText}"
                
                IMPORTANT CASTLING INSTRUCTIONS:
                - For "castle kingside" or "short castle" (for white): respond with "e1 to g1"
                - For "castle queenside" or "long castle" (for white): respond with "e1 to c1"
                - For "castle kingside" or "short castle" (for black): respond with "e8 to g8"
                - For "castle queenside" or "long castle" (for black): respond with "e8 to c8"
                
                When the player means to capture a piece they might say "takes" or "capture". 
                If there are multiple pieces of the same type that could move to the destination (like two knights that could both move to f3), 
                examine the board state carefully to determine which one is the legal move.

                IMPORTANT: Your response must be only in the format "e2 to e4" - just the starting square and the ending square separated by " to ".
                If you can't determine the exact move, respond with ONLY: "unclear".
            `;

            const response = await fetch(geminiApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            });

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0) {
                const moveText = data.candidates[0].content.parts[0].text.trim();
                if (moveText.toLowerCase() !== 'unclear' && moveText.includes(' to ')) {
                    return moveText;
                }
            }
            return null;
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    async playBlackMove() {
        // Show thinking indicator
        const turnElement = document.getElementById('turn');
        const originalText = turnElement.textContent;
        turnElement.textContent = "Black is thinking...";
        
        try {
            const apiKey = 'AIzaSyC4mCuQuGYBnS_8AVNesUDOQsk7_kBX6R8';
            const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

            const boardStateText = this.getBoardStateAsText();
            
            // Generate a simpler list of moves in more direct format for the AI
            const simpleLegalMoves = [];
            // Loop through all squares on the board
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = this.gameState.boardState[row][col];
                    
                    // Skip empty squares and opponent's pieces
                    if (!piece || piece.color !== this.turn) continue;
                    
                    const fromSquare = `${String.fromCharCode(97 + col)}${8 - row}`;
                    const pieceElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`).querySelector('.piece');
                    const validMoves = this.calculateValidMoves(pieceElement);
                    
                    validMoves.forEach(move => {
                        const toSquare = `${String.fromCharCode(97 + move.col)}${8 - move.row}`;
                        simpleLegalMoves.push(`${fromSquare} to ${toSquare}`);
                    });
                }
            }
            
            const prompt = `
                You are playing as BLACK in a chess game. Choose one of these legal moves:
                
                Current board state (uppercase=white, lowercase=black):
                ${boardStateText}
                
                Legal moves for black:
                ${simpleLegalMoves.join('\n')}

                Output only the exact move you choose in the format "e7 to e5". Nothing else.
            `;

            console.log("Sending prompt to AI:", prompt);

            const response = await fetch(geminiApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { 
                        temperature: 0.2,
                        maxOutputTokens: 20
                    }
                }),
            });

            const data = await response.json();
            console.log("AI response data:", data);
            
            if (data.candidates && data.candidates.length > 0) {
                let moveText = data.candidates[0].content.parts[0].text.trim();
                console.log('Raw AI response:', moveText);
                
                // Extract just the move part if there's extra text
                const movePattern = /([a-h][1-8])\s+to\s+([a-h][1-8])/i;
                const match = moveText.match(movePattern);
                
                if (match) {
                    moveText = `${match[1]} to ${match[2]}`;
                    console.log('Cleaned AI move:', moveText);
                    
                    // Execute the move after a small delay for better UX
                    await new Promise(resolve => setTimeout(resolve, 500));
                    this.executeMove(moveText);
                    return true;
                } else {
                    console.error("Couldn't extract valid move format from AI response");
                }
            } else {
                console.error("No valid candidates in the API response");
            }
            
            this.showNotification("AI couldn't select a move. You can play as black for this turn.");
            return false;
        } catch (error) {
            console.error('AI move error:', error);
            this.showNotification('Error with AI player. You can play as black for now.');
            return false;
        } finally {
            // Reset turn display if we're still on black's turn
            if (this.turn === 'black') {
                turnElement.textContent = originalText;
            }
        }
    }

    // Helper function to convert the current board state to text for Gemini
    getBoardStateAsText() {
        let result = '';
        for (let row = 0; row < 8; row++) {
            let rowText = '';
            for (let col = 0; col < 8; col++) {
                const piece = this.gameState.boardState[row][col];
                if (piece) {
                    // Use algebraic notation: uppercase for white, lowercase for black
                    let symbol = ' ';
                    switch (piece.type) {
                        case 'pawn': symbol = 'P'; break;
                        case 'knight': symbol = 'N'; break;
                        case 'bishop': symbol = 'B'; break;
                        case 'rook': symbol = 'R'; break;
                        case 'queen': symbol = 'Q'; break;
                        case 'king': symbol = 'K'; break;
                    }
                    // Lowercase for black pieces
                    if (piece.color === 'black') {
                        symbol = symbol.toLowerCase();
                    }
                    rowText += symbol;
                } else {
                    rowText += '.';
                }
            }
            result += rowText + '\n';
        }
        return result;
    }

    // Helper function to get all legal moves for the current position
    getLegalMovesDescription() {
        const legalMoves = [];
        
        // Loop through all squares on the board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.gameState.boardState[row][col];
                
                // Skip empty squares and opponent's pieces
                if (!piece || piece.color !== this.turn) continue;
                
                // Get the current position in algebraic notation
                const fromSquare = `${String.fromCharCode(97 + col)}${8 - row}`;
                
                // Get a DOM reference to the piece
                const pieceElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`).querySelector('.piece');
                
                // Calculate valid moves for this piece
                const validMoves = this.calculateValidMoves(pieceElement);
                
                // Convert valid moves to algebraic notation
                validMoves.forEach(move => {
                    const toSquare = `${String.fromCharCode(97 + move.col)}${8 - move.row}`;
                    const pieceType = piece.type.charAt(0).toUpperCase() + piece.type.slice(1);
                    const targetPiece = this.gameState.boardState[move.row][move.col];
                    const isCapture = targetPiece !== null;
                    
                    legalMoves.push(`${pieceType} from ${fromSquare} to ${toSquare}${isCapture ? ' (capturing)' : ''}`);
                });
            }
        }
        
        return legalMoves.join('\n');
    }

    executeMove(move) {
        // Convert algebraic notation to row/col indices
        const [from, to] = move.split(' to ');
        if (!from || !to) {
            this.showNotification('Invalid move format. Please try again.');
            return;
        }

        // Clean the strings just in case there's any extra whitespace
        const cleanFrom = from.trim();
        const cleanTo = to.trim();
        
        // Check that we have valid square references
        if (cleanFrom.length !== 2 || cleanTo.length !== 2) {
            this.showNotification(`Invalid square references: "${cleanFrom}" or "${cleanTo}"`);
            return;
        }

        const fromCol = cleanFrom.charCodeAt(0) - 'a'.charCodeAt(0);
        const fromRow = 8 - parseInt(cleanFrom[1]);
        const toCol = cleanTo.charCodeAt(0) - 'a'.charCodeAt(0);
        const toRow = 8 - parseInt(cleanTo[1]);

        if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 || toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
            this.showNotification('Invalid move coordinates. Please try again.');
            return;
        }

        const oldSquare = document.querySelector(`[data-row="${fromRow}"][data-col="${fromCol}"]`);
        const targetSquare = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);

        if (!oldSquare || !targetSquare) {
            this.showNotification('Could not find the squares on the board.');
            return;
        }

        const piece = oldSquare.querySelector('.piece');
        if (!piece) {
            this.showNotification('No piece found on the starting square.');
            return;
        }

        // Check if the piece belongs to the current player
        if (piece.dataset.color !== this.turn) {
            this.showNotification(`It's ${this.turn}'s turn. You can't move the ${piece.dataset.color} ${piece.dataset.type}.`);
            return;
        }

        // Select the piece
        this.selectedPiece = piece;
        
        // Calculate valid moves for this piece
        this.highlightValidMoves(piece);
        
        // Check if the target is a valid move
        if (this.isValidMove(targetSquare)) {
            this.movePiece(targetSquare);
            this.clearHighlights();
            this.selectedPiece = null;
        } else {
            // Provide more specific feedback about why the move is invalid
            const pieceType = piece.dataset.type;
            const fromSquare = `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`;
            const toSquare = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
            
            this.showNotification(`${pieceType} from ${fromSquare} cannot move to ${toSquare}. Try another move.`);
            this.clearHighlights();
            this.selectedPiece = null;
        }
    }

    showNotification(message) {
        // Check if notification container exists, create if not
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Create and display notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        
        // Fade in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    showPromotionModal(color) {
        const modal = document.getElementById('promotion-modal');
        const options = modal.querySelectorAll('.promotion-piece');
        
        // Set the correct piece images based on color
        options.forEach(option => {
            const piece = option.dataset.piece;
            option.style.backgroundImage = `url('https://upload.wikimedia.org/wikipedia/commons/${
                this.getPieceImagePath(piece, color)
            }')`;
        });
        
        modal.classList.add('show');
        
        // Return a promise that will resolve with the chosen piece
        return new Promise((resolve) => {
            this.promotionCallback = resolve;
        });
    }
    
    hidePromotionModal() {
        document.getElementById('promotion-modal').classList.remove('show');
        this.promotionCallback = null;
    }
    
    getPieceImagePath(type, color) {
        const paths = {
            white: {
                king: '4/42/Chess_klt45.svg',
                queen: '1/15/Chess_qlt45.svg',
                rook: '7/72/Chess_rlt45.svg',
                bishop: 'b/b1/Chess_blt45.svg',
                knight: '7/70/Chess_nlt45.svg',
                pawn: '4/45/Chess_plt45.svg'
            },
            black: {
                king: 'f/f0/Chess_kdt45.svg',
                queen: '4/47/Chess_qdt45.svg',
                rook: 'f/ff/Chess_rdt45.svg',
                bishop: '9/98/Chess_bdt45.svg',
                knight: 'e/ef/Chess_ndt45.svg',
                pawn: 'c/c7/Chess_pdt45.svg'
            }
        };
        return paths[color][type];
    }

    resetGame() {
        this.board.innerHTML = '';
        this.turn = 'white';
        this.selectedPiece = null;
        this.moveHistory = [];
        this.gameState = {
            boardState: Array(8).fill().map(() => Array(8).fill(null)),
            castlingRights: {
                white: { kingSide: true, queenSide: true },
                black: { kingSide: true, queenSide: true }
            },
            enPassantTarget: null,
            halfMoveClock: 0,
            fullMoveNumber: 1,
            kings: { white: null, black: null }
        };
        this.setupBoard();
        this.updateTurnDisplay();
        document.getElementById('check-status').textContent = '';
    }
    
    undoMove() {
        if (this.moveHistory.length === 0) return;
        
        const lastMove = this.moveHistory.pop();
        this.gameState = lastMove.gameState;
        this.turn = lastMove.turn;
        
        // Rebuild the board based on the gameState
        this.board.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 ? 'black' : 'white'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                const piece = this.gameState.boardState[row][col];
                if (piece) {
                    this.addPiece(square, piece.type, piece.color);
                }
                
                this.board.appendChild(square);
            }
        }
        
        // Update the turn and check display
        this.updateTurnDisplay();
    }

    isValidMove(targetSquare) {
        return targetSquare.classList.contains('valid-move');
    }

    async movePiece(targetSquare) {
        const oldSquare = this.selectedPiece.parentElement;
        const fromRow = parseInt(oldSquare.dataset.row);
        const fromCol = parseInt(oldSquare.dataset.col);
        const toRow = parseInt(targetSquare.dataset.row);
        const toCol = parseInt(targetSquare.dataset.col);
        const piece = this.gameState.boardState[fromRow][fromCol];
        const targetPiece = this.gameState.boardState[toRow][toCol];
        const pieceType = this.selectedPiece.dataset.type;
        const pieceColor = this.selectedPiece.dataset.color;
        
        // Save the current state for undo functionality
        this.moveHistory.push({
            turn: this.turn,
            gameState: JSON.parse(JSON.stringify(this.gameState)),
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: pieceType,
            captured: targetPiece ? targetPiece.type : null,
            moveNumber: this.gameState.fullMoveNumber
        });
        
        // Handle special moves
        let moveNotation = '';
        
        // 1. Castling
        if (pieceType === 'king' && Math.abs(fromCol - toCol) === 2) {
            await this.performCastling(fromRow, fromCol, toRow, toCol);
            moveNotation = fromCol < toCol ? 'O-O' : 'O-O-O';
        }
        // 2. En Passant
        else if (pieceType === 'pawn' && Math.abs(fromCol - toCol) === 1 && !targetPiece) {
            await this.performEnPassant(fromRow, fromCol, toRow, toCol);
            moveNotation = `${String.fromCharCode(97 + fromCol)}x${String.fromCharCode(97 + toCol)}${8 - toRow} e.p.`;
        }
        // 3. Pawn Promotion
        else if (pieceType === 'pawn' && (toRow === 0 || toRow === 7)) {
            const promotionPiece = await this.promotePawn(fromRow, fromCol, toRow, toCol, targetSquare);
            if (targetPiece) {
                moveNotation = `${String.fromCharCode(97 + fromCol)}x${String.fromCharCode(97 + toCol)}${8 - toRow}=${promotionPiece.toUpperCase()}`;
            } else {
                moveNotation = `${String.fromCharCode(97 + toCol)}${8 - toRow}=${promotionPiece.toUpperCase()}`;
            }
        } 
        // Regular move/capture
        else {
            // Animation
            this.selectedPiece.classList.add('moving');
            
            // Remove any existing piece in the target square (capture)
            if (targetSquare.querySelector('.piece')) {
                targetSquare.removeChild(targetSquare.querySelector('.piece'));
            }

            // Move the piece
            targetSquare.appendChild(this.selectedPiece);
            
            setTimeout(() => {
                this.selectedPiece.classList.remove('moving');
            }, 200);

            // Update board state
            this.gameState.boardState[toRow][toCol] = piece;
            this.gameState.boardState[fromRow][fromCol] = null;

            // Create move notation
            if (pieceType === 'pawn') {
                if (targetPiece) {
                    moveNotation = `${String.fromCharCode(97 + fromCol)}x${String.fromCharCode(97 + toCol)}${8 - toRow}`;
                } else {
                    moveNotation = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
                }
            } else {
                const pieceSymbol = pieceType.charAt(0).toUpperCase();
                if (pieceSymbol === 'K') {
                    moveNotation = targetPiece ? `K${String.fromCharCode(97 + toCol)}${8 - toRow}` : `Kx${String.fromCharCode(97 + toCol)}${8 - toRow}`;
                } else {
                    moveNotation = `${pieceSymbol}${targetPiece ? 'x' : ''}${String.fromCharCode(97 + toCol)}${8 - toRow}`;
                }
            }

            // Update king position if king moved
            if (pieceType === 'king') {
                this.gameState.kings[pieceColor] = { row: toRow, col: toCol };
                // Update castling rights
                this.gameState.castlingRights[pieceColor].kingSide = false;
                this.gameState.castlingRights[pieceColor].queenSide = false;
            }

            // Update castling rights if rook moved
            if (pieceType === 'rook') {
                if (fromRow === (pieceColor === 'white' ? 7 : 0)) {
                    if (fromCol === 0) {
                        this.gameState.castlingRights[pieceColor].queenSide = false;
                    } else if (fromCol === 7) {
                        this.gameState.castlingRights[pieceColor].kingSide = false;
                    }
                }
            }

            // Set en passant target if pawn moved two squares
            if (pieceType === 'pawn' && Math.abs(fromRow - toRow) === 2) {
                const enPassantRow = pieceColor === 'white' ? toRow + 1 : toRow - 1;
                this.gameState.enPassantTarget = { row: enPassantRow, col: toCol };
            } else {
                this.gameState.enPassantTarget = null;
            }
        }
        
        // Switch turn
        this.turn = this.turn === 'white' ? 'black' : 'white';
        
        // Update full move counter if black just moved
        if (this.turn === 'white') {
            this.gameState.fullMoveNumber++;
        }
        
        // Check if the new current player is in check/checkmate
        const inCheck = this.isInCheck(this.turn);
        
        // Add check symbol to notation if applicable
        if (inCheck) {
            if (this.isCheckmate(this.turn)) {
                moveNotation += '#';
                setTimeout(() => {
                    this.showNotification(`Checkmate! ${this.turn === 'white' ? 'Black' : 'White'} wins!`);
                }, 300);
            } else {
                moveNotation += '+';
            }
        }
        
        // Move history display functionality removed
        
        // Update the display
        this.updateTurnDisplay();
    }
    
    addMoveToHistory(notation) {
        console.log(`Move: ${notation}`); // Just log the move for debugging
    }

    async performCastling(fromRow, fromCol, toRow, toCol) {
        const kingPiece = this.selectedPiece;
        const direction = fromCol < toCol ? 1 : -1;
        const rookCol = direction === 1 ? 7 : 0;
        const newRookCol = direction === 1 ? toCol - 1 : toCol + 1;
        
        // Find the rook square
        const rookSquare = document.querySelector(`[data-row="${fromRow}"][data-col="${rookCol}"]`);
        const rookPiece = rookSquare.querySelector('.piece');
        const newRookSquare = document.querySelector(`[data-row="${fromRow}"][data-col="${newRookCol}"]`);
        const targetSquare = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
        
        // Animate move
        kingPiece.classList.add('moving');
        rookPiece.classList.add('moving');
        
        // Move the king
        targetSquare.appendChild(kingPiece);
        
        // Move the rook
        newRookSquare.appendChild(rookPiece);
        
        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        kingPiece.classList.remove('moving');
        rookPiece.classList.remove('moving');
        
        // Update the board state
        this.gameState.boardState[fromRow][toCol] = { type: 'king', color: this.turn };
        this.gameState.boardState[fromRow][newRookCol] = { type: 'rook', color: this.turn };
        this.gameState.boardState[fromRow][fromCol] = null;
        this.gameState.boardState[fromRow][rookCol] = null;
        
        // Update king position
        this.gameState.kings[this.turn] = { row: fromRow, col: toCol };
        
        // Update castling rights
        this.gameState.castlingRights[this.turn].kingSide = false;
        this.gameState.castlingRights[this.turn].queenSide = false;
    }

    async performEnPassant(fromRow, fromCol, toRow, toCol) {
        const pieceColor = this.selectedPiece.dataset.color;
        const targetSquare = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
        
        // Move the pawn
        this.selectedPiece.classList.add('moving');
        targetSquare.appendChild(this.selectedPiece);
        
        // Remove the captured pawn
        const capturedRow = fromRow;
        const capturedSquare = document.querySelector(`[data-row="${capturedRow}"][data-col="${toCol}"]`);
        if (capturedSquare.querySelector('.piece')) {
            capturedSquare.removeChild(capturedSquare.querySelector('.piece'));
        }
        
        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        this.selectedPiece.classList.remove('moving');
        
        // Update the board state
        this.gameState.boardState[toRow][toCol] = { type: 'pawn', color: pieceColor };
        this.gameState.boardState[fromRow][fromCol] = null;
        this.gameState.boardState[capturedRow][toCol] = null;
    }

    async promotePawn(fromRow, fromCol, toRow, toCol, targetSquare) {
        const pieceColor = this.selectedPiece.dataset.color;
        
        // Remove any existing piece in the target square (capture)
        if (targetSquare.querySelector('.piece')) {
            targetSquare.removeChild(targetSquare.querySelector('.piece'));
        }
        
        // Move the pawn to the target square temporarily
        targetSquare.appendChild(this.selectedPiece);
        
        // Open the promotion modal and wait for selection
        const promotionPiece = await this.showPromotionModal(pieceColor);
        
        // Remove the pawn
        targetSquare.removeChild(this.selectedPiece);
        
        // Add the promotion piece
        this.addPiece(targetSquare, promotionPiece, pieceColor);
        
        // Update the board state
        this.gameState.boardState[toRow][toCol] = { type: promotionPiece, color: pieceColor };
        this.gameState.boardState[fromRow][fromCol] = null;
        
        return promotionPiece;
    }

    updateTurnDisplay() {
        const color = this.turn.charAt(0).toUpperCase() + this.turn.slice(1);
        const turnElement = document.getElementById('turn');
        const checkStatusElement = document.getElementById('check-status');
        
        turnElement.textContent = `${color}'s turn`;
        
        // Update check status
        if (this.isInCheck(this.turn)) {
            if (this.isCheckmate(this.turn)) {
                checkStatusElement.textContent = 'Checkmate!';
            } else {
                checkStatusElement.textContent = 'Check!';
            }
            
            // Highlight the king
            const kingPos = this.gameState.kings[this.turn];
            const kingSquare = document.querySelector(`[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
            kingSquare.classList.add('check-indicator');
        } else if (this.isStalemate(this.turn)) {
            checkStatusElement.textContent = 'Stalemate - Draw!';
        } else {
            checkStatusElement.textContent = '';
            // Remove any check indicators
            document.querySelectorAll('.check-indicator').forEach(square => {
                square.classList.remove('check-indicator');
            });
        }
        
        // When it's Black's turn, have Gemini play
        if (this.turn === 'black') {
            setTimeout(() => this.playBlackMove(), 500);
        }
    }

    clearHighlights() {
        document.querySelectorAll('.highlighted, .valid-move, .valid-move.capture').forEach(el => {
            el.classList.remove('highlighted', 'valid-move', 'capture');
        });
    }

    highlightValidMoves(piece) {
        this.clearHighlights();
        const currentSquare = piece.parentElement;
        currentSquare.classList.add('highlighted');
        
        // Get valid moves based on piece type and position
        const validMoves = this.calculateValidMoves(piece);
        validMoves.forEach(move => {
            const square = document.querySelector(
                `[data-row="${move.row}"][data-col="${move.col}"]`
            );
            if (square) {
                square.classList.add('valid-move');
                
                // Add capture class if there's a piece to capture
                if (square.querySelector('.piece') || 
                    (piece.dataset.type === 'pawn' && 
                     Math.abs(parseInt(currentSquare.dataset.col) - move.col) === 1 && 
                     this.gameState.enPassantTarget &&
                     this.gameState.enPassantTarget.row === move.row &&
                     this.gameState.enPassantTarget.col === move.col)) {
                    square.classList.add('capture');
                }
            }
        });
    }

    calculateValidMoves(piece) {
        const pieceType = piece.dataset.type;
        const pieceColor = piece.dataset.color;
        const currentSquare = piece.parentElement;
        const row = parseInt(currentSquare.dataset.row);
        const col = parseInt(currentSquare.dataset.col);
        let moves = [];

        switch (pieceType) {
            case 'pawn':
                moves = this.getPawnMoves(row, col, pieceColor);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col, pieceColor);
                break;
            case 'knight':
                moves = this.getKnightMoves(row, col, pieceColor);
                break;
            case 'bishop':
                moves = this.getBishopMoves(row, col, pieceColor);
                break;
            case 'queen':
                moves = this.getQueenMoves(row, col, pieceColor);
                break;
            case 'king':
                moves = this.getKingMoves(row, col, pieceColor);
                break;
        }

        // Filter out moves that would put or leave the king in check
        return moves.filter(move => {
            return !this.wouldBeInCheck(row, col, move.row, move.col, pieceColor);
        });
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        
        // Forward move (1 square)
        let nextRow = row + direction;
        if (nextRow >= 0 && nextRow < 8 && !this.gameState.boardState[nextRow][col]) {
            moves.push({ row: nextRow, col: col });
            
            // Forward move (2 squares from starting position)
            if (row === startRow) {
                nextRow = row + 2 * direction;
                if (!this.gameState.boardState[nextRow][col]) {
                    moves.push({ row: nextRow, col: col });
                }
            }
        }
        
        // Capture moves (diagonally)
        [-1, 1].forEach(colOffset => {
            const captureCol = col + colOffset;
            if (captureCol >= 0 && captureCol < 8) {
                // Regular capture
                const captureRow = row + direction;
                if (captureRow >= 0 && captureRow < 8) {
                    const target = this.gameState.boardState[captureRow][captureCol];
                    if (target && target.color !== color) {
                        moves.push({ row: captureRow, col: captureCol });
                    }
                }
                
                // En Passant capture
                if (this.gameState.enPassantTarget && 
                    this.gameState.enPassantTarget.row === row + direction && 
                    this.gameState.enPassantTarget.col === captureCol) {
                    moves.push({ row: row + direction, col: captureCol });
                }
            }
        });
        
        return moves;
    }

    getRookMoves(row, col, color) {
        const moves = [];
        const directions = [
            { row: -1, col: 0 }, // up
            { row: 1, col: 0 },  // down
            { row: 0, col: -1 }, // left
            { row: 0, col: 1 }   // right
        ];
        
        directions.forEach(dir => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + dir.row * i;
                const newCol = col + dir.col * i;
                
                if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) {
                    break; // Off the board
                }
                
                const target = this.gameState.boardState[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol }); // Empty square
                } else {
                    if (target.color !== color) {
                        moves.push({ row: newRow, col: newCol }); // Capture
                    }
                    break; // Blocked
                }
            }
        });
        
        return moves;
    }

    getKnightMoves(row, col, color) {
        const moves = [];
        const knightMoves = [
            { row: -2, col: -1 }, { row: -2, col: 1 },
            { row: -1, col: -2 }, { row: -1, col: 2 },
            { row: 1, col: -2 }, { row: 1, col: 2 },
            { row: 2, col: -1 }, { row: 2, col: 1 }
        ];
        
        knightMoves.forEach(move => {
            const newRow = row + move.row;
            const newCol = col + move.col;
            
            if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.gameState.boardState[newRow][newCol];
                if (!target || target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });
        
        return moves;
    }

    getBishopMoves(row, col, color) {
        const moves = [];
        const directions = [
            { row: -1, col: -1 }, // up-left
            { row: -1, col: 1 },  // up-right
            { row: 1, col: -1 },  // down-left
            { row: 1, col: 1 }    // down-right
        ];
        
        directions.forEach(dir => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + dir.row * i;
                const newCol = col + dir.col * i;
                
                if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) {
                    break; // Off the board
                }
                
                const target = this.gameState.boardState[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol }); // Empty square
                } else {
                    if (target.color !== color) {
                        moves.push({ row: newRow, col: newCol }); // Capture
                    }
                    break; // Blocked
                }
            }
        });
        
        return moves;
    }

    getQueenMoves(row, col, color) {
        // Queen moves like a rook and bishop combined
        return [...this.getRookMoves(row, col, color), ...this.getBishopMoves(row, col, color)];
    }

    getKingMoves(row, col, color) {
        const moves = [];
        // All 8 directions around the king
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue; // Skip the current position
                
                const newRow = row + i;
                const newCol = col + j;
                
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = this.gameState.boardState[newRow][newCol];
                    if (!target || target.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        
        // Castling
        if (this.canCastle(row, col, color)) {
            // Kingside castling
            if (this.gameState.castlingRights[color].kingSide) {
                moves.push({ row: row, col: col + 2 });
            }
            // Queenside castling
            if (this.gameState.castlingRights[color].queenSide) {
                moves.push({ row: row, col: col - 2 });
            }
        }
        
        return moves;
    }

    canCastle(row, col, color) {
        // Check if king and rooks are in their initial positions
        const castlingRights = this.gameState.castlingRights[color];
        if (!castlingRights.kingSide && !castlingRights.queenSide) {
            return false;
        }
        
        // Can't castle when in check
        if (this.isInCheck(color)) {
            return false;
        }
        
        // Use local variables instead of mutating castlingRights
        let canKingside = castlingRights.kingSide;
        let canQueenside = castlingRights.queenSide;
        
        // Check if path is clear for kingside castling
        if (canKingside) {
            for (let c = col + 1; c < 7; c++) {
                if (this.gameState.boardState[row][c] || this.wouldBeInCheck(row, col, row, c, color)) {
                    canKingside = false;
                    break;
                }
            }
        }
        
        // Check if path is clear for queenside castling
        if (canQueenside) {
            for (let c = col - 1; c > 0; c--) {
                if (this.gameState.boardState[row][c] || (c > 1 && this.wouldBeInCheck(row, col, row, c, color))) {
                    canQueenside = false;
                    break;
                }
            }
        }
        
        return canKingside || canQueenside;
    }

    isInCheck(color) {
        const kingPos = this.gameState.kings[color];
        if (!kingPos) return false;
        
        return this.isSquareAttacked(kingPos.row, kingPos.col, color);
    }

    isSquareAttacked(row, col, defendingColor) {
        const attackers = defendingColor === 'white' ? 'black' : 'white';
        
        // Check for attacks by pawns
        const pawnDirection = defendingColor === 'white' ? 1 : -1;
        [1, -1].forEach(colOffset => {
            const attackRow = row + pawnDirection;
            const attackCol = col + colOffset;
            
            if (attackRow >= 0 && attackRow < 8 && attackCol >= 0 && attackCol < 8) {
                const piece = this.gameState.boardState[attackRow][attackCol];
                if (piece && piece.type === 'pawn' && piece.color === attackers) {
                    return true;
                }
            }
        });
        
        // Check for attacks by knights
        const knightMoves = [
            { row: -2, col: -1 }, { row: -2, col: 1 },
            { row: -1, col: -2 }, { row: -1, col: 2 },
            { row: 1, col: -2 }, { row: 1, col: 2 },
            { row: 2, col: -1 }, { row: 2, col: 1 }
        ];
        
        for (const move of knightMoves) {
            const attackRow = row + move.row;
            const attackCol = col + move.col;
            
            if (attackRow >= 0 && attackRow < 8 && attackCol >= 0 && attackCol < 8) {
                const piece = this.gameState.boardState[attackRow][attackCol];
                if (piece && piece.type === 'knight' && piece.color === attackers) {
                    return true;
                }
            }
        }
        
        // Check for attacks by bishops, rooks, and queens
        const directions = [
            { row: -1, col: 0, pieces: ['rook', 'queen'] },      // up
            { row: 1, col: 0, pieces: ['rook', 'queen'] },       // down
            { row: 0, col: -1, pieces: ['rook', 'queen'] },      // left
            { row: 0, col: 1, pieces: ['rook', 'queen'] },       // right
            { row: -1, col: -1, pieces: ['bishop', 'queen'] },   // up-left
            { row: -1, col: 1, pieces: ['bishop', 'queen'] },    // up-right
            { row: 1, col: -1, pieces: ['bishop', 'queen'] },    // down-left
            { row: 1, col: 1, pieces: ['bishop', 'queen'] }      // down-right
        ];
        
        for (const dir of directions) {
            for (let i = 1; i < 8; i++) {
                const attackRow = row + dir.row * i;
                const attackCol = col + dir.col * i;
                
                if (attackRow < 0 || attackRow >= 8 || attackCol < 0 || attackCol >= 8) {
                    break; // Off the board
                }
                
                const piece = this.gameState.boardState[attackRow][attackCol];
                if (piece) {
                    if (piece.color === attackers && dir.pieces.includes(piece.type)) {
                        return true;
                    }
                    break; // Blocked
                }
            }
        }
        
        // Check for attacks by king
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                
                const attackRow = row + i;
                const attackCol = col + j;
                
                if (attackRow >= 0 && attackRow < 8 && attackCol >= 0 && attackCol < 8) {
                    const piece = this.gameState.boardState[attackRow][attackCol];
                    if (piece && piece.type === 'king' && piece.color === attackers) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
        // Make a temporary move to see if it would result in check
        const boardCopy = JSON.parse(JSON.stringify(this.gameState.boardState));
        const kingsCopy = JSON.parse(JSON.stringify(this.gameState.kings));
        
        const movingPiece = boardCopy[fromRow][fromCol];
        
        // Update board copy
        boardCopy[toRow][toCol] = movingPiece;
        boardCopy[fromRow][fromCol] = null;
        
        // Update king position if king is moving
        if (movingPiece && movingPiece.type === 'king' && movingPiece.color === color) {
            kingsCopy[color] = { row: toRow, col: toCol };
        }
        
        // Check if the king is in check after the move
        const kingPos = kingsCopy[color];
        
        // Temporarily modify gameState to check for check
        const originalBoardState = this.gameState.boardState;
        const originalKings = this.gameState.kings;
        
        this.gameState.boardState = boardCopy;
        this.gameState.kings = kingsCopy;
        
        const inCheck = this.isSquareAttacked(kingPos.row, kingPos.col, color);
        
        // Restore original gameState
        this.gameState.boardState = originalBoardState;
        this.gameState.kings = originalKings;
        
        return inCheck;
    }

    isCheckmate(color) {
        // If not in check, it's not checkmate
        if (!this.isInCheck(color)) {
            return false;
        }
        
        // Look for any legal move for any piece of the specified color
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.gameState.boardState[row][col];
                if (piece && piece.color === color) {
                    const pieceElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`).querySelector('.piece');
                    const legalMoves = this.calculateValidMoves(pieceElement);
                    if (legalMoves.length > 0) {
                        return false; // Found at least one legal move
                    }
                }
            }
        }
        
        // No legal moves found, it's checkmate
        return true;
    }

    isStalemate(color) {
        // If in check, it's not stalemate
        if (this.isInCheck(color)) {
            return false;
        }
        
        // Look for any legal move for any piece of the specified color
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.gameState.boardState[row][col];
                if (piece && piece.color === color) {
                    const pieceElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`).querySelector('.piece');
                    const legalMoves = this.calculateValidMoves(pieceElement);
                    if (legalMoves.length > 0) {
                        return false; // Found at least one legal move
                    }
                }
            }
        }
        
        // No legal moves found but not in check, it's stalemate
        return true;
    }
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
