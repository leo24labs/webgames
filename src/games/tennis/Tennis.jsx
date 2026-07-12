import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";

const FIELD_W = 360;
const FIELD_H = 600;
const CANVAS_W = FIELD_W;
const CANVAS_H = FIELD_H + 60;
const PAD_W = 55;
const PAD_H = 10;
const BALL_R = 5;
const BALL_SPEED_INIT = 2.5;
const BALL_SPEED_INC = 0.5;
const AI_SPEED = 3.5;
const DOT_OFFSET = 50;
const DOT_R = 10;
const HS_KEY = "tennis_highscore";

const FIELD_TOP = 30;
const FIELD_BOT = FIELD_H - 30;
const FIELD_LEFT = 40;
const FIELD_RIGHT = FIELD_W - 40;
const FIELD_MID_Y = FIELD_H / 2;
const P1_BASE_Y = FIELD_BOT - PAD_H;
const P2_BASE_Y = FIELD_TOP;
const P1_MIN_Y = FIELD_MID_Y + 30;
const P2_MAX_Y = FIELD_MID_Y - 30;

const POINT_LABELS = ["0", "15", "30", "40"];

function tennisScore(p1, p2) {
  if (p1 < 3 && p2 < 3) {
    return { p1: POINT_LABELS[p1], p2: POINT_LABELS[p2], special: null };
  }
  if (p1 >= 3 && p2 >= 3) {
    if (p1 === p2) return { p1: "40", p2: "40", special: "Einstand" };
    if (p1 > p2) return { p1: "40", p2: "40", special: "Vorteil Du" };
    return { p1: "40", p2: "40", special: "Vorteil KI" };
  }
  return { p1: POINT_LABELS[Math.min(p1, 3)], p2: POINT_LABELS[Math.min(p2, 3)], special: null };
}

function checkGameWinner(p1, p2) {
  if (p1 >= 3 && p2 >= 3) {
    if (p1 - p2 >= 2) return "Du";
    if (p2 - p1 >= 2) return "KI";
    return null;
  }
  if (p1 >= 4) return "Du";
  if (p2 >= 4) return "KI";
  return null;
}

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
    p1: { x: FIELD_W / 2 - PAD_W / 2, y: P1_BASE_Y },
    p2: { x: FIELD_W / 2 - PAD_W / 2, y: P2_BASE_Y },
    ball: { x: FIELD_W / 2, y: FIELD_MID_Y - 20, vx: 1.5, vy: -BALL_SPEED_INIT },
    speed: BALL_SPEED_INIT,
    rally: 0,
    p1Pts: 0,
    p2Pts: 0,
  };
}

function resetBall(s, dir) {
  s.ball = { x: FIELD_W / 2, y: FIELD_MID_Y, vx: (Math.random() - 0.5) * 2, vy: dir * BALL_SPEED_INIT };
  s.speed = BALL_SPEED_INIT;
  s.rally = 0;
}

function drawCourt(ctx) {
  ctx.fillStyle = "#0a1210";
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  ctx.fillStyle = "#1a3a2a";
  ctx.fillRect(FIELD_LEFT, FIELD_TOP, FIELD_RIGHT - FIELD_LEFT, FIELD_BOT - FIELD_TOP);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD_LEFT, FIELD_TOP, FIELD_RIGHT - FIELD_LEFT, FIELD_BOT - FIELD_TOP);

  const serviceH = 80;
  ctx.beginPath();
  ctx.moveTo(FIELD_LEFT, FIELD_TOP + serviceH);
  ctx.lineTo(FIELD_RIGHT, FIELD_TOP + serviceH);
  ctx.moveTo(FIELD_LEFT, FIELD_BOT - serviceH);
  ctx.lineTo(FIELD_RIGHT, FIELD_BOT - serviceH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(FIELD_W / 2, FIELD_TOP + serviceH);
  ctx.lineTo(FIELD_W / 2, FIELD_BOT - serviceH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(FIELD_W / 2, FIELD_TOP);
  ctx.lineTo(FIELD_W / 2, FIELD_TOP + 10);
  ctx.moveTo(FIELD_W / 2, FIELD_BOT);
  ctx.lineTo(FIELD_W / 2, FIELD_BOT - 10);
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.fillRect(FIELD_LEFT - 4, FIELD_MID_Y - 2, FIELD_RIGHT - FIELD_LEFT + 8, 4);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  for (let x = FIELD_LEFT; x <= FIELD_RIGHT; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD_MID_Y - 12);
    ctx.lineTo(x, FIELD_MID_Y + 12);
    ctx.stroke();
  }
  for (let y = FIELD_MID_Y - 12; y <= FIELD_MID_Y + 12; y += 6) {
    ctx.beginPath();
    ctx.moveTo(FIELD_LEFT, y);
    ctx.lineTo(FIELD_RIGHT, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#aaa";
  ctx.fillRect(FIELD_LEFT - 6, FIELD_MID_Y - 14, 8, 28);
  ctx.fillRect(FIELD_RIGHT - 2, FIELD_MID_Y - 14, 8, 28);
}

export default function Tennis() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const keysRef = useRef({});
  const [mode, setMode] = useState(null);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [over, setOver] = useState(false);
  const [winner, setWinner] = useState("");
  const [highScore, setHighScore] = useState(loadHighScore);
  const [newRecord, setNewRecord] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const pausedRef = useRef(false);
  const overRef = useRef(false);
  const animRef = useRef(null);
  const hitFlashRef = useRef(0);
  const dotDragging = useRef(false);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    const s = stateRef.current;
    if (!ctx || !s) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawCourt(ctx);

    // control zone below field
    ctx.fillStyle = "#0f1923";
    ctx.fillRect(0, FIELD_H, CANVAS_W, CANVAS_H - FIELD_H);
    ctx.strokeStyle = "#1a3a35";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(FIELD_LEFT, FIELD_H + 30);
    ctx.lineTo(FIELD_RIGHT, FIELD_H + 30);
    ctx.stroke();

    const p1Flash = hitFlashRef.current > 0;
    if (p1Flash) hitFlashRef.current--;

    ctx.fillStyle = p1Flash ? "#ffd166" : "#00897b";
    ctx.shadowColor = p1Flash ? "#ffd166" : "transparent";
    ctx.shadowBlur = p1Flash ? 14 : 0;
    ctx.fillRect(s.p1.x, s.p1.y, PAD_W, PAD_H);
    ctx.shadowBlur = 0;

    // control dot in the zone below field
    const dotX = s.p1.x + PAD_W / 2;
    const dotY = FIELD_H + 30;
    ctx.strokeStyle = "rgba(255,209,102,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(dotX, s.p1.y + PAD_H);
    ctx.lineTo(dotX, dotY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(dotX, dotY, DOT_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00897b";
    ctx.fillRect(s.p2.x, s.p2.y, PAD_W, PAD_H);

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    const ts = tennisScore(s.p1Pts, s.p2Pts);
    ctx.textAlign = "center";

    if (ts.special) {
      ctx.font = "bold 22px sans-serif";
      ctx.fillStyle = "#ffd166";
      ctx.fillText(ts.special, FIELD_W / 2, FIELD_MID_Y - 20);
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#6b8f8a";
      ctx.fillText("Du: " + ts.p1 + "  KI: " + ts.p2, FIELD_W / 2, FIELD_MID_Y + 2);
    } else {
      ctx.font = "bold 32px sans-serif";
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillText(ts.p1, FIELD_W / 2 + 1, FIELD_BOT - 39);
      ctx.fillText(ts.p2, FIELD_W / 2 + 1, FIELD_TOP + 51);
      ctx.fillStyle = "#fff";
      ctx.fillText(ts.p1, FIELD_W / 2, FIELD_BOT - 40);
      ctx.fillText(ts.p2, FIELD_W / 2, FIELD_TOP + 50);
    }

    ctx.font = "11px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("KI", FIELD_W / 2, FIELD_TOP + 66);
    ctx.fillText("Du", FIELD_W / 2, FIELD_BOT - 54);

    if (pausedRef.current) {
      ctx.fillStyle = "rgba(10,18,16,0.75)";
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("PAUSE", FIELD_W / 2, FIELD_H / 2);
    }
  }, []);

  function awardPoint(who) {
    const s = stateRef.current;
    if (!s) return;
    if (who === "p1") s.p1Pts++;
    else s.p2Pts++;
    setScore({ p1: s.p1Pts, p2: s.p2Pts });

    const w = checkGameWinner(s.p1Pts, s.p2Pts);
    if (w) {
      overRef.current = true;
      setWinner(w);
      setOver(true);
      return;
    }
  }

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s || pausedRef.current || overRef.current) return;

    const keys = keysRef.current;
    if (keys["ArrowLeft"]) s.p1.x = Math.max(FIELD_LEFT, s.p1.x - 8);
    if (keys["ArrowRight"]) s.p1.x = Math.min(FIELD_RIGHT - PAD_W, s.p1.x + 8);
    if (keys["ArrowUp"]) s.p1.y = Math.max(P1_MIN_Y, s.p1.y - 5);
    if (keys["ArrowDown"]) s.p1.y = Math.min(P1_BASE_Y, s.p1.y + 5);

    const target = s.ball.x - PAD_W / 2;
    const diffX = target - s.p2.x;
    if (Math.abs(diffX) > 4) {
      s.p2.x += Math.sign(diffX) * Math.min(AI_SPEED, Math.abs(diffX));
    }
    if (s.ball.vy < 0) {
      const targetY = Math.max(P2_MAX_Y, s.ball.y - 60);
      const diffY = targetY - s.p2.y;
      if (Math.abs(diffY) > 4) {
        s.p2.y += Math.sign(diffY) * Math.min(AI_SPEED * 0.8, Math.abs(diffY));
      }
    } else {
      const diffY = P2_BASE_Y - s.p2.y;
      if (Math.abs(diffY) > 4) {
        s.p2.y += Math.sign(diffY) * Math.min(AI_SPEED * 0.6, Math.abs(diffY));
      }
    }

    const b = s.ball;
    b.x += b.vx;
    b.y += b.vy;

    if (b.x < FIELD_LEFT - 15 || b.x > FIELD_RIGHT + 15) {
      awardPoint("p2");
      if (overRef.current) return;
      resetBall(s, -1);
      draw();
      return;
    }

    if (b.y <= FIELD_TOP + BALL_R) {
      awardPoint("p1");
      if (overRef.current) return;
      resetBall(s, 1);
      draw();
      return;
    }
    if (b.y >= FIELD_BOT - BALL_R) {
      awardPoint("p2");
      if (overRef.current) return;
      resetBall(s, -1);
      draw();
      return;
    }

    // net collision - ball can hit the net
    if (
      ((b.vy > 0 && b.y + BALL_R >= FIELD_MID_Y - 3 && b.y <= FIELD_MID_Y) ||
       (b.vy < 0 && b.y - BALL_R <= FIELD_MID_Y + 3 && b.y >= FIELD_MID_Y)) &&
      b.x >= FIELD_LEFT && b.x <= FIELD_RIGHT
    ) {
      const netChance = Math.abs(b.vx) / (Math.abs(b.vx) + Math.abs(b.vy));
      if (netChance < 0.3 || Math.abs(b.vy) < 2) {
        b.vy *= -0.4;
        b.vx *= 0.7;
        b.y = b.vy > 0 ? FIELD_MID_Y + 5 : FIELD_MID_Y - 5;
      }
    }

    const p1y = s.p1.y;
    if (
      b.vy > 0 &&
      b.y + BALL_R >= p1y &&
      b.y + BALL_R <= p1y + PAD_H + 10 &&
      b.x >= s.p1.x &&
      b.x <= s.p1.x + PAD_W
    ) {
      const hitPos = (b.x - s.p1.x) / PAD_W;
      const angle = (hitPos - 0.5) * (Math.PI / 3);
      s.speed = Math.min(10, s.speed + BALL_SPEED_INC);
      b.vy = -Math.abs(Math.cos(angle) * s.speed);
      b.vx = Math.sin(angle) * s.speed;
      b.y = p1y - BALL_R;
      s.rally++;
      hitFlashRef.current = 6;
    }

    const p2y = s.p2.y;
    if (
      b.vy < 0 &&
      b.y - BALL_R <= p2y + PAD_H &&
      b.y - BALL_R >= p2y - 10 &&
      b.x >= s.p2.x &&
      b.x <= s.p2.x + PAD_W
    ) {
      const hitPos = (b.x - s.p2.x) / PAD_W;
      const angle = (hitPos - 0.5) * (Math.PI / 3);
      s.speed = Math.min(10, s.speed + BALL_SPEED_INC);
      b.vy = Math.abs(Math.cos(angle) * s.speed);
      b.vx = Math.sin(angle) * s.speed;
      b.y = p2y + PAD_H + BALL_R;
      s.rally++;
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

  function startGame() {
    setScore({ p1: 0, p2: 0 });
    setOver(false);
    overRef.current = false;
    setWinner("");
    setNewRecord(false);
    setPlayerName("");
    pausedRef.current = false;
    setMode("ai");
  }

  function restart() {
    setScore({ p1: 0, p2: 0 });
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
    saveHighScore(name, score.p1);
    setHighScore({ name, score: score.p1 });
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

  function moveP1To(canvasX, canvasY) {
    const s = stateRef.current;
    if (!s) return;
    s.p1.x = Math.max(FIELD_LEFT, Math.min(FIELD_RIGHT - PAD_W, canvasX - PAD_W / 2));
    if (canvasY !== undefined) {
      const zoneTop = FIELD_H + 10;
      const zoneBot = CANVAS_H - 10;
      const t = Math.max(0, Math.min(1, (canvasY - zoneTop) / (zoneBot - zoneTop)));
      s.p1.y = P1_BASE_Y - t * (P1_BASE_Y - P1_MIN_Y);
    }
  }

  function hitDot(pos) {
    const s = stateRef.current;
    if (!s) return false;
    const dotX = s.p1.x + PAD_W / 2;
    const dotY = FIELD_H + 30;
    const dx = pos.x - dotX;
    const dy = pos.y - dotY;
    return Math.sqrt(dx * dx + dy * dy) <= DOT_R + 20;
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (overRef.current || pausedRef.current) return;
    const pos = getCanvasPos(e.touches[0]);
    if (pos.y >= FIELD_H) {
      dotDragging.current = true;
      moveP1To(pos.x, pos.y);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (overRef.current || pausedRef.current || !dotDragging.current) return;
    const pos = getCanvasPos(e.touches[0]);
    moveP1To(pos.x, pos.y);
  }

  function onTouchEnd(e) {
    e.preventDefault();
    dotDragging.current = false;
  }

  function onMouseDown(e) {
    if (overRef.current || pausedRef.current) return;
    const pos = getCanvasPos(e);
    if (pos.y >= FIELD_H) {
      dotDragging.current = true;
      moveP1To(pos.x, pos.y);
    }
  }

  function onMouseMove(e) {
    if (overRef.current || pausedRef.current || !dotDragging.current) return;
    const pos = getCanvasPos(e);
    moveP1To(pos.x, pos.y);
  }

  function onMouseUp() {
    dotDragging.current = false;
  }

  useEffect(() => {
    if (over && score.p1 > 0 && (!highScore || score.p1 > highScore.score)) {
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
        <p style={{ color: "#6b8f8a", marginBottom: "0.5rem" }}>Echt Tennis: 15 · 30 · 40 · Einstand · Vorteil</p>
        <p style={{ color: "#6b8f8a", marginBottom: "1.5rem", fontSize: "0.85rem" }}>Gewinne ein Game!</p>
        {highScore && (
          <p style={{ color: "#6b8f8a", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Rekord: <span style={{ color: "#ffd166", fontWeight: 700 }}>{highScore.name}</span> – {highScore.score}
          </p>
        )}
        <button onClick={startGame} style={btnStyle}>Start</button>
        <div style={{ marginTop: "1.5rem", color: "#6b8f8a", fontSize: "0.85rem" }}>
          <p><strong>Keyboard:</strong> ←/→ bewegen · ↑ zum Netz</p>
          <p><strong>Touch:</strong> Punkt ziehen</p>
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
            {winner} gewinnt das Game!
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
        ←/→/↑/↓: bewegen · P/Esc: Pause · Punkt: ziehen
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
      