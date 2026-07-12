# Tennis

2D-Tennis / Pong – Paddle gegen Paddle, wer zuerst 5 Punkte macht, gewinnt.

## Modus

- **Vs KI** – Einzelspieler gegen eine computergesteuerte Gegnerin
- **2 Spieler** – Links W/S, Rechts ↑/↓

## Features

- **600×400 Canvas** mit Rasterlinie in der Mitte
- **Ball-Physik** – Winkel hängt von der Trefferposition auf dem Paddle ab
- **Geschwindigkeitssteigerung** – mit jedem Treffer wird der Ball schneller
- **Rally-Zähler** – verfolgt wie viele Treffer in Folge
- **Score-Anzeige** mit Spielernamen/KI-Label
- **Pause** per P oder Esc
- **High Score** – wird im localStorage gespeichert (Key: `tennis_highscore`)
- **Moduswechsel** nach Spielende

## Steuerung

| Aktion | Spieler 1 | Spieler 2 |
|--------|-----------|-----------|
| Hoch | W | ↑ |
| Runter | S | ↓ |
| Pause | P / Esc | P / Esc |

## Spielmechanik

- **Trefferposition** auf dem Paddle bestimmt den Ballwinkel (±60°)
- **Startgeschwindigkeit:** 5 px/frame
- **Steigerung pro Treffer:** +0.4 px/frame
- **Maximum:** 12 px/frame
- **Gewinn:** 5 Punkte

## KI

- Folgt dem Ball mit reduzierter Geschwindigkeit (4.2 px/frame)
- Reagiert erst ab 4px Abstand – gibt dem Spieler eine Chance
