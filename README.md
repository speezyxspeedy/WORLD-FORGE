# WORLD FORGE

**One platform. Unlimited player-created 3D games. Zero coding required.**

WORLD FORGE is a browser-based 3D game and virtual world creation platform built with React, TypeScript, Vite, Tailwind CSS, and Three.js. Creators can sculpt terrain, place procedural 3D assets, wire gameplay mechanics through a visual Event–Condition–Action node editor, playtest in 1st or 3rd person, and publish playable world snapshots directly into the Discover marketplace—without writing code.

All world creation and gameplay systems are manually controlled by the creator, with no AI-generated worlds or AI-dependent gameplay inside the platform.

---

## Key Features

### World Creation Studio
- **Interactive 3D Viewport**: Orbit, pan, and zoom camera controls, toggleable grid, world boundary guides, raycast selection, and `Move` (`W`), `Rotate` (`E`), and `Scale` (`R`) transform gizmos.
- **Terrain Editor**: Raise, lower, flatten, smooth, and vertex-paint brushes; one-click Hill, Mountain, Lake, and Flat Area stamps; adjustable water plane and biome presets.
- **Asset Library & Scene Hierarchy**: Categorized low-poly procedural 3D assets (Environment, Buildings, Nature, Vehicles, Weapons, Props, Obstacles, Decorations) with search, visibility toggles, locking, duplication, and undo/redo history (`Ctrl+Z` / `Ctrl+Shift+Z`).
- **Material, Physics & Atmosphere Inspector**: Visual PBR material controls (color, roughness, metalness, presets), solid collision and trigger volume toggles, time-of-day presets, sky/fog controls, and weather effects.

### Visual Logic & Gameplay Creator
- **No-Code Gameplay Rules**: Visually configure teams, max players, health, gravity, jump force, move speed, starting inventory, respawn time, match timer, score limits, and win conditions.
- **Playable Starter Templates**: Editable **Parkour**, **Team Deathmatch**, **Canyon Rally**, and **Open Valley Sandbox** templates that initialize full 3D worlds and gameplay rules.
- **Visual Logic Node Studio**: Drag-and-drop **Event**, **Condition**, and **Action** nodes connected via Bezier wires (`default`, `true`, `false` branches), cycle validation diagnostics, and a sandboxed execution simulator (no arbitrary script execution).

### Playtest Mode & Standalone Player
- Switch between **Edit** and **Playtest** directly on the same project data, or launch any world from **Discover**.
- **Controls**: `W A S D` / Arrow keys to move, `Space` to jump (with coyote time and jump buffering), click-and-drag mouse look, `E` to interact, `V` to toggle 3rd-person / 1st-person camera, and `Esc` to pause.
- Live HUD with health, score, match countdown, inventory, radar minimap, objective notifications, and Pause / Victory / Defeat overlays.

### Platform & Ecosystem
- **Discover Marketplace**: Featured world showcase, live search, 12 game categories, sorting, Demo Worlds clearly separated from user-published snapshots, plus likes, favorites, creator follows, comments, and Remix in Studio.
- **Character, UI, Cinematic & Audio Studios**: Customize the playable 3rd-person character rig, design custom in-game HUD overlays, sequence camera keyframes, and audition procedural Web Audio SFX.
- **Project Management & Persistence**: Create, open, rename, duplicate, delete, autosave to browser **IndexedDB** (with LocalStorage fallback), and export `.worldforge.json` backups.
- **Community, Profile & Hardware Settings**: Interconnected Universes, licensed demo Asset Marketplace prefabs, Creator Profile (tracking active creation time separately from idle time and achievements), and hardware-adaptive graphics presets (`LOW`, `MEDIUM`, `HIGH`, `ULTRA`, `CUSTOM`).

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **3D Engine**: Three.js (`OrbitControls`, `TransformControls`, `RoomEnvironment`)
- **Build Tool**: Vite
- **Persistence**: IndexedDB (`WorldForgeDB`) with LocalStorage fallback
- **Audio**: Procedural Web Audio API synthesizer (zero external audio dependencies)

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm

### Install & Run Locally
```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Available Scripts
- `npm run dev` — Start the Vite development server on port `3000`.
- `npm run build` — Build the production bundle into `dist/`.
- `npm run preview` — Preview the production build locally.
- `npm run lint` — Run TypeScript typechecking (`tsc --noEmit`).

### Run Unit Tests
Pure logic modules (visual logic evaluation, terrain heightmap/stamps, physics, publish validation, and animation math) are tested with Node's built-in test runner via `tsx`:

```bash
npx tsx --test src/editor/logic/logicEngine.test.ts src/editor/terrain/terrainMath.test.ts src/editor/animation/animationMath.test.ts
```

---

## Project Structure

```text
src/
├── App.tsx                     # Root application shell & navigation
├── editor/
│   ├── WorldStudio.tsx         # Main 3D creator workspace
│   ├── animation/              # Keyframe interpolation math & timeline panel
│   ├── assets/                 # Procedural asset catalog & marketplace demo packs
│   ├── character/              # Live 3D character studio rig editor
│   ├── logic/                  # Visual node editor & sandboxed logic interpreter
│   ├── properties/             # Object/terrain/atmosphere inspectors & studio panels
│   ├── terrain/                # Heightmap math, brushes, and terrain stamps
│   └── viewport/               # Three.js viewport renderer & procedural 3D models
├── gameplay/                   # Player physics, playtest HUD, standalone player
├── pages/                      # Discover, My Projects, Community, Profile & Settings
├── services/                   # Hardware detection, validation, procedural Web Audio
├── storage/                    # IndexedDB / LocalStorage persistence layer
├── types/                      # Engine-independent versioned WorldProject schema
└── world-format/               # Playable world templates & seeded demo worlds
```

---

## Performance & Local Scope Notes

- **Low-End Hardware Optimization**: Designed for integrated graphics and 4 GB RAM systems using low-poly procedural composite meshes, on-demand edit rendering, pooled particles, software-WebGL detection, and configurable resolution/object budgets in **Settings**.
- **Local Persistence & Demo Boundaries**: All projects, published worlds, profile progress, and settings are stored locally in your browser's **IndexedDB**. Multiplayer lobbies, invite codes, and collaborator roles run in **Local Demo Mode** (no live remote WebSocket relay or cloud authentication server is required to run the app).
