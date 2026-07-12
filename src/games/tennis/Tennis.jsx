import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";

const W = 400;
const H = 600;
const PAD_W = 70;
const PAD_H = 12;
const BALL_SIZE = 10;
const WIN_SCORE = 5;
const PAD_SPEED = 6;
const BALL_SPEED_INIT = 3;
const BALL_SPEED_INC = 0.3;
const AI_SPEED = 3.0;
const HS_KEY = "tennis_highscore";

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

function initState() {
  return {
    p1: { x: W / 2 - PAD_W / 2, score: 0 },
    p2: { x: W / 2 - PAD_W / 2, score: 0 },
    ball: { x: W / 2, y: H / 2, vx: 0, vy: -BALL_SPEED_INIT },
    speed: BALL_SPEED_INIT,
    rally: 0,
    lastHit: null,
  };
}

function resetBall(s, dir) {
  s.ball = { x: W / 2, y: H / 2, vx: 0, vy: dir * BALL_SPEED_INIT };
  s.speed = BALL_SPEED_INIT;
  s.rally = 0;
}

export default function Tennis() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const keysRef = useRef({});
  const [mode, setMode] = useState(null);
  const [score, setScore] = useState([0, 0]);
  const [over, setOver] = useState(false);
  const [winner, setWinner] = useState("");
  const [highScore, setHighScore] = useState(loadHighScore);
  const [newRecord, setNewRecord] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const pausedRef = useRef(false);
  const overRef = useRef(false);
  const modeRef = useRef(null);
  const animRef = useRef(null);
  const touchStartRef = useRef(null);
  const hitFlashRef = useRef(0);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    const s = stateRef.current;
    if (!ctx || !s) return;

    ctx.fillStyle = "#0a1210";
    ctx.fillRect(0, 0, W, H);

    // Net posts
    ctx.fillStyle = "#333";
    ctx.fillRect(0, H / 2 - 3, W, 6);
    ctx.fillStyle = "#00897b";
    ctx.fillRect(0, H / 2 - 2, W, 4);

    // Net mesh lines
    ctx.strokeStyle = "rgba(0,137,123,0.3)";
    ctx.lineWidth = 1;
    for (let y = H / 2 - 20; y <= H / 2 + 20; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Paddles with hit flash
    const p1Flash = hitFlashRef.current > 0;
    if (p1Flash) hitFlashRef.current--;

    ctx.fillStyle = p1Flash ? "#ffd166" : "#00897b";
    ctx.shadowColor = p1Flash ? "#ffd166" : "transparent";
    ctx.shadowBlur = p1Flash ? 12 : 0;
    ctx.fillRect(s.p1.x, H - 20 - PAD_H, PAD_W, PAD_H);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#00897b";
    ctx.fillRect(s.p2.x, 20, PAD_W, PAD_H);

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.font = "bold 36px sans-serif";
    ctx.fillStyle = "#6b8f8a";
    ctx.fillText(s.p2.score, W / 2, 60);
    ctx.fillText(s.p1.score, W / 2, H - 35);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#333";
    ctx.fillText(modeRef.current === "ai" ? "KI" : "Spieler 2", W / 2, 80);
    ctx.fillText("Du", W / 2, H - 18);

    if (pausedRef.current) {
      ctx.fillStyle = "rgba(10,18,16,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("PAUSE", W / 2, H / 2);
    }
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s || pausedRef.current || overRef.current) return;

    const keys = keysRef.current;
    if (keys["ArrowLeft"]) s.p1.x = Math.max(0, s.p1.x - PAD_SPEED);
    if (keys["ArrowRight"]) s.p1.x = Math.min(W - PAD_W, s.p1.x + PAD_SPEED);

    if (modeRef.current === "ai") {
      const target = s.ball.x - PAD_W / 2;
      const diff = target - s.p2.x;
      if (Math.abs(diff) > 4) {
        s.p2.x += Math.sign(diff) * Math.min(AI_SPEED, Math.abs(diff));
      }
    } else {
      if (keys["a"] || keys["A"]) s.p2.x = Math.max(0, s.p2.x - PAD_SPEED);
      if (keys["d"] || keys["D"]) s.p2.x = Math.min(W - PAD_W, s.p2.x + PAD_SPEED);
    }

    const b = s.ball;
    b.x += b.vx;
    b.y += b.vy;

    if (b.x <= 0 || b.x >= W) {
      b.vx *= -1;
      b.x = Math.max(0, Math.min(W, b.x));
    }

    const p1y = H - 20 - PAD_H;
    const p2y = 20;

    if (
      b.vy > 0 &&
      b.y + BALL_SIZE / 2 >= p1y &&
      b.y + BALL_SIZE / 2 <= p1y + PAD_H + 10 &&
      b.x >= s.p1.x &&
      b.x <= s.p1.x + PAD_W
    ) {
      const hitPos = (b.x - s.p1.x) / PAD_W;
      const angle = (hitPos - 0.5) * (Math.PI / 3);
      s.speed = Math.min(12, s.speed + BALL_SPEED_INC);
      b.vy = -Math.abs(Math.cos(angle) * s.speed);
      b.vx = Math.sin(angle) * s.speed;
      b.y = p1y - BALL_SIZE / 2;
      s.rally++;
      s.lastHit = 1;
      hitFlashRef.current = 8;
    }

    if (
      b.vy < 0 &&
      b.y - BALL_SIZE / 2 <= p2y + PAD_H &&
      b.y - BALL_SIZE / 2 >= p2y - 10 &&
      b.x >= s.p2.x &&
      b.x <= s.p2.x + PAD_W
    ) {
      const hitPos = (b.x - s.p2.x) / PAD_W;
      const angle = (hitPos - 0.5) * (Math.PI / 3);
      s.speed = Math.min(12, s.speed + BALL_SPEED_INC);
      b.vy = Math.abs(Math.cos(angle) * s.speed);
      b.vx = Math.sin(angle) * s.speed;
      b.y = p2y + PAD_H + BALL_SIZE / 2;
      s.rally++;
      s.lastHit = 2;
    }

    if (b.y > H + 20) {
      s.p2.score++;
      setScore([s.p1.score, s.p2.score]);
      if (s.p2.score >= WIN_SCORE) {
        overRef.current = true;
        setWinner(modeRef.current === "ai" ? "KI" : "Spieler 2");
        setOver(true);
        return;
      }
      resetBall(s, -1);
    }

    if (b.y < -20) {
      s.p1.score++;
      setScore([s.p1.score, s.p2.score]);
      if (s.p1.score >= WIN_SCORE) {
        overRef.current = true;
        setWinner("Du");
        setOver(true);
        return;
      }
      resetBall(s, 1);
    }

    draw();
    animRef.current = requestAnimationFrame(tick);
  }, [draw]);

  function startGameLoop() {
    stateRef.current = initState();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    draw();
    animRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    if (mode) {
      startGameLoop();
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [mode, tick, draw]);

  function startGame(selectedMode) {
    setScore([0, 0]);
    setOver(false);
    overRef.current = false;
    setWinner("");
    setNewRecord(false);
    setPlayerName("");
    pausedRef.current = false;
    modeRef.current = selectedMode;
    setMode(selectedMode);
  }

  function restart() {
    setScore([0, 0]);
    setOver(false);
    overRef.current = false;
    setWinner("");
    setNewRecord(false);
    setPlayerName("");
    pausedRef.current = false;
    startGameLoop();
  }

  function togglePause() {
    if (overRef.current) return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    if (!next && !overRef.current) {
      animRef.current = requestAnimationFrame(tick);
    }
    draw();
  }

  function saveRecord() {
    const name = playerName.trim().toUpperCase().slice(0, 5);
    if (!name) return;
    saveHighScore(name, score[0]);
    setHighScore({ name, score: score[0] });
    setNewRecord(false);
    setPlayerName("");
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (overRef.current || pausedRef.current) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (!touchStartRef.current) return;
    const s = stateRef.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    if (Math.abs(dx) >= 4) {
      s.p1.x = Math.max(0, Math.min(W - PAD_W, s.p1.x + dx));
      touchStartRef.current.x = t.clientX;
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    touchStartRef.current = null;
  }

  useEffect(() => {
    if (over && score[0] > 0 && mode !== "ai" && (!highScore || score[0] > highScore.score)) {
      setNewRecord(true);
    }
  }, [over]);

  useEffect(() => {
    function onKey(e) {
      keysRef.current[e.key] = true;
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        togglePause();
        e.preventDefault();
      }
    }
    function onUp(e) {
      keysRef.current[e.key] = false;
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const btnStyle = {
    padding: "0.6rem 1.5rem",
    background: "#00897b",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "1rem",
    margin: "0.3rem",
  };

  if (!mode) {
    return (
      <div style={{ textAlign: "center" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Tennis</h1>
        <p style={{ color: "#6b8f8a", marginBottom: "1.5rem" }}>Wer zuerst {WIN_SCORE} Punkte macht, gewinnt!</p>
        {highScore && (
          <p style={{ color: "#6b8f8a", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Rekord: <span style={{ color: "#ffd166", fontWeight: 700 }}>{highScore.name}</span> – {highScore.score}
          </p>
        )}
        <div>
          <button onClick={() => startGame("ai")} style={btnStyle}>Vs KI</button>
          <button onClick={() => startGame("2p")} style={btnStyle}>2 Spieler</button>
        </div>
        <div style={{ marginTop: "1.5rem", color: "#6b8f8a", fontSize: "0.85rem" }}>
          <p><strong>Keyboard:</strong> ←/→ oder A/D</p>
          <p><strong>Touch:</strong> Finger auf dem Canvas nach links/rechts wischen</p>
        </div>
        <Link
          to="/"
          style={{
            display: "inline-block",
            marginTop: "1.5rem",
            color: "#00897b",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          ← Zurück zum Menü
        </Link>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <h1 style={{ marginBottom: "1rem" }}>Tennis</h1>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ border: "2px solid #00897b", borderRadius: 6, touchAction: "none" }}
      />
      {over && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ color: "#ffd166", fontWeight: 700, fontSize: "1.2rem" }}>
            {winner} gewinnt!
          </p>
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
                <button onClick={saveRecord} style={{ ...btnStyle, margin: 0 }}>OK</button>
              </div>
            </div>
          ) : (
            <button onClick={restart} style={btnStyle}>Nochmal</button>
          )}
          <button onClick={() => { setMode(null); if (animRef.current) cancelAnimationFrame(animRef.current); }} style={{ ...btnStyle, background: "#162a2d", border: "2px solid #00897b" }}>
            Modus wechseln
          </button>
        </div>
      )}
      <p style={{ marginTop: "0.75rem", color: "#666", fontSize: "0.85rem" }}>
        ←/→: bewegen &middot; P/Esc: Pause &middot; Touch: wischen
      </p>
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
  );
}
