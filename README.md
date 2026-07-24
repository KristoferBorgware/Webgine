# Webgine

A WebGPU-based 3D engine for the web, with an editor app and TypeScript scripting.

Webgine is a TypeScript monorepo. The **engine** runs standalone; the **editor**
(React + MUI) is additive tooling layered on top of the engine's public API. Game-object
behaviour is authored in TypeScript scripts that the editor can enumerate and edit.

## Foundational decisions

- **Scripting language:** TypeScript — MonoBehaviour-style component classes with
  decorators for exposing public parameters to the editor inspector; per-file hot reload.
- **Physics:** [Rapier](https://rapier.rs/) (`@dimforge/rapier3d`), wrapped behind an
  engine-owned abstraction so the backend stays swappable.
- **Runtime model:** engine and scripts run in-process on the main thread, in the same
  realm as the editor (no Web Worker / isolation).
- **Engine ↔ editor seam:** the engine owns a command/event facade (`EditorHost`). The
  editor drives the engine through command objects and consumes engine-emitted events —
  no separate "bridge" package; separation is enforced by dependency direction (the
  engine never imports the editor).

## Packages

| Package              | Role                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `@webgine/engine`    | WebGPU renderer, scenegraph, component model, `EditorHost` facade |
| `@webgine/scripting` | TypeScript component runtime, decorator metadata, hot reload      |
| `@webgine/editor`    | React + MUI editor app                                            |

## Toolchain

- **Package manager:** npm workspaces
- **Language:** TypeScript (strict)
- **Bundler / dev server:** Vite (library mode for packages, app mode + HMR for the editor)
- **Tests:** Vitest
- **Lint / format:** ESLint (typescript-eslint) + Prettier

## Getting started

```bash
npm install         # install all workspaces
npm run dev         # start the editor dev server (Vite + HMR)
npm run typecheck   # tsc --noEmit across packages
npm run build       # vite build for every package
npm test            # run Vitest
npm run lint        # ESLint
npm run format      # Prettier --write
```

## Scripting

Game-object behaviour is authored in TypeScript. A script is a component: subclass
`Script` (from `@webgine/scripting`), attach it to a GameObject via `ScriptComponent`, and
it is driven by the scene's update loop. Scripts reach the scenegraph through a curated
interface (`gameObject` / `transform` / `world`) — they can read/write, spawn objects, and
destroy themselves, but never touch raw engine internals. Fields marked `@serialize` become
public parameters the editor enumerates and edits. Sources are compiled in-browser with
esbuild-wasm and **hot-reload** live, preserving parameter values across reloads.

```ts
import { Script, serialize, Vector3 } from '@webgine/scripting';

export class Spinner extends Script {
  @serialize({ min: 0, max: 6 }) speed = 1.5;
  override tick(dt: number): void {
    this.transform.rotate(Vector3.up(), this.speed * dt);
  }
}
```

## Roadmap

1. ✅ Project & monorepo setup
2. ✅ Engine core — WebGPU rendering, scenegraph, component model
3. ✅ Script engine & hot reload
4. ✅ Editor — hierarchy / viewport / inspector panels, selection + picking, play state
5. Physics — Rapier integration
