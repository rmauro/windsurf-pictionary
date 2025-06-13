from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json

from game import Game
from connection_manager import ConnectionManager

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton instances
game = Game()
manager = ConnectionManager()

async def notify_game_state():
    """Notifies all clients about the current game state."""
    drawer_id = game.get_current_drawer()
    drawer_name = game.get_player_name(drawer_id) if drawer_id else "N/A"

    if drawer_id is None:
        state_message = {"type": "game_state", "drawer_name": None, "is_drawing": False, "word": ""}
        await manager.broadcast_json(state_message)
        return

    for cid, connection in manager.active_connections.items():
        is_drawer = (cid == drawer_id)
        word_to_send = ""
        if game.current_word:
            if is_drawer:
                word_to_send = game.current_word
            else:
                word_to_send = " ".join("_" for _ in game.current_word)

        state_message = {
            "type": "game_state",
            "drawer_name": drawer_name,
            "is_drawing": is_drawer,
            "word": word_to_send
        }
        await connection.send_text(json.dumps(state_message))

@app.get("/")
def read_root():
    return {"message": "Pictionary backend is running"}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                msg_type = message_data.get("type")
                
                is_in_game = client_id in game.players

                if msg_type == "set_name":
                    new_name = message_data.get("name", "").strip()
                    if not new_name:
                        continue

                    if is_in_game:
                        old_name = game.get_player_name(client_id)
                        game.set_player_name(client_id, new_name)
                        await manager.broadcast_json({
                            "type": "notification",
                            "message": f"{old_name} is now known as {new_name}"
                        })
                    else:
                        was_empty = not game.player_order
                        game.add_player(client_id)
                        game.set_player_name(client_id, new_name)

                        if was_empty and game.player_order:
                            game.start_game()
                        
                        await manager.broadcast_json({"type": "notification", "message": f"{new_name} has joined."})
                    
                    await notify_game_state()

                elif is_in_game:
                    # Handle drawing data from the current drawer
                    if msg_type in ["start", "draw", "end"] and client_id == game.get_current_drawer():
                        await manager.broadcast_to_others(data, client_id)

                    # Handle guesses from non-drawers
                    elif msg_type == "guess" and client_id != game.get_current_drawer():
                        sender_name = game.get_player_name(client_id)
                        guess = message_data.get("payload", "").strip()
                        if not guess or not game.current_word:
                            continue

                        if guess.lower() == game.current_word.lower():
                            await manager.broadcast_json({
                                "type": "notification",
                                "message": f"{sender_name} guessed it! The word was: {game.current_word}"
                            })
                            game.next_turn()
                            await notify_game_state()
                        else:
                            await manager.broadcast_json({
                                "type": "chat",
                                "sender_name": sender_name,
                                "message": guess
                            })
            
            except json.JSONDecodeError:
                # This block should not be hit by drawing data anymore, but is kept for robustness
                print(f"Received invalid non-JSON message from client #{client_id}")

    except WebSocketDisconnect:
        if client_id in game.players:
            player_name = game.get_player_name(client_id)
            manager.disconnect(client_id)
            game.remove_player(client_id)
            await manager.broadcast_json({"type": "notification", "message": f"{player_name} has left."})
            await notify_game_state()
        else:
            manager.disconnect(client_id)

