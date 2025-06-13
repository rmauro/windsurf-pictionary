# Pictionary Game

This is a real-time Pictionary game developed with a Python (FastAPI) backend and a React (TypeScript) frontend.

## Solution Architecture

The solution is divided into two main components:

-   **Backend**: A Python server based on FastAPI that manages the game logic, player connections, and real-time communication via WebSockets.
-   **Frontend**: A Single Page Application (SPA) built with React and TypeScript, which provides the user interface for drawing, guessing, and interacting with the game.

### Main Features

-   Real-time communication with WebSockets.
-   Interactive drawing canvas.
-   Turn-based system for drawing.
-   Chat for submitting guesses.
-   Dynamic game state updates for all players.

### Technologies Used

**Backend:**
-   Python 3.10+
-   FastAPI
-   WebSockets
-   Uvicorn (ASGI server)

**Frontend:**
-   React
-   TypeScript
-   Tailwind CSS
-   Create React App

## Project File Structure

```
/
├── backend/
│   ├── main.py           # Main server logic and WebSocket
│   ├── game.py           # Class that manages game logic
│   ├── connection_manager.py # WebSocket connection manager
│   ├── words.json        # List of words for the game
│   └── ...
├── frontend/
│   ├── src/              # React components source code
│   ├── public/           # Static files
│   ├── package.json      # Frontend dependencies and scripts
│   └── ...
└── README.md             # This file
```

## Backend API Documentation

The backend exposes a WebSocket endpoint for real-time communication.

-   **WebSocket Endpoint**: `ws://localhost:8000/ws/{client_id}`

    The `client_id` is a unique identifier for each player.

### Client to Server Messages

Messages are sent as JSON strings.

-   **Set Player Name**
    ```json
    {
      "type": "set_name",
      "name": "PlayerName"
    }
    ```

-   **Drawing Actions** (sent only by the current drawer)
    ```json
    // Start drawing
    { "type": "start", "payload": { "x": 10, "y": 20 } }

    // Draw
    { "type": "draw", "payload": { "x": 50, "y": 60 } }

    // End drawing
    { "type": "end" }
    ```

-   **Send Guess**
    ```json
    {
      "type": "guess",
      "payload": "word"
    }
    ```

### Server to Client Messages

-   **Game State Update**
    ```json
    {
      "type": "game_state",
      "drawer_name": "PlayerDrawing",
      "is_drawing": true, // or false
      "word": "w _ r d" // or "word" for the drawer
    }
    ```

-   **General Notifications**
    ```json
    {
      "type": "notification",
      "message": "PlayerName guessed the word!"
    }
    ```

-   **Chat Messages**
    ```json
    {
      "type": "chat",
      "sender_name": "PlayerGuessing",
      "message": "Could it be...?"
    }
    ```
