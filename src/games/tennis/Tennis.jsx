import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";

const FIELD_W = 440;
const FIELD_H = 400;
const SLIDER_H = 40;
const CANVAS_W = FIELD_W;
const CANVAS_H = FIELD_H + SLIDER_H;
const PAD_W = 60;
const PAD_H = 10;
const BALL_R = 5;
const WIN_SCORE = 5;
const PAD_SPEED = 6;
const BALL_SPEED_INIT = 1.8;
const BALL_SPEED_INC = 0.2;
const AI_SPEED = 3.0;
const HS_KEY = "tennis_highscore";

const FIELD_TOP = 20;
const FIELD_BOT = FIELD_H - 20;
const FIELD_LEFT = 20;
const FIELD_RIGHT = FIELD_W - 20;
const FIELD_MID_Y = FIELD_H / 2;

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
    p1: { x: FIELD_W / 2 - PAD_W / 2, score: 0 },
    p2: { x: FIELD_W / 2 - PAD_W / 2, score: 0 },
    ball: { x: FIELD_W / 2, y: FIELD_MID_Y, vx: 0, vy: -BALL_SPEED_INIT },
    speed: BALL_SPEED_INIT,
    rally: 0,
  };
}

function resetBall(s, dir) {
  s.ball = { x: FIELD_W / 2, y: FIELD_MID_Y, vx: 0, vy: dir * BALL_SPEED_INIT };
  s.speed = BALL_SPEED_INIT;
  s.rally = 0;
}

function drawCourt(ctx) {
  // outer area
  ctx.fillStyle = "#1a4d2e";
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  // court surface
  ctx.fillStyle = "#2d8a4e";
  ctx.fillRect(FIELD_LEFT, FIELD_TOP, FIELD_RIGHT - FIELD_LEFT, FIELD_BOT - FIELD_TOP);

  // baseline
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD_LEFT, FIELD_TOP, FIELD_RIGHT - FIELD_LEFT, FIELD_BOT - FIELD_TOP);

  // service lines
  const serviceDist = 60;
  ctx.strokeRect(FIELD_LEFT, FIELD_TOP + serviceDist, FIELD_RIGHT - FIELD_LEFT, serviceDist);
  ctx.strokeRect(FIELD_LEFT, FIELD_BOT - serviceDist * 2, FIELD_RIGHT - FIELD_LEFT, serviceDist);

  // center service line
  ctx.beginPath();
  ctx.moveTo(FIELD_W / 2, FIELD_TOP + serviceDist);
  ctx.lineTo(FIELD_W / 2, FIELD_TOP + serviceDist * 2);
  ctx.stroke();

  // center mark
  ctx.beginPath();
  ctx.moveTo(FIELD_W / 2, FIELD_TOP);
  ctx.lineTo(FIELD_W / 2, FIELD_TOP + 8);
  ctx.moveTo(FIELD_W / 2, FIELD_BOT);
  ctx.lineTo(FIELD_W / 2, FIELD_BOT - 8);
  ctx.stroke();

  // net
  ctx.fillStyle = "#fff";
  ctx.fillRect(FIELD_LEFT, FIELD_MID_Y - 1, FIELD_RIGHT - FIELD_LEFT, 2);
  // net mesh
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 0.5;
  for (let x = FIELD_LEFT; x <= FIELD_RIGHT; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD_MID_Y - 6);
    ctx.lineTo(x, FIELD_MID_Y + 6);
    ctx.stroke();
  }
}

function drawSlider(ctx, paddleX) {
  const sliderY = FIELD_H;
  const sliderMidY = sliderY + SLIDER_H / 2;

  ctx.fillStyle = "#0f1923";
  ctx.fillRect(0, sliderY, FIELD_W, SLIDER_H);

  // track
  ctx.fillStyle = "#1a3a35";
  ctx.fillRect(FIELD_LEFT, sliderMidY - 4, FIELD_RIGHT - FIELD_LEFT, 8);

  // paddle indicator
  const indicatorX = paddleX + PAD_W / 2;
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(indicatorX, sliderMidY, 8, 0, Math.PI * 2);
  ctx.fill();

  // borders
  ctx.strokeStyle = "#00897b";
  ctx.lineWidth = 1;
  ctx.strokeRect(FIELD_LEFT, sliderMidY - 14, FIELD_RIGHT - FIELD_LEFT, 28);
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
  const hitFlashRef = useRef(0);
  const sliderDragging = useRef(false);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    const s = stateRef.current;
    if (!ctx || !s) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    drawCourt(ctx);

    // paddles
    const p1Flash = hitFlashRef.current > 0;
    if (p1Flash) hitFlashRef.current--;

    ctx.fillStyle = p1Flash ? "#ffd166" : "#00897b";
    ctx.shadowColor = p1Flash ? "#ffd166" : "transparent";
    ctx.shadowBlur = p1Flash ? 14 : 0;
    ctx.fillRect(s.p1.x, FIELD_BOT - PAD_H - 4, PAD_W, PAD_H);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#00897b";
    ctx.fillRect(s.p2.x, FIELD_TOP + 4, PAD_W, PAD_H);

    // ball
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // scores
    ctx.textAlign = "center";
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillText(s.p2.score, FIELD_W / 2 + 1, FIELD_TOP + 41);
    ctx.fillText(s.p1.score, FIELD_W / 2 + 1, FIELD_BOT - 31);
    ctx.fillStyle = "#fff";
    ctx.fillText(s.p2.score, FIELD_W / 2, FIELD_TOP + 40);
    ctx.fillText(s.p1.score, FIELD_W / 2, FIELD_BOT - 32);

    ctx.font = "11px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(modeRef.current === "ai" ? "KI" : "Spieler 2", FIELD_W / 2, FIELD_TOP + 56);
    ctx.fillText("Du", FIELD_W / 2, FIELD_BOT - 46);

    drawSlider(ctx, s.p1.x);

    if (pausedRef.current) {
      ctx.fillStyle = "rgba(10,18,16,0.75)";
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("PAUSE", FIELD_W / 2, FIELD_H / 2);
    }
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s || pausedRef.current || overRef.current) return;

    const keys = keysRef.current;
    if (keys["ArrowLeft"]) s.p1.x = Math.max(FIELD_LEFT, s.p1.x - PAD_SPEED);
    if (keys["ArrowRight"]) s.p1.x = Math.min(FIELD_RIGHT - PAD_W, s.p1.x + PAD_SPEED);

    if (modeRef.current === "ai") {
      const target = s.ball.x - PAD_W / 2;
      const diff = target - s.p2.x;
      if (Math.abs(diff) > 4) {
        s.p2.x += Math.sign(diff) * Math.min(AI_SPEED, Math.abs(diff));
      }
    } else {
      if (keys["a"] || keys["A"]) s.p2.x = Math.max(FIELD_LEFT, s.p2.x - PAD_SPEED);
      if (keys["d"] || keys["D"]) s.p2.x = Math.min(FIELD_RIGHT - PAD_W, s.p2.x + PAD_SPEED);
    }

    const b = s.ball;
    b.x += b.vx;
    b.y += b.vy;

    if (b.x <= FIELD_LEFT + BALL_R || b.x >= FIELD_RIGHT - BALL_R) {
      b.vx *= -1;
      b.x = Math.max(FIELD_LEFT + BALL_R, Math.min(FIELD_RIGHT - BALL_R, b.x));
    }

    const p1y = FIELD_BOT - PAD_H - 4;
    const p2y = FIELD_TOP + 4;

    if (
      b.vy > 0 &&
      b.y + BALL_R >= p1y &&
      b.y + BALL_R <= p1y + PAD_H + 8 &&
      b.x >= s.p1.x &&
      b.x <= s.p1.x + PAD_W
    ) {
      const hitPos = (b.x - s.p1.x) / PAD_W;
      const angle = (hitPos - 0.5) * (Math.PI / 3);
      s.speed = Math.min(8, s.speed + BALL_SPEED_INC);
      b.vy = -Math.abs(Math.cos(angle) * s.speed);
      b.vx = Math.sin(angle) * s.speed;
      b.y = p1y - BALL_R;
      s.rally++;
      hitFlashRef.current = 6;
    }

    if (
      b.vy < 0 &&
      b.y - BALL_R <= p2y + PAD_H &&
      b.y - BALL_R >= p2y - 8 &&
      b.x >= s.p2.x &&
      b.x <= s.p2.x + PAD_W
    ) {
      const hitPos = (b.x - s.p2.x) / PAD_W;
      const angle = (hitPos - 0.5) * (Math.PI / 3);
      s.speed = Math.min(8, s.speed + BALL_SPEED_INC);
      b.vy = Math.abs(Math.cos(angle) * s.speed);
      b.vx = Math.sin(angle) * s.speed;
      b.y = p2y + PAD_H + BALL_R;
      s.rally++;
    }

    if (b.y > FIELD_H + 10) {
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

    if (b.y < -10) {
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

  function getCanvasPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function moveP1To(canvasX) {
    const s = stateRef.current;
    if (!s) return;
    s.p1.x = Math.max(FIELD_LEFT, Math.min(FIELD_RIGHT - PAD_W, canvasX - PAD_W / 2));
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (overRef.current || pausedRef.current) return;
    const pos = getCanvasPos(e.touches[0]);
    if (pos.y >= FIELD_H) {
      sliderDragging.current = true;
      moveP1To(pos.x);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (overRef.current || pausedRef.current) return;
    if (sliderDragging.current) {
      const pos = getCanvasPos(e.touches[0]);
      moveP1To(pos.x);
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    sliderDragging.current = false;
  }

  function onMouseDown(e) {
    if (overRef.current || pausedRef.current) return;
    const pos = getCanvasPos(e);
    if (pos.y >= FIELD_H) {
      sliderDragging.current = true;
      moveP1To(pos.x);
    }
  }

  function onMouseMove(e) {
    if (!sliderDragging.current) return;
    if (overRef.current || pausedRef.current) return;
    const pos = getCanvasPos(e);
    moveP1To(pos.x);
  }

  function onMouseUp() {
    sliderDragging.current = false;
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
          <button onClick={() => startGame("ai")} style={btnStyle}>Start</button>
        </div>
        <div style={{ marginTop: "1.5rem", color: "#6b8f8a", fontSize: "0.85rem" }}>
          <p><strong>Keyboard:</strong> ←/→</p>
          <p><strong>Touch:</strong> Schieberegler unten</p>
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
        width={CANVAS_W}
        height={CANVAS_H}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ border: "2px solid #00897b", borderRadius: 6, touchAction: "none", maxWidth: "100%" }}
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
        </div>
      )}
      <p style={{ marginTop: "0.75rem", color: "#666", fontSize: "0.85rem" }}>
        ←/→: bewegen &middot; P/Esc: Pause &middot; Slider: ziehen
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
