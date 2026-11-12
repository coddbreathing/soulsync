import React, { useState, useRef, useEffect } from 'react';
import { Gamepad2, PenTool, Check, RotateCcw, Award, Paintbrush, Trash, HelpCircle, AlertCircle } from 'lucide-react';
import { TicTacToeState, TriviaGame, CouplePair, DrawingStroke } from '../types';

interface GamesSectionProps {
  pair: CouplePair;
  myId: string;
  myName: string;
  isUserA: boolean;
  onSendAction: (actionType: string, payload: any) => void;
}

export default function GamesSection({
  pair,
  myId,
  myName,
  isUserA,
  onSendAction
}: GamesSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'trivia' | 'tictactoe' | 'doodle'>('trivia');
  const [inviteFeedback, setInviteFeedback] = useState(false);

  // Doodle Drawing States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [brushColor, setBrushColor] = useState("#9333ea");
  const [brushWidth, setBrushWidth] = useState(4);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  // TTT configuration
  const symbol = isUserA ? 'X' : 'O';
  const myTurn = (pair.ticTacToe.isXNext && isUserA) || (!pair.ticTacToe.isXNext && !isUserA);

  // Redraw doodle board drawing whenever strokes update
  useEffect(() => {
    if (activeSubTab === 'doodle' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw each historic stroke
        pair.drawing.forEach((stroke) => {
          if (stroke.points.length < 2) return;
          ctx.beginPath();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
        });
      }
    }
  }, [pair.drawing, activeSubTab]);

  // Tic-Tac-Toe selections
  const handleCellClick = (idx: number) => {
    if (!myTurn || pair.ticTacToe.board[idx] !== null || pair.ticTacToe.winner) return;

    onSendAction('PLAY_TICTACTOE', {
      index: idx,
      symbol
    });
  };

  const handleResetTTT = () => {
    onSendAction('RESET_TICTACTOE', {});
  };

  // Trivia Quiz triggers
  const startTriviaChallenge = () => {
    onSendAction('SET_TRIVIA_ACTIVE', { isActive: true });
  };

  const handleSelectTriviaAnswer = (qIndex: number, optionVal: string) => {
    onSendAction('SUBMIT_TRIVIA_ANSWER', {
      qIndex,
      answer: optionVal,
      isUserA
    });
  };

  // Doodle Canvas mouse controllers
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top)
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const pos = getCanvasMousePos(e);
    currentStrokeRef.current = [pos];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const pos = getCanvasMousePos(e);
    currentStrokeRef.current.push(pos);

    // Dynamic feedback drawing on local client
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && currentStrokeRef.current.length >= 2) {
      const pts = currentStrokeRef.current;
      ctx.beginPath();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushWidth;
      ctx.lineCap = 'round';
      ctx.lineTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokeRef.current.length >= 2) {
      // Send finalized stroke object to backend sync database
      onSendAction('DRAW_STROKE', {
        stroke: {
          points: currentStrokeRef.current,
          color: brushColor,
          lineWidth: brushWidth
        }
      });
    }
    currentStrokeRef.current = [];
  };

  const handleClearDoodle = () => {
    onSendAction('DRAW_STROKE', { clear: true });
  };

  return (
    <div className="space-y-6">
      {/* Mini tabs and Live Challenge Invite action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-white/5 p-1 rounded-2xl w-fit border border-white/10 backdrop-blur-md">
          <button 
            onClick={() => setActiveSubTab('trivia')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeSubTab === 'trivia' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10' : 'text-white/40 hover:text-white/85'}`}
          >
            <Gamepad2 className="w-3.5 h-3.5" /> Couple Quiz Trivia
          </button>
          <button 
            onClick={() => setActiveSubTab('tictactoe')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeSubTab === 'tictactoe' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10' : 'text-white/40 hover:text-white/85'}`}
          >
            🎮 Sync Tic-Tac-Toe
          </button>
          <button 
            onClick={() => setActiveSubTab('doodle')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${activeSubTab === 'doodle' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10' : 'text-white/40 hover:text-white/85'}`}
          >
            <PenTool className="w-3.5 h-3.5" /> Direct Doodle Board
          </button>
        </div>

        <div className="flex items-center gap-3">
          {inviteFeedback && (
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl animate-fade-in">
              ✓ Sent gameplay invitation to partner!
            </span>
          )}
          <button
            onClick={() => {
              const gameNames = {
                trivia: 'Couple Quiz Trivia',
                tictactoe: 'Sync Tic-Tac-Toe',
                doodle: 'Collaborative Doodle Drawing'
              };
              onSendAction('GAME_INVITE', { 
                gameType: gameNames[activeSubTab], 
                senderName: myName 
              });
              setInviteFeedback(true);
              setTimeout(() => {
                setInviteFeedback(false);
              }, 3000);
            }}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-600 hover:to-rose-600 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-500/10 transition-all cursor-pointer flex items-center gap-1.5"
          >
            🎮 Invite/Challenge Partner to {activeSubTab === 'trivia' ? 'Quiz' : activeSubTab === 'tictactoe' ? 'Tic-Tac-Toe' : 'Draw'}
          </button>
        </div>
      </div>

      {activeSubTab === 'trivia' ? (
        /* Trivia Quiz Chamber */
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl space-y-5 animate-fade-in backdrop-blur-md">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 className="font-serif font-bold text-white text-sm flex items-center gap-2">
              🌹 Trivia Matches: how well do we connect?
            </h3>
            <span className="text-[10px] text-white/40 font-mono tracking-wider">Compatible Points Game</span>
          </div>

          {!pair.trivia.isActive ? (
            <div className="py-12 text-center space-y-4 max-w-sm mx-auto">
              <div className="w-14 h-14 bg-rose-500/20 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-300 text-xl mx-auto shadow-lg shadow-rose-500/10 animate-pulse">
                ❤️
              </div>
              <h4 className="font-serif font-bold text-white">Start Couples Trivia Quiz</h4>
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                Unlock 3 specialized relation compatibility questions. Click on your privately preferred answer. If both answers align, win 10 Love Points for your Plant!
              </p>
              <button
                onClick={startTriviaChallenge}
                className="bg-purple-650 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-lg cursor-pointer"
              >
                Initiate Couple Quiz
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Question Screen */}
              <div className="md:col-span-8 bg-black/40 p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold px-2.5 py-1 rounded-full font-mono uppercase">
                    Question {pair.trivia.quizIndex + 1} of 3
                  </span>
                  {/* Who has answered */}
                  <div className="flex gap-1.5 text-[9px] font-mono">
                    <span className={`px-2 py-1 rounded-md border ${pair.trivia.questions[pair.trivia.quizIndex]?.userAnswer ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40'}`}>
                      You {pair.trivia.questions[pair.trivia.quizIndex]?.userAnswer ? '✓' : '...'}
                    </span>
                    <span className={`px-2 py-1 rounded-md border ${pair.trivia.questions[pair.trivia.quizIndex]?.partnerAnswer ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40'}`}>
                      Partner {pair.trivia.questions[pair.trivia.quizIndex]?.partnerAnswer ? '✓' : '...'}
                    </span>
                  </div>
                </div>

                <h4 className="font-medium text-white text-sm leading-snug">
                  {pair.trivia.questions[pair.trivia.quizIndex]?.question}
                </h4>

                {/* Multiple choice selections */}
                <div className="space-y-2 pt-2">
                  {pair.trivia.questions[pair.trivia.quizIndex]?.options.map((opt) => {
                    const mySelectedVal = isUserA 
                      ? pair.trivia.questions[pair.trivia.quizIndex]?.userAnswer 
                      : pair.trivia.questions[pair.trivia.quizIndex]?.partnerAnswer;
                    const isSelected = mySelectedVal === opt;
                    
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelectTriviaAnswer(pair.trivia.quizIndex, opt)}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
                      >
                        {opt}
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time score cards */}
              <div className="md:col-span-4 bg-gradient-to-tr from-purple-950/40 to-indigo-950/40 border border-white/10 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-1.5 text-yellow-300">
                  <Award className="w-4 h-4" />
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider">Score Dashboard</h4>
                </div>

                <div className="space-y-2 text-sm text-white/80">
                  <div className="flex justify-between pb-1.5 border-b border-white/15">
                    <span>{pair.userA?.name || 'Partner A'}</span>
                    <span className="font-mono text-xs font-semibold text-emerald-400">{pair.trivia.scores[pair.userA?.id || 'A'] || 0} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{pair.userB?.name || 'Partner B'}</span>
                    <span className="font-mono text-xs font-semibold text-emerald-400">{pair.trivia.scores[pair.userB?.id || 'B'] || 0} pts</span>
                  </div>
                </div>

                <div className="text-[10px] text-white/50 space-y-1.5 pt-2 leading-relaxed">
                  <p>✨ <strong>Alignment bonus:</strong> Answering identical options adds 10 bonus compatibility points and triggers visual bloom multipliers for your shared pet leaf development.</p>
                </div>

                <button
                  onClick={startTriviaChallenge}
                  className="w-full bg-white/10 border border-white/15 text-rose-200 py-1.5 rounded-lg text-xs font-bold font-sans hover:bg-white/15 transition-colors cursor-pointer"
                >
                  Reset / Reload Questions
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeSubTab === 'tictactoe' ? (
        /* Tic Tac Toe synchronization frame */
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-sm animate-fade-in backdrop-blur-md">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Play Frame */}
            <div className="md:col-span-6 flex flex-col items-center space-y-4">
              <span className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-4 py-1.5 rounded-full font-mono uppercase font-bold tracking-wider">
                {pair.ticTacToe.winner
                  ? pair.ticTacToe.winner === 'Draw'
                    ? "🤝 It's a draw match!"
                    : `🎉 Winner: ${pair.ticTacToe.winner === symbol ? 'YOU!' : 'Partner'}`
                  : myTurn
                  ? "👉 YOUR TURN (" + symbol + ")"
                  : "⌛ Partner's Turn..."}
              </span>

              {/* 3x3 Grid Board */}
              <div className="grid grid-cols-3 gap-2 bg-black/40 border border-white/10 p-2 rounded-2xl w-60 h-60 relative shadow-inner">
                {pair.ticTacToe.board.map((cell, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    className="bg-white/5 border border-white/10 text-white rounded-xl shadow-sm text-2.5xl font-bold flex items-center justify-center transition-all hover:bg-white/15 relative select-none cursor-pointer"
                    style={{ outline: "none" }}
                  >
                    {cell === 'X' ? (
                      <span className="text-purple-400 animate-zoom-in">X</span>
                    ) : cell === 'O' ? (
                      <span className="text-rose-400 animate-zoom-in">O</span>
                    ) : null}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleResetTTT}
                className="text-[11px] bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:bg-white/10 px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Clear Board
              </button>
            </div>

            {/* Rules and guidelines detail column */}
            <div className="md:col-span-6 bg-black/30 border border-white/10 p-6 rounded-2xl space-y-4">
              <h4 className="font-bold text-white text-xs uppercase tracking-widest font-mono">Game Statistics</h4>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <div className="text-lg font-bold text-purple-400">{pair.ticTacToe.scoreX} Wins</div>
                  <div className="text-[9px] text-white/40 font-mono tracking-wider">Player X (Alex)</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <div className="text-lg font-bold text-rose-400">{pair.ticTacToe.scoreO} Wins</div>
                  <div className="text-[9px] text-white/40 font-mono tracking-wider">Player O (Jordan)</div>
                </div>
              </div>
              <p className="text-xs text-white/50 leading-relaxed font-sans mt-2">
                This Tic-Tac-Toe instance broadcasts cell choices instantly. Every turn signals database adjustments on your partner's web frame, providing zero lag, synchronized boards!
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Synchronized Doodle drawing Board */
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-sm animate-fade-in space-y-4 backdrop-blur-md">
          <div className="flex justify-between items-center bg-black/40 px-5 py-3 rounded-2xl border border-white/10">
            {/* Color board picking controls */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-white/60 text-xs font-semibold">
                <Paintbrush className="w-3.5 h-3.5" /> Pencil Core:
              </span>
              <div className="flex gap-1.5">
                {['#9333ea', '#e11d48', '#059669', '#2563eb', '#f59e0b', '#ffffff'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    className="w-5.5 h-5.5 rounded-full select-none transform hover:scale-110 active:scale-95 transition-all border border-white/20 shadow-sm cursor-pointer"
                    style={{ backgroundColor: color, outline: brushColor === color ? '2px solid rgba(255,255,255,0.8)' : '' }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClearDoodle}
                className="text-[11px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white/60 hover:text-red-400 hover:border-red-450/40 hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" /> Wipe Canvas
              </button>
            </div>
          </div>

          <div className="relative border border-white/10 rounded-2xl bg-white/5 overflow-hidden shadow-inner flex items-center justify-center p-2">
            {/* Native Touch Canvas Frame */}
            <canvas
              ref={canvasRef}
              width={520}
              height={320}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="bg-zinc-950 rounded-xl cursor-pencil"
            />

            <div className="absolute top-5 left-5 bg-black/80 border border-white/10 text-[10px] text-white py-1 px-3 rounded-full font-mono">
              Collaborative Doodle Pad Active
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-white/30 font-mono">
              🎨 Scribbling drawings sends strokes instantly. Share a digital sketchpad and play games like Pictionary across the board!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
