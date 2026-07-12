import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const PIECES = [
  { shape: [[1, 1, 1, 1]], color: "#0ff" },
  { shape: [[1, 0], [1, 0], [1, 1]], color: "#f90" },
  { shape: [[0, 1], [0, 1], [1, 1]], color: "#00f" },
  { shape: [[1, 1], [1, 1]], color: "#ff0" },
  { shape: [[0, 1, 1], [1, 1, 0]], color: "#0f0" },
  { shape: [[1, 1, 0], [0, 1, 1]], color: "#f00" },
  { shape: [[0, 1, 0], [1, 1, 1]], color: "#a0f" },
];

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    shape: p.shape.map((r) => [...r]),
    color: p.color,
    x: Math.floor((COLS - p.shape[0].length) / 2),
    y: 0,
  };
}

function valid(board, piece, dx, dy) {
  return piece.shape.every((row, r) =>
    row.every((cell, c) => {
      if (!cell) return true;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      return nx >= 0 && nx < COLS && ny < ROWS && (ny < 0 || !board[ny][nx]);
    }),
  );
}

function lock(board, piece) {
  const b = board.map((r) => [...r]);
  piece.shape.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) b[piece.y + r][piece.x + c] = piece.color;
    }),
  );
  return b;
}

function clearLines(board) {
  const notFull = board.filter((r) => r.some((c) => c === null));
  const cleared = ROWS - notFull.length;
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...empty, ...notFull], cleared };
}

function findFullRows(board) {
  return board.reduce((acc, row, i) => {
    if (row.every((c) => c !== null)) acc.push(i);
    return acc;
  }, []);
}

function rotate(piece) {
  const rows = piece.shape.length;
  const cols = piece.shape[0].length;
  const rotated = Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => piece.shape[rows - 1 - r][c]),
  );
  return { ...piece, shape: rotated };
}

const PIECES_PER_LEVEL = 10;
const BASE_SPEED = 800;
const HS_KEY = "tetris_highscore";

function loadHighScore() {
  try {
    return JSON.parse(localStorage.getItem(HS_KEY)) || null;
  } catch {
    return null;
  }
}

function saveHighScore(name, score) {
  localStorage.setItem(HS_KEY, JSON.stringify({ name, score }));
}

export default function Tetris() {
  const canvasRef = useRef(null);
  const nextCanvasRef = useRef(null);
  const boardRef = useRef(emptyBoard());
  const pieceRef = useRef(randomPiece());
  const nextRef = useRef(randomPiece());
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const piecesRef = useRef(0);
  const levelRef = useRef(0);
  const gameOverRef = useRef(false);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [borderColor, setBorderColor] = useState("#00897b");
  const [tetrisBonus, setTetrisBonus] = useState(false);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [newRecord, setNewRecord] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const dropRef = useRef(null);
  const animRef = useRef(false);
  const flashRowsRef = useRef([]);
  const flashTimerRef = useRef(0);
  const touchRepeatRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchMovedRef = useRef(false);
  const touchAxisRef = useRef(null);

  function draw() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a1210";
    ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);

    const flashRows = flashRowsRef.current;
    const flashOn = flashTimerRef.current % 2 === 0;

    boardRef.current.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell) {
          if (flashRows.includes(r)) {
            ctx.fillStyle = flashOn ? "#ffd166" : "#fff";
          } else {
            ctx.fillStyle = cell;
          }
          ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, BLOCK - 2);
        }
      }),
    );

    const p = pieceRef.current;
    if (!gameOverRef.current && !animRef.current) {
      ctx.fillStyle = p.color;
      p.shape.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell) {
            ctx.fillRect(
              (p.x + c) * BLOCK + 1,
              (p.y + r) * BLOCK + 1,
              BLOCK - 2,
              BLOCK - 2,
            );
          }
        }),
      );
    }
    drawNext();

    if (pausedRef.current) {
      ctx.fillStyle = "rgba(10,18,16,0.75)";
      ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PAUSE", (COLS * BLOCK) / 2, (ROWS * BLOCK) / 2);
      ctx.textAlign = "start";
    }
  }

  function drawNext() {
    const ctx = nextCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const size = 22;
    ctx.fillStyle = "#0a1210";
    ctx.fillRect(0, 0, 5 * size, 5 * size);
    const p = nextRef.current;
    const offX = Math.floor((5 - p.shape[0].length) / 2);
    const offY = Math.floor((5 - p.shape.length) / 2);
    ctx.fillStyle = p.color;
    p.shape.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell) {
          ctx.fillRect(
            (offX + c) * size + 1,
            (offY + r) * size + 1,
            size - 2,
            size - 2,
          );
        }
      }),
    );
  }

  function moveLeft() {
    if (gameOverRef.current || animRef.current) return;
    const piece = pieceRef.current;
    if (valid(boardRef.current, piece, -1, 0)) piece.x--;
    draw();
  }

  function moveRight() {
    if (gameOverRef.current || animRef.current) return;
    const piece = pieceRef.current;
    if (valid(boardRef.current, piece, 1, 0)) piece.x++;
    draw();
  }

  function moveDown() {
    if (gameOverRef.current || animRef.current) return;
    const piece = pieceRef.current;
    if (valid(boardRef.current, piece, 0, 1)) piece.y++;
    draw();
  }

  function rotatePiece() {
    if (gameOverRef.current || animRef.current) return;
    applyRotation(pieceRef.current);
    draw();
  }

  function applyRotation(piece) {
    const r = rotate(piece);
    const kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1]];
    for (const [dx, dy] of kicks) {
      if (valid(boardRef.current, r, dx, dy)) {
        piece.x += dx;
        piece.y += dy;
        piece.shape = r.shape;
        return true;
      }
    }
    return false;
  }

  function hardDrop() {
    if (gameOverRef.current || animRef.current) return;
    const piece = pieceRef.current;
    while (valid(boardRef.current, piece, 0, 1)) piece.y++;
    draw();
    tick();
  }

  function startRepeat(action) {
    action();
    stopRepeat();
    touchRepeatRef.current = setInterval(action, 80);
  }

  function stopRepeat() {
    if (touchRepeatRef.current) {
      clearInterval(touchRepeatRef.current);
      touchRepeatRef.current = null;
    }
  }

  function togglePause() {
    if (gameOverRef.current) return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (next) {
      clearInterval(dropRef.current);
    } else {
      dropRef.current = setInterval(tick, getSpeed());
    }
  }

  function onCanvasTouchStart(e) {
    if (gameOverRef.current || pausedRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    touchMovedRef.current = false;
    touchAxisRef.current = null;
  }

  function onCanvasTouchMove(e) {
    e.preventDefault();
    if (!touchStartRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (!touchAxisRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      touchAxisRef.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }

    if (touchAxisRef.current === "x" && Math.abs(dx) >= BLOCK * 0.8) {
      if (dx > 0) moveRight(); else moveLeft();
      touchStartRef.current.x = t.clientX;
      touchMovedRef.current = true;
    }
    if (touchAxisRef.current === "y" && dy >= BLOCK * 0.8) {
      moveDown();
      touchStartRef.current.y = t.clientY;
      touchMovedRef.current = true;
    }
  }

  function onCanvasTouchEnd(e) {
    e.preventDefault();
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || gameOverRef.current || pausedRef.current) return;
    const t = e.changedTouches[0];
    const dx = Math.abs(t.clientX - start.x);
    const dy = Math.abs(t.clientY - start.y);
    const dt = Date.now() - start.time;
    if (dt < 200 && dx < BLOCK * 0.5 && dy < BLOCK * 0.5 && !touchMovedRef.current) {
      rotatePiece();
    }
  }

  function finishClear() {
    animRef.current = false;
    const n = flashRowsRef.current.length;
    const wasTetris = n === 4;
    flashRowsRef.current = [];

    const { board: cleared, cleared: removed } = clearLines(boardRef.current);
    boardRef.current = cleared;

    linesRef.current += removed;
    scoreRef.current += [0, 100, 400, 800, 2000][removed] || 2000;
    setLines(linesRef.current);
    setScore(scoreRef.current);

    const newLevel = Math.floor(piecesRef.current / PIECES_PER_LEVEL);
    if (newLevel !== levelRef.current) {
      levelRef.current = newLevel;
      setLevel(newLevel);
    }

    pieceRef.current = nextRef.current;
    nextRef.current = randomPiece();
    if (!valid(boardRef.current, pieceRef.current, 0, 0)) {
      gameOverRef.current = true;
      setOver(true);
      clearInterval(dropRef.current);
    }
    setBorderColor("#00897b");
    if (wasTetris) {
      setTimeout(() => setTetrisBonus(false), 1200);
    }
    draw();
  }

  function tick() {
    if (gameOverRef.current || animRef.current || pausedRef.current) return;
    const board = boardRef.current;
    const piece = pieceRef.current;
    if (valid(board, piece, 0, 1)) {
      piece.y++;
    } else {
      boardRef.current = lock(board, piece);
      piecesRef.current++;

      const fullRows = findFullRows(boardRef.current);
      if (fullRows.length > 0) {
        animRef.current = true;
        flashRowsRef.current = fullRows;
        const isTetris = fullRows.length === 4;
        const duration = isTetris ? 400 : 20;
        const flashes = isTetris ? 8 : 2;
        setBorderColor("#ffd166");
        if (isTetris) setTetrisBonus(true);

        let i = 0;
        const iv = setInterval(() => {
          flashTimerRef.current = i;
          draw();
          i++;
          if (i >= flashes) {
            clearInterval(iv);
            finishClear();
          }
        }, duration / flashes);
        return;
      }

      pieceRef.current = nextRef.current;
      nextRef.current = randomPiece();
      if (!valid(boardRef.current, pieceRef.current, 0, 0)) {
        gameOverRef.current = true;
        setOver(true);
        clearInterval(dropRef.current);
      }
    }
    draw();
  }

  function getSpeed() {
    return Math.max(100, BASE_SPEED - levelRef.current * 70);
  }

  function saveRecord() {
    const name = playerName.trim().toUpperCase().slice(0, 5);
    if (!name) return;
    saveHighScore(name, score);
    setHighScore({ name, score });
    setNewRecord(false);
    setPlayerName("");
  }

  function restart() {
    boardRef.current = emptyBoard();
    pieceRef.current = randomPiece();
    nextRef.current = randomPiece();
    scoreRef.current = 0;
    linesRef.current = 0;
    piecesRef.current = 0;
    levelRef.current = 0;
    gameOverRef.current = false;
    animRef.current = false;
    pausedRef.current = false;
    flashRowsRef.current = [];
    setScore(0);
    setLines(0);
    setLevel(0);
    setOver(false);
    setBorderColor("#00897b");
    setTetrisBonus(false);
    setPaused(false);
    setNewRecord(false);
    setPlayerName("");
    clearInterval(dropRef.current);
    stopRepeat();
    dropRef.current = setInterval(tick, getSpeed());
    draw();
  }

  useEffect(() => {
    draw();
    dropRef.current = setInterval(tick, getSpeed());

    function onKey(e) {
      if (gameOverRef.current) return;

      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        togglePause();
        e.preventDefault();
        return;
      }

      if (pausedRef.current) return;
      const board = boardRef.current;
      const piece = pieceRef.current;

      switch (e.key) {
        case "ArrowLeft":
          if (valid(board, piece, -1, 0)) piece.x--;
          break;
        case "ArrowRight":
          if (valid(board, piece, 1, 0)) piece.x++;
          break;
        case "ArrowDown":
          if (valid(board, piece, 0, 1)) piece.y++;
          break;
        case "ArrowUp":
          applyRotation(piece);
          break;
        case " ":
          while (valid(board, piece, 0, 1)) piece.y++;
          break;
        default:
          return;
      }
      e.preventDefault();
      draw();
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(dropRef.current);
      stopRepeat();
    };
  }, []);

  useEffect(() => {
    if (over && score > 0 && (!highScore || score > highScore.score)) {
      setNewRecord(true);
    }
  }, [over]);

  useEffect(() => {
    if (!over) {
      clearInterval(dropRef.current);
      dropRef.current = setInterval(tick, getSpeed());
    }
  }, [level]);

  const [scale, setScale] = useState(1);

  useEffect(() => {
    function check() {
      const w = window.innerWidth;
      const s = w < 450 ? Math.max(0.6, (w - 20) / 450) : 1;
      setScale((prev) => (prev === s ? prev : s));
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const boardHeight = ROWS * BLOCK;
  const sideWidth = 110;
  const touchBtnStyle = {
    width: 56,
    height: 56,
    fontSize: "1.4rem",
    fontWeight: 700,
    background: "#162a2d",
    color: "#00897b",
    border: "2px solid #00897b",
    borderRadius: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    touchAction: "manipulation",
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        display: "inline-block",
        transform: scale < 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top center",
      }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Tetris</h1>
      <div style={{ display: "inline-flex", alignItems: "start", gap: "0.75rem", marginTop: "0.5rem" }}>
        <canvas
          ref={canvasRef}
          width={COLS * BLOCK}
          height={ROWS * BLOCK}
          onTouchStart={onCanvasTouchStart}
          onTouchMove={onCanvasTouchMove}
          onTouchEnd={onCanvasTouchEnd}
          style={{ border: `2px solid ${borderColor}`, borderRadius: 4, touchAction: "none" }}
        />
        <div style={{ width: sideWidth, display: "flex", flexDirection: "column", justifyContent: "space-between", height: boardHeight }}>
          <div style={{
            width: sideWidth,
            border: `2px solid ${tetrisBonus ? "#ffd166" : "#00897b"}`,
            borderRadius: 4,
            padding: "0.6rem",
            background: tetrisBonus ? "rgba(255,209,102,0.15)" : "transparent",
            transition: "all 0.15s",
          }}>
            {tetrisBonus ? (
              <div style={{ color: "#ffd166", fontWeight: 900, fontSize: "1rem", lineHeight: 1.2 }}>
                TETRIS<br />BONUS
              </div>
            ) : (
              <>
                <div style={{ color: "#aaa", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Best</div>
                <div style={{ color: "#6b8f8a", fontWeight: 600, fontSize: "0.9rem" }}>{highScore ? highScore.score : "–"}</div>
                <div style={{ color: "#aaa", fontSize: "0.75rem", marginTop: "0.4rem", marginBottom: "0.25rem" }}>Score</div>
                <div style={{ color: "#ffd166", fontWeight: 700, fontSize: "1.1rem" }}>{score}</div>
                <div style={{ color: "#aaa", fontSize: "0.75rem", marginTop: "0.4rem", marginBottom: "0.25rem" }}>Lines</div>
                <div style={{ color: "#eee", fontWeight: 600 }}>{lines}</div>
                <div style={{ color: "#aaa", fontSize: "0.75rem", marginTop: "0.4rem", marginBottom: "0.25rem" }}>Level</div>
                <div style={{ color: "#eee", fontWeight: 600 }}>{level + 1}</div>
              </>
            )}
          </div>
          <canvas
            ref={nextCanvasRef}
            width={5 * 22}
            height={5 * 22}
            style={{ width: sideWidth, border: "2px solid #00897b", borderRadius: 4 }}
          />
        </div>
      </div>
      {over && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ color: "#ffd166", fontWeight: 700 }}>Game Over</p>
          {newRecord ? (
            <div style={{ marginTop: "0.75rem" }}>
              <p style={{ color: "#ffd166", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Neuer Rekord! Name eingeben:</p>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                <input
                  type="text"
                  maxLength={5}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") saveRecord(); }}
                  placeholder="NAME"
                  autoFocus
                  style={{
                    width: 80,
                    padding: "0.4rem 0.5rem",
                    background: "#0f1923",
                    color: "#ffd166",
                    border: "2px solid #ffd166",
                    borderRadius: 6,
                    fontSize: "1rem",
                    fontWeight: 700,
                    textAlign: "center",
                    textTransform: "uppercase",
                    outline: "none",
                  }}
                />
                <button
                  onClick={saveRecord}
                  style={{
                    padding: "0.4rem 1rem",
                    background: "#ffd166",
                    color: "#0f1923",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={restart}
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 1.5rem",
                background: "#00897b",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Nochmal
            </button>
          )}
        </div>
      )}
      <p style={{ marginTop: "0.75rem", color: "#666", fontSize: "0.85rem" }}>
        Pfeiltasten: bewegen/drehen &middot; Leertaste: fallen &middot; P: Pause &middot; Tippen: drehen &middot; Swipe: bewegen
      </p>
      <div style={{
        marginTop: "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={togglePause}
            style={{ ...touchBtnStyle, color: paused ? "#ffd166" : "#00897b", borderColor: paused ? "#ffd166" : "#00897b" }}
          >{paused ? "▶" : "⏸"}</button>
          <button
            onClick={rotatePiece}
            style={touchBtnStyle}
          >↻</button>
          <button
            onClick={hardDrop}
            style={touchBtnStyle}
          >⬇</button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onTouchStart={(e) => { e.preventDefault(); startRepeat(moveLeft); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRepeat(); }}
            onTouchCancel={(e) => { e.preventDefault(); stopRepeat(); }}
            onMouseDown={(e) => { e.preventDefault(); startRepeat(moveLeft); }}
            onMouseUp={(e) => { e.preventDefault(); stopRepeat(); }}
            onMouseLeave={() => stopRepeat()}
            style={touchBtnStyle}
          >←</button>
          <button
            onTouchStart={(e) => { e.preventDefault(); startRepeat(moveDown); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRepeat(); }}
            onTouchCancel={(e) => { e.preventDefault(); stopRepeat(); }}
            onMouseDown={(e) => { e.preventDefault(); startRepeat(moveDown); }}
            onMouseUp={(e) => { e.preventDefault(); stopRepeat(); }}
            onMouseLeave={() => stopRepeat()}
            style={touchBtnStyle}
          >↓</button>
          <button
            onTouchStart={(e) => { e.preventDefault(); startRepeat(moveRight); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRepeat(); }}
            onTouchCancel={(e) => { e.preventDefault(); stopRepeat(); }}
            onMouseDown={(e) => { e.preventDefault(); startRepeat(moveRight); }}
            onMouseUp={(e) => { e.preventDefault(); stopRepeat(); }}
            onMouseLeave={() => stopRepeat()}
            style={touchBtnStyle}
          >→</button>
        </div>
      </div>
      <Link
        to="/"
        style={{
          display: "inline-block",
          marginTop: "0.75rem",
          color: "#00897b",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.9rem",
        }}
      >
        ← Zurück zum Menü
      </Link>
      </div>
    </div>
  );
}
