import json
import random
from typing import List, Dict, Optional

class Game:
    def __init__(self):
        self.players: Dict[int, str] = {}
        self.player_order: List[int] = []
        self.current_drawer_index: int = 0
        self.word_list: List[str] = self.load_words()
        self.current_word: Optional[str] = None

    def load_words(self) -> List[str]:
        try:
            with open("words.json", "r") as f:
                words = json.load(f)
                if isinstance(words, list) and words:
                    print(f"Successfully loaded {len(words)} words.")
                    return words
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Error loading words.json: {e}. Using default word list.")
        
        return ["house", "tree", "sun", "car", "book", "chair"]

    def add_player(self, client_id: int):
        if client_id not in self.players:
            self.players[client_id] = f"Player #{client_id}"
            self.player_order.append(client_id)

    def remove_player(self, client_id: int):
        if client_id in self.player_order:
            is_drawer = self.get_current_drawer() == client_id
            self.player_order.remove(client_id)
            del self.players[client_id]

            if is_drawer and self.player_order:
                self.next_turn(force_next=True)
            elif not self.player_order:
                self.current_word = None

    def set_player_name(self, client_id: int, name: str):
        if client_id in self.players:
            self.players[client_id] = name

    def get_player_name(self, client_id: int) -> Optional[str]:
        return self.players.get(client_id)

    def get_current_drawer(self) -> Optional[int]:
        if not self.player_order:
            return None
        return self.player_order[self.current_drawer_index]

    def next_turn(self, force_next=False):
        if not self.player_order:
            self.current_drawer_index = 0
            self.current_word = None
            return
        
        if force_next:
            self.current_drawer_index = self.current_drawer_index % len(self.player_order)
        else:
            self.current_drawer_index = (self.current_drawer_index + 1) % len(self.player_order)
        
        self.current_word = random.choice(self.word_list)

    def start_game(self):
        if self.player_order:
            self.current_drawer_index = 0
            self.current_word = random.choice(self.word_list)
