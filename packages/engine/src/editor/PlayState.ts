// PlayState - the engine's edit/play mode. `playing` runs the simulation (scene updates);
// `editing` and `paused` suspend it while the scene stays renderable and editable. A
// standalone (non-editor) runtime simply stays in `playing`.
export type PlayState = 'editing' | 'playing' | 'paused';
