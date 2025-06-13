import React, { useRef, useEffect, useState } from 'react';

// --- WebSocket Message Types ---

interface DrawPayload {
  type: 'start' | 'draw';
  x: number;
  y: number;
  color: string;
  lineWidth: number;
}

interface EndPayload { type: 'end'; }
interface ClearPayload { type: 'clear'; }

interface GameStatePayload {
  type: 'game_state';
  drawer_name: string | null;
  is_drawing: boolean;
  word: string;
}

interface NotificationPayload {
  type: 'notification';
  message: string;
}

interface ChatPayload {
  type: 'chat';
  sender_name: string;
  message: string;
}

interface GuessPayload {
  type: 'guess';
  payload: string;
}

interface SetNamePayload {
  type: 'set_name';
  name: string;
}

// A union type for all possible messages
type WebSocketMessage = DrawPayload | EndPayload | ClearPayload | GameStatePayload | NotificationPayload | ChatPayload | GuessPayload | SetNamePayload;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [clientId] = useState(Math.floor(Math.random() * 1000));

  // Drawing tool state
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);

  // Game state
  const [isMyTurnToDraw, setIsMyTurnToDraw] = useState(false);
  const [wordToDraw, setWordToDraw] = useState('');
  const [currentDrawerName, setCurrentDrawerName] = useState<string | null>(null);
  const [gameMessages, setGameMessages] = useState<{ id: number, content: React.ReactNode }[]>([]);
  const [guess, setGuess] = useState('');
  const [myName, setMyName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isInGame, setIsInGame] = useState(false);

  // Function to get canvas context
  const getContext = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  };

  // Establish WebSocket connection
  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8000';
    const socket = new WebSocket(`${wsUrl}/ws/${clientId}`);
    setWs(socket);

    socket.onopen = () => {
      // Connection established
    };

    socket.onclose = () => {
      // Connection closed
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'game_state':
            setIsMyTurnToDraw(message.is_drawing);
            setWordToDraw(message.word);
            setCurrentDrawerName(message.drawer_name);
            break;
          case 'notification':
            setGameMessages(prev => [...prev, { id: Date.now(), content: <div className="text-sm text-gray-500 italic">{message.message}</div> }]);
            break;
          case 'chat':
            setGameMessages(prev => [...prev, { id: Date.now(), content: <div><span className="font-bold">{message.sender_name}:</span> {message.message}</div> }]);
            break;
          case 'clear':
            const ctx = getContext();
            if (ctx && canvasRef.current) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
            break;
          case 'start':
          case 'draw':
            handleIncomingDrawing(message);
            break;
        }
      } catch (error) {
        console.error("Failed to parse message or handle drawing:", error);
      }
    };

    // Cleanup on component unmount
    return () => {
      socket.close();
    };
  }, [clientId]);

  // Function to handle drawing based on incoming data
  const handleIncomingDrawing = (data: WebSocketMessage) => {
    if (data.type !== 'start' && data.type !== 'draw') return;

    const ctx = getContext();
    if (!ctx) return;

    const { type, x, y, color: strokeColor, lineWidth: strokeWidth } = data;
    
    // Apply styles from the message
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'start') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (type === 'draw') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };
  
  // Function to send data via WebSocket
  const sendWebSocketMessage = (message: WebSocketMessage) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMyTurnToDraw) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = getContext();
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    sendWebSocketMessage({ type: 'start', x: offsetX, y: offsetY, color, lineWidth });
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const ctx = getContext();
    if (ctx) ctx.closePath();
    sendWebSocketMessage({ type: 'end' });
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMyTurnToDraw) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = getContext();
    if (!ctx) return;

    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    sendWebSocketMessage({ type: 'draw', x: offsetX, y: offsetY, color, lineWidth });
  };

  const handleClearCanvas = () => {
    if (!isMyTurnToDraw) return; // Only drawer can clear
    const ctx = getContext();
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    sendWebSocketMessage({ type: 'clear' });
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim() && !isMyTurnToDraw) {
      sendWebSocketMessage({ type: 'guess', payload: guess });
      setGuess('');
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = nameInput.trim();
    if (finalName) {
      setMyName(finalName);
      sendWebSocketMessage({ type: 'set_name', name: finalName });
      // For a new player, this action will now trigger the game view
      if (!isInGame) {
        setIsInGame(true);
      }
      setNameInput('');
    }
  };

  const GameStatus = () => {
    if (isMyTurnToDraw) {
      return (
        <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700">
          <p className="font-bold">It's your turn to draw!</p>
          <p>Your word is: <span className="font-mono text-xl tracking-widest">{wordToDraw}</span></p>
        </div>
      );
    }
    return (
      <div className="p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700">
        <p className="font-bold">{currentDrawerName || 'Someone'} is drawing.</p>
        <p>Guess the word: <span className="font-mono text-xl">{wordToDraw}</span></p>
      </div>
    );
  };

  if (!isInGame) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-200 font-sans">
        <div className="p-8 bg-white rounded-lg shadow-xl text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to Pictionary!</h1>
          <p className="text-gray-600 mb-6">Please choose a name to join the game.</p>
          <form onSubmit={handleNameSubmit} className="flex flex-col items-center gap-4">
            <input 
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name..."
              className="p-3 border rounded-md w-64 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button type="submit" className="w-64 px-4 py-3 text-white bg-blue-500 rounded-md hover:bg-blue-600 font-bold">
              Join Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-200 font-sans">
      <div className="w-full max-w-6xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-gray-800">Pictionary Online</h1>
          <div className="text-right">
            <p className="text-gray-600">Playing as:</p>
            <p className="font-bold text-lg text-blue-600">{myName}</p>
          </div>
        </div>
        <div className="mb-4 text-center">
          <GameStatus />
        </div>
        <div className="flex items-start justify-center gap-4">
          <div className={`flex flex-col gap-4 p-4 bg-white rounded-lg shadow-lg ${!isMyTurnToDraw && 'opacity-50'}`}>
            <fieldset disabled={!isMyTurnToDraw} className="flex flex-col gap-4 items-center">
              <div>
                <label htmlFor="colorPicker" className="font-semibold">Color</label>
                <input id="colorPicker" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-24 h-10 p-1 border-none cursor-pointer"/>
              </div>
              <div>
                <label htmlFor="lineWidth" className="font-semibold">Brush Size: {lineWidth}</label>
                <input id="lineWidth" type="range" min="1" max="50" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="w-32 cursor-pointer"/>
              </div>
              <button onClick={handleClearCanvas} className="w-full px-4 py-2 mt-2 text-white bg-red-500 rounded-md hover:bg-red-600 disabled:bg-red-300">
                Clear Canvas
              </button>
            </fieldset>
          </div>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className={`bg-white border-2 border-gray-400 rounded-lg shadow-lg ${isMyTurnToDraw ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onMouseMove={draw}
          />
          <div className="w-80 flex flex-col bg-white rounded-lg shadow-lg h-[600px]">
            <h3 className="text-lg font-bold p-4 border-b">Game Chat & Events</h3>
            <div className="flex-grow p-4 space-y-2 text-sm overflow-y-auto">
              {gameMessages.map(msg => <div key={msg.id}>{msg.content}</div>)}
            </div>
            <form onSubmit={handleGuessSubmit} className="p-4 border-t">
              <fieldset disabled={isMyTurnToDraw} className="flex gap-2">
                <input 
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder={isMyTurnToDraw ? "You're drawing..." : "Type your guess..."}
                  className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <button type="submit" className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-300">
                  Guess
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
