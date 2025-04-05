# Voice-Enabled Chess: Instructions Manual

## Introduction

Welcome to Voice-Enabled Chess, an interactive chess game that allows you to make moves using voice commands. This application combines traditional chess gameplay with modern speech recognition technology for an intuitive and accessible experience.

## Getting Started

1. **Launch the application**: Open index.html in a modern browser (Chrome recommended for best speech recognition support).
2. **Game Interface**: You'll see the chess board on the left and control buttons on the right.
3. **Initial Setup**: The game starts with pieces in standard chess positions. White moves first.

## Making Moves

### Using the Mouse

1. Click on a piece to select it.
2. Valid moves will be highlighted on the board.
3. Click on a highlighted square to move the selected piece.

### Using Voice Commands

1. Click the "Speak Move" button with the microphone icon.
2. When the button turns orange, speak your move clearly.
3. Wait for the system to process your command.

## Voice Command Examples

The system understands various formats of chess notation:

- **Square to square**: "e2 to e4" (moves pawn from e2 to e4) - **RECOMMENDED FORMAT**
- **Piece + destination**: "Knight to f3" (moves knight to f3)
- **Captures**: "Pawn e4 takes d5" or "e4 to d5" (captures piece on d5)
- **Disambiguating pieces**: "Knight on g1 to f3" (specifies which knight to move)
- **Castling**: "Castle kingside" or "Castle queenside"

## Tips for Best Voice Recognition

- **BE SPECIFIC**: Always include both the starting and ending square when possible (e.g., "e2 to e4")
- Speak clearly at a normal pace
- Use chess terminology (pawn, knight, bishop, rook, queen, king)
- For capturing, specify both origin and destination squares (e.g., "e4 to d5")
- If a move isn't recognized, try stating the specific squares ("bishop c1 to g5")

## Game Controls

- **New Game**: Resets the board to the starting position
- **Undo Move**: Takes back the last move made
- **Speak Move**: Activates speech recognition to listen for your next move

## Feedback System

- The system will provide visual feedback for invalid moves
- Notifications will appear at the bottom right of the screen
- The current player's turn is displayed above the buttons

## Common Issues

- **Move not recognized**: Always try using the format "e2 to e4" for best results
- **Invalid move**: Ensure you're moving a piece that belongs to your color and following chess rules
- **Browser compatibility**: If speech recognition isn't working, try using Google Chrome
