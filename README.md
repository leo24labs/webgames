# Web Games

Browser-basierte Mini-Spiele mit React + Vite.

## Spiele

| Spiel | Steuerung |
|-------|-----------|
| Tetris | Pfeiltasten: bewegen/drehen · Leertaste: Hard Drop |

## Lokal starten

```bash
npm install
npm run dev
```

Dann `http://localhost:5173` öffnen.

## Technologie

- React 19 + Vite 6
- Routing über react-router-dom
- Keine externen Libraries – nur Vanilla JS + Canvas
- Persistente High Scores (localStorage)

## Struktur

```
src/
  Menu.jsx          # Startseite – Spielübersicht
  App.jsx           # Router
  App.css           # globales Styling
  games/
    tetris/
      Tetris.jsx    # Tetris-Logik + Rendering
lib/                # gemeinsame Utilities
```

## Neues Spiel hinzufügen

1. Ordner unter `src/games/<name>/` anlegen
2. Komponente als Default-Export erstellen
3. In `src/Menu.jsx` eintragen (Name, Pfad, Beschreibung)
4. Route in `src/App.jsx` hinzufügen
5. `<Link to="/">← Zurück zum Menü</Link>` oben einbauen
