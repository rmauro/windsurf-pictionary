# Pictionary Game - Backend

This is the backend server for the real-time Pictionary game. It is built with FastAPI and handles all game logic, player connections, and real-time communication using WebSockets.

## Features

-   **Real-time WebSocket Communication**: Manages persistent connections with all players.
-   **Game State Management**: Tracks the current drawer, secret word, player list, and turns.
-   **Player Customization**: Allows players to set their own names.
-   **Dynamic Word List**: Loads drawing words from an external `words.json` file.

## Tech Stack

-   Python 3.10+
-   FastAPI
-   Uvicorn (for serving)

## Environment Variables

To run this project, you will need to create a `.env` file in the `backend` directory. This file stores sensitive configuration.

```
CORS_ORIGINS=http://localhost,http://localhost:3000
```

## Setup and Running

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate
    ```
    *On Windows, use `venv\Scripts\activate`*

3.  **Install dependencies from `requirements.txt`:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the server:**
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```
    The server will be available at `http://localhost:8000` and will automatically reload on code changes.
