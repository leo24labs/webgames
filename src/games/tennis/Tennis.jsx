import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const W = 600;
const H = 400;
const PAD_W = 12;
const PAD_H = 70;
const BALL_SIZE = 10;
const WIN_SCORE = 5;
const PAD_SPEED = 6;
const BALL_SPEED_INIT = 5;
const BALL_SPEED_INC = 0.4;
const AI_SPEED = 4.2;
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
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const animRef = useRef(null);

  function initState() {
    return {
      p1: { y: H / 2 - PAD_H / 2, score: 0 },
      p2: { y: H / 2 - PAD_H / 2, score: 0 },
      ball: { x: W / 2, y: H / 2, vx: BALL_SPEED_INIT, vy: 0 },
      speed: BALL_SPEED_INIT,
      rally: 0,
      lastHit: null,
    };
  }

  function draw() {
    const ctx = canvasRef.current?.getContext("2d");
    const s = stateRef.current;
    if (!ctx || !s) return;

    ctx.fillStyle = "#0a1210";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#1a3a35";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#00897b";
    ctx.fillRect(20, s.p1.y, PAD_W, PAD_H);
    ctx.fillRect(W - 20 - PAD_W, s.p2.y, PAD_W, PAD_H);

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#6b8f8a";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(s.p1.score, W / 4, 50);
    ctx.fillText(s.p2.score, (W * 3) / 4, 50);

    ctx.fillStyle = "#333";
    ctx.font = "14px sans-serif";
    ctx.fillText("Spieler 1", W / 4, 70);
    ctx.fillText(mode === "ai" ? "KI" : "Spieler 2", (W * 3) / 4, 70);

    if (pausedRef.current) {
      ctx.fillStyle = "rgba(10,18,16,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("PAUSE", W / 2, H / 2);
    }
  }

  function tick() {
    const s = stateRef.current;
    if (!s || pausedRef.current) return;

    const keys = keysRef.current;
    if (keys["w"] || keys["W"]) s.p1.y = Math.max(0, s.p1.y - PAD_SPEED);
    if (keys["s"] || keys["S"]) s.p1.y = Math.min(H - PAD_H, s.p1.y + PAD_SPEED);

    if (mode === "ai") {
      const target = s.ball.y - PAD_H / 2;
      const diff = target - s.p2.y;
      if (Math.abs(diff) > 4) {
        s.p2.y += Math.sign(diff) * Math.min(AI_SPEED, Math.abs(diff));
      }
    } else {
      if (keys["ArrowUp"]) s.p2.y = Math.max(0, s.p2.y - PAD_SPEED);
      if (keys["ArrowDown"]) s.p2.y = Math.min(H - PAD_H, s.p2.y + PAD_SPEED);
    }

    const b = s.ball;
    b.x += b.vx;
    b.y += b.vy;

    if (b.y <= 0 || b.y >= H) {
      b.vy *= -1;
      b.y = Math.max(0, Math.min(H, b.y));
    }

    const p1x = 20;
    const p2x = W - 20 - PAD_W;

    if (
      b.vx < 0 &&
      b.x - BALL_SIZE / 2 <= p1x + PAD_W &&
      b.x - BALL_SIZE / 2 >= p1x - 10 &&
      b.y >= s.p1.y &&
      b.y <= s.p1.y + PAD_H
    ) {
      const hitPos = (b.y - s.p1.y) / PAD_H;
      const angle = (hitPos - 0.5) * (Math.PI / 3);
      s.speed = Math.min(12, s.speed + BALL_SPEED_INC);
      b.vx = Math.abs(Math.cos(angle) * s.speed);
      b.vy = Math.sin(angle) * s.speed;
      b.x = p1x + PAD_W + BALL_SIZE / 2;
      s.rally++;
      s.lastHit = 1;
    }

    if (
      b.vx > 0 &&
      b.x + BALL_SIZE / 2 >= p2x &&
      b.x + BALL_SIZE / 2 <= p2x + PAD_W + 10 &&
      b.y >= s.p2.y &&
      b.y <= s.p2.y + PAD_H
    ) {
      const hitPos = (b.y - s.p2.y) / PAD_H;
      const angle = (hitPos - 0.5) * (Math.PI / 3);
      s.speed = Math.min(12, s.speed + BALL_SPEED_INC);
      b.vx = -Math.abs(Math.cos(angle) * s.speed);
      b.vy = Math.sin(angle) * s.speed;
      b.x = p2x - BALL_SIZE / 2;
      s.rally++;
      s.lastHit = 2;
    }

    if (b.x < -20) {
      s.p2.score++;
      setScore([s.p1.score, s.p2.score]);
      if (s.p2.score >= WIN_SCORE) {
        setWinner(mode === "ai" ? "KI" : "Spieler 2");
        setOver(true);
        return;
      }
      resetBall(s, 1);
    }

    if (b.x > W + 20) {
      s.p1.score++;
      setScore([s.p1.score, s.p2.score]);
      if (s.p1.score >= WIN_SCORE) {
        setWinner("Spieler 1");
        setOver(true);
        return;
      }
      resetBall(s, -1);
    }

    draw();
    animRef.current = requestAnimationFrame(tick);
  }

  function resetBall(s, dir) {
    s.ball = { x: W / 2, y: H / 2, vx: dir * BALL_SPEED_INIT, vy: 0 };
    s.speed = BALL_SPEED_INIT;
    s.rally = 0;
  }

  function startGame(selectedMode) {
    setMode(selectedMode);
    setScore([0, 0]);
    setOver(false);
    setWinner("");
    setNewRecord(false);
    setPlayerName("");
    pausedRef.current = false;
    setPaused(false);
    stateRef.current = initState();
    draw();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);
  }

  function restart() {
    startGame(mode);
  }

  function togglePause() {
    if (over) return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (!next && !over) {
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
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [over, mode]);

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
          <p><strong>Spieler 1:</strong> W / S</p>
          <p><strong>Spieler 2:</strong> ↑ / ↓</p>
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
        style={{ border: "2px solid #00897b", borderRadius: 6 }}
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
        W/S: Spieler 1 &middot; ↑/↓: Spieler 2 &middot; P/Esc: Pause
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
