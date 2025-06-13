import json
from typing import Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: int):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: int):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def broadcast_text(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

    async def broadcast_json(self, data: dict):
        await self.broadcast_text(json.dumps(data))

    async def broadcast_to_others(self, message: str, sender_id: int):
        for client_id, connection in self.active_connections.items():
            if client_id != sender_id:
                await connection.send_text(message)
