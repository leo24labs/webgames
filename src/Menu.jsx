import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const HS_KEY = "tetris_highscore";

function loadHighScore() {
  try {
    return JSON.parse(localStorage.getItem(HS_KEY)) || null;
  } catch {
    return null;
  }
}

const games = [
  { name: "Tetris", path: "/tetris", desc: "Klassiker – Blöcke staple", hsKey: HS_KEY },
];

export default function Menu() {
  const [scores, setScores] = useState({});

  useEffect(() => {
    const s = {};
    games.forEach((g) => { s[g.hsKey] = loadHighScore(); });
    setScores(s);
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Web Games</h1>
      <p style={{ color: "#6b8f8a", marginBottom: "1.5rem" }}>Wähle ein Spiel</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        {games.map((g) => {
          const hs = scores[g.hsKey];
          return (
            <Link
              key={g.path}
              to={g.path}
              style={{
                display: "block",
                padding: "1.5rem 1rem",
                background: "#0f1923",
                border: "2px solid #00897b",
                borderRadius: 10,
                textDecoration: "none",
                color: "#eee",
                transition: "border-color 0.2s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ffd166";
                e.currentTarget.style.transform = "scale(1.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#00897b";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                {g.name === "Tetris" ? "🧱" : "🎮"}
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{g.name}</div>
              <div style={{ color: "#6b8f8a", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                {g.desc}
              </div>
              {hs && (
                <div style={{ marginTop: "0.6rem", fontSize: "0.8rem" }}>
                  <span style={{ color: "#ffd166", fontWeight: 700 }}>{hs.name}</span>
                  <span style={{ color: "#6b8f8a" }}> – {hs.score}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
