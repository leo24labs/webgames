# Tetris

Klassisches Tetris als Browser-Spiel – gebaut mit React und Canvas.

## Features

- **10×20 Spielfeld** mit 7 Tetromino-Typen (I, O, J, L, S, Z, T)
- **Wall Kicks** – Rotation mit Kollisionsprüfung und Ausweichbewegungen
- **Scoring-System**
  - 1 Line → 100 Punkte
  - 2 Lines → 400 Punkte
  - 3 Lines → 800 Punkte
  - 4 Lines (Tetris) → 2.000 Punkte + animierter Bonus
- **Level-System** – Geschwindigkeit steigt alle 10 Teile
- **High Score** – wird im localStorage gespeichert (max. 5 Zeichen Name)
- **Next Piece Vorschau** auf der rechten Seite
- **Pause** per Taste oder Button
- **Touch-Steuerung** für Mobile (Swipe = bewegen, Tippen = drehen)
- **On-Screen Buttons** für Touch-Displays (Drehen, Fallen, Links/Rechts/Runter, Pause)
- **Responsive Skalierung** für kleine Bildschirme

## Steuerung

| Aktion | Tastatur | Touch |
|--------|----------|-------|
| Links/Rechts | ← → | Swipe horizontal |
| Drehen | ↑ | Tippen auf Canvas / ↻ Button |
| Soft Drop | ↓ | Swipe nach unten / ↓ Button |
| Hard Drop | Leertaste | ⬇ Button |
| Pause | P / Esc | ⏸ Button |

## Punkte-System

| Gelöschte Lines | Punkte |
|-----------------|--------|
| 1 | 100 |
| 2 | 400 |
| 3 | 800 |
| 4 (Tetris) | 2.000 |

## Geschwindigkeit

- Start: 800ms pro Tick
- Pro Level: −70ms
- Minimum: 100ms

## Technik

- React 19 + Canvas-Rendering
- Keine externen Libraries
- High Score in `localStorage` (Key: `tetris_highscore`)
- Touch-Events mit Auto-Repeat (80ms Intervall)
