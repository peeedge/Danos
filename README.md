# Danos

A daily Jeopardy-inspired trivia calendar. One clue a day, stakes that climb through the week, surprise Daily Doubles, and a Sunday Final Jeopardy.

Danos is an independent fan-made game. It is not affiliated with or endorsed by Jeopardy! or The New York Times. All clues are original. Winnings are virtual.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm test` | Run the game-logic unit tests |
| `npm run typecheck` | Type-check the project |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |

Requires Node.js 20 or newer.

## How to play

- **Monday–Saturday:** one Jeopardy-style clue. Values rise from $200 to $1,200.
- **Respond as a question** if you like (“Who is Ada Lovelace?”). Bare answers are accepted too. Capitalization, punctuation, and small typos are forgiven.
- **One try.** A correct response earns the clue’s value; an incorrect one subtracts it. A missed day is worth $0 and breaks your streak.
- **Daily Doubles** appear on about 10% of weekday clues. You wager before the clue is revealed.
- **Sunday is Final Jeopardy.** See the category, wager part of your weekly balance, then answer one last clue.
- Weekly winnings reset every Monday. Lifetime winnings and your longest streak carry on.

## Persistence

Progress, wagers, and statistics are saved in this browser’s LocalStorage (`danos:state`). That is local-first persistence for a single device — not an account, not cross-device sync, and not secure anti-cheat. Clearing site data erases your record. You can also reset from Settings.

New clues unlock at midnight in the time zone chosen in Settings (your local zone by default).

Appearance (light, dark, or match the device) is saved with your other settings. Resetting progress keeps your theme and time zone.

## Sharing

After you finish a day’s clue, **Share result** posts a spoiler-free card: the category, whether you got it, the money, and a week grid. The clue and answer stay private. On desktop this usually copies to the clipboard; on phones it can open the system share sheet.

## Project layout

```
src/
  game/           Scoring rules and pure state transitions
  lib/            Dates, answers, wagers, statistics, theme, share cards
  content/        Seed trivia and the content-provider interface
  persistence/    Versioned LocalStorage load/save
  hooks/          Game state and daily challenge
  components/     Board, calendar, play flow, stats, settings
  styles/         Visual identity
```

Scoring never happens in click handlers. UI actions call `useGameState`, which applies a pure engine transition and writes the result to LocalStorage before React re-renders.

A remote trivia API can replace `localContentProvider` later without rewriting the game rules. The current dataset is eight curated weeks of original clues, rotated deterministically so future dates stay hidden until their day arrives.
