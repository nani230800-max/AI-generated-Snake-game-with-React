import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Terminal } from 'lucide-react';

const TRACKS = [
  {
    id: 1,
    title: 'AUDIO_NODE_01.WAV',
    artist: 'UNKNOWN_ENTITY',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 2,
    title: 'AUDIO_NODE_02.WAV',
    artist: 'UNKNOWN_ENTITY',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 3,
    title: 'AUDIO_NODE_03.WAV',
    artist: 'UNKNOWN_ENTITY',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };

export default function App() {
  // --- Music Player State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Snake Game State ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Use refs for game loop to avoid dependency issues
  const snakeRef = useRef(snake);
  const directionRef = useRef(direction);
  const foodRef = useRef(food);
  const gameOverRef = useRef(gameOver);
  const gameStartedRef = useRef(gameStarted);

  useEffect(() => {
    snakeRef.current = snake;
    directionRef.current = direction;
    foodRef.current = food;
    gameOverRef.current = gameOver;
    gameStartedRef.current = gameStarted;
  }, [snake, direction, food, gameOver, gameStarted]);

  // --- Music Player Logic ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.error("AUDIO_UPLINK_FAILED:", e));
    } else if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  
  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const handleTrackEnded = () => {
    nextTrack();
  };

  // --- Snake Game Logic ---
  const generateFood = useCallback(() => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = snakeRef.current.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!onSnake) break;
    }
    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    generateFood();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (!gameStartedRef.current && e.key === ' ') {
        resetGame();
        return;
      }

      if (gameOverRef.current && e.key === ' ') {
        resetGame();
        return;
      }

      const dir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generateFood]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const moveSnake = () => {
      const currentSnake = [...snakeRef.current];
      const head = { ...currentSnake[0] };
      const dir = directionRef.current;

      head.x += dir.x;
      head.y += dir.y;

      // Check collision with walls
      if (
        head.x < 0 ||
        head.x >= GRID_SIZE ||
        head.y < 0 ||
        head.y >= GRID_SIZE
      ) {
        setGameOver(true);
        return;
      }

      // Check collision with self
      if (currentSnake.some((segment) => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        return;
      }

      currentSnake.unshift(head);

      // Check food collision
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore((s) => s + 1);
        generateFood();
      } else {
        currentSnake.pop();
      }

      setSnake(currentSnake);
    };

    const gameLoop = setInterval(moveSnake, 100);
    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, generateFood]);

  // --- Render Game Canvas ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid (harsh lines)
    ctx.strokeStyle = '#003333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    // Draw food (Magenta)
    ctx.fillStyle = '#FF00FF';
    // Glitchy food: randomly offset slightly
    const foodOffsetX = Math.random() > 0.8 ? (Math.random() * 4 - 2) : 0;
    const foodOffsetY = Math.random() > 0.8 ? (Math.random() * 4 - 2) : 0;
    ctx.fillRect(food.x * CELL_SIZE + foodOffsetX, food.y * CELL_SIZE + foodOffsetY, CELL_SIZE, CELL_SIZE);

    // Draw snake (Cyan)
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#FFFFFF' : '#00FFFF';
      const offsetX = Math.random() > 0.95 ? (Math.random() * 2 - 1) : 0;
      ctx.fillRect(segment.x * CELL_SIZE + offsetX, segment.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
    });

  }, [snake, food]);

  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className="min-h-screen bg-[#050505] text-cyan flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="static-noise"></div>
      <div className="scanline"></div>

      <audio
        ref={audioRef}
        src={currentTrack.url}
        onEnded={handleTrackEnded}
        className="hidden"
      />

      {/* Header */}
      <header className="w-full max-w-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-magenta mb-8 bg-black z-10 screen-tear">
        <h1 
          className="text-2xl sm:text-3xl font-pixel text-cyan glitch uppercase tracking-tighter" 
          data-text="SYS.SNAKE_PROTOCOL"
        >
          SYS.SNAKE_PROTOCOL
        </h1>
        <div className="text-xl sm:text-2xl font-terminal text-magenta mt-4 sm:mt-0 font-bold bg-magenta/10 px-2 py-1 border border-magenta">
          DATA_HARVESTED: {score.toString().padStart(4, '0')}
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex items-center justify-center w-full mb-8 z-10">
        <div className="relative border-4 border-cyan bg-black p-1 screen-tear shadow-[8px_8px_0px_#FF00FF]">
          <canvas 
            ref={canvasRef} 
            width={CANVAS_SIZE} 
            height={CANVAS_SIZE} 
            className="block bg-black" 
          />
          
          {!gameStarted && !gameOver && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center">
              <div 
                className="text-magenta text-2xl sm:text-3xl font-pixel mb-6 text-center px-4 glitch"
                data-text="AWAITING_INPUT"
              >
                AWAITING_INPUT
              </div>
              <div className="text-cyan text-xl font-terminal flex flex-col items-center gap-2 bg-cyan/10 p-4 border border-cyan">
                <span>[SPACE] TO INITIALIZE</span>
                <span className="opacity-70">W A S D // ARROWS</span>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center">
              <h2 
                className="text-3xl sm:text-4xl font-pixel text-magenta mb-4 text-center glitch"
                data-text="CRITICAL_FAILURE"
              >
                CRITICAL_FAILURE
              </h2>
              <div className="text-2xl text-cyan mb-8 font-terminal bg-cyan/20 px-4 py-2 border border-cyan">
                ENTITIES_CONSUMED: {score}
              </div>
              <button 
                onClick={resetGame} 
                className="px-6 py-3 bg-magenta text-black font-pixel text-sm sm:text-base hover:bg-cyan hover:text-black transition-none border-2 border-transparent hover:border-magenta active:translate-y-1"
              >
                [ REBOOT_SEQUENCE ]
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Music Player Footer */}
      <footer className="w-full max-w-2xl p-4 border-t-4 border-cyan bg-black z-10 flex flex-col sm:flex-row items-center justify-between gap-6 screen-tear shadow-[-8px_-8px_0px_rgba(0,255,255,0.2)]">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-12 h-12 bg-magenta flex items-center justify-center border-2 border-cyan">
            <Terminal className="w-6 h-6 text-black" />
          </div>
          <div className="flex-1 font-terminal">
            <div className="text-lg font-bold text-cyan uppercase tracking-widest">
              {currentTrack.title}
            </div>
            <div className="text-sm text-magenta uppercase">
              SRC: {currentTrack.artist}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={prevTrack} className="p-2 text-cyan hover:bg-cyan hover:text-black border border-transparent hover:border-cyan transition-none">
            <SkipBack className="w-6 h-6 fill-current" />
          </button>
          <button 
            onClick={togglePlay} 
            className="w-12 h-12 flex items-center justify-center bg-cyan text-black hover:bg-magenta hover:text-black transition-none border-2 border-transparent"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </button>
          <button onClick={nextTrack} className="p-2 text-cyan hover:bg-cyan hover:text-black border border-transparent hover:border-cyan transition-none">
            <SkipForward className="w-6 h-6 fill-current" />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 w-32 font-terminal">
          <button onClick={() => setIsMuted(!isMuted)} className="text-magenta hover:text-cyan">
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-full h-2 bg-black border border-cyan appearance-none cursor-pointer accent-magenta"
          />
        </div>
      </footer>
    </div>
  );
}
