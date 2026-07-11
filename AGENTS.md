# AGENTS.md

> Instructions for AI agents working in this repository.

## Project

React + Vite Spiele-Plattform. Jedes Spiel hat einen eigenen Ordner unter `src/games/`.

```
src/
  Menu.jsx            # Startseite – Spielübersicht
  App.jsx             # Router
  App.css             # globales Styling
  games/
    tetris/
      Tetris.jsx      # Tetris
lib/                  # gemeinsame Utilities (nicht React)
```

## Commands

```bash
npm install            # Dependencies installieren (einmalig)
npm run dev -- --host  # Dev-Server starten (localhost:5173)
                       # SSH-Zugriff: http://10.0.0.168:5173/
npm run build          # Production-Build
npm run preview        # Production-Build lokal testen
```

## Conventions

- React 19 + Vite 6
- Routing über `react-router-dom`
- Jedes Spiel: eigener Ordner in `src/games/<name>/`
- Spiele in `src/Menu.jsx` eintragen (Name, Pfad, Beschreibung)
- Komponente als Default-Export: `<Name>.jsx`
- Jedes Spiel: `<Link to="/">← Zurück zum Menü</Link>` oben
- Gemeinsame Utilities (keine React-Komponenten) in `lib/`
- Deutsche UI-Sprache
- Farbschema: Dunkel (#0f1923, #162a2d) + Akzent Petrol (#00897b) + Gelb (#ffd166)

## Wichtig

- High Scores werden in localStorage gespeichert (Key: `<spielname>_highscore`)
- Neues Spiel hinzufügen: Ordner anlegen, Komponente schreiben, in Menu.jsx + App.jsx eintragen
