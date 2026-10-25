# Four Corners design

The Base Camp design system, every screen at desktop (1440) and mobile (390), and a clickable prototype. Built in React + Vite so the components can become the real frontend.

```bash
cd design
npm install
npm run dev        # http://localhost:5173
```

| Route | What it shows |
|---|---|
| `#/` | Overview |
| `#/system` | Design system: colors, type, buttons, inputs, signs, panels, meter, character component, states |
| `#/desktop` | All screens and states at 1440 wide |
| `#/mobile` | All screens and states at 390 wide |
| `#/screen/<key>/<desktop\|mobile>` | One screen on its own (keys: `welcome`, `about`, `reveal`, `basecamp`, `scout`, `odds`, `flag`, `flag-signed`, `flag-tampered`, `health`, `stamp`, `stamp-after`, `basecamp-empty`, `states`) |
| `#/app/welcome` | Prototype. Picks desktop or mobile from the window width |

`npm run shots -- <outDir>` writes a PNG of every screen at both widths, plus the design system page. The dev server must be running.

## Where things live

- `src/styles.css`: tokens (`--ink`, `--sun`, ...) and every component style. Mobile layout is scoped to `.fc--mobile`, not media queries, so a 390 frame renders correctly inside the wide design board.
- `src/components/Character.tsx`: `<Character color accessory mood pose />`, plus `<Face>` (avatar crop) and `<Compass>` (the guide).
- `src/components/ui.tsx`: buttons, folded-map panel, sign and signpost, meter, chips, pills, slider, stepper, stamp, and loading/empty/error states.
- `src/components/Scenes.tsx`: welcome map, Base Camp campfire scene, reveal stage.
- `src/screens/`: one file per flow. `src/data.ts` holds demo content shaped like `backend/src/types.ts`.

## Rules worth keeping

- The 3px navy outline is only for characters, signs and buttons (chips, pills and name tags count as buttons or signs). Panels, scenes and notes stay flat.
- Pine, berry and rock fail contrast as small text on snow (3.6 to 4.2 : 1). Use them for graphics only. Secondary text uses ink soft `#3F5670` (7.3 : 1).
- Selected and done states always add a check or a word, never only a color change.
- The focus ring is 3px berry with a 3px snow gap, so it shows on sky, snow and sun.
- Mobile tap targets are at least 44px, small buttons included.

## Mapping to the backend

The backend's `Character` uses `coffee cup` for Arlo's accessory and moods `relaxed / excited / happy / cool / bold`. The design draws `thermos` and uses `calm` for `relaxed`. Map these when wiring the API, or add `thermos` to `ACCESSORIES` in `backend/src/character.ts`.
