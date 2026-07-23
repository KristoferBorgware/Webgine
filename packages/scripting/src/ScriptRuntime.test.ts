import { describe, expect, it } from 'vitest';
import { GameObject, Quaternion, Scene } from '@webgine/engine';
import { ScriptComponent } from './ScriptComponent';
import { ScriptRuntime } from './ScriptRuntime';

// In Node, esbuild-wasm loads its own wasm; no wasmURL/wasmModule is passed (those are
// browser-only). The editor supplies wasmURL in the browser.
async function makeRuntime(): Promise<ScriptRuntime> {
  const runtime = new ScriptRuntime({ worker: false, debounceMs: 0, log: () => {} });
  await runtime.initialize();
  return runtime;
}

const SPINNER = (speed: number) => `
import { Script, serialize, Vector3 } from '@webgine/scripting';
export class Spinner extends Script {
  @serialize({ min: 0, max: 20 }) speed = ${speed};
  tick(dt) { this.transform.rotate(Vector3.up(), this.speed * dt); }
}`;

describe('ScriptRuntime', () => {
  it('compiles a script and ticks it through the scene', async () => {
    const runtime = await makeRuntime();
    runtime.setSources(new Map([['Spinner.ts', SPINNER(2)]]));
    await runtime.reloadNow();

    const scene = new Scene();
    const cube = scene.root.addChild(new GameObject('cube'));
    cube.addComponent(ScriptComponent, runtime, 'Spinner');

    scene.update(0.5); // 2 rad/s * 0.5 s = 1 rad about +Y
    expect(cube.transform.rotation.y).toBeCloseTo(Math.sin(0.5), 5);
  });

  it('adopts a new code default on hot reload, keeping the registration', async () => {
    const runtime = await makeRuntime();
    runtime.setSources(new Map([['Spinner.ts', SPINNER(2)]]));
    await runtime.reloadNow();

    const scene = new Scene();
    const cube = scene.root.addChild(new GameObject('cube'));
    const component = cube.addComponent(ScriptComponent, runtime, 'Spinner');
    const id = component.id;

    runtime.setSources(new Map([['Spinner.ts', SPINNER(4)]]));
    await runtime.reloadNow();

    expect(component.id).toBe(id); // stable across reload
    expect(runtime.getParameters(id).find((p) => p.key === 'speed')?.value).toBe(4);

    cube.transform.rotation = Quaternion.identity();
    scene.update(0.5); // now 4 rad/s * 0.5 s = 2 rad
    expect(cube.transform.rotation.y).toBeCloseTo(Math.sin(1.0), 5);
  });

  it('persists an explicitly set parameter across reload', async () => {
    const runtime = await makeRuntime();
    runtime.setSources(new Map([['Spinner.ts', SPINNER(2)]]));
    await runtime.reloadNow();

    const scene = new Scene();
    const cube = scene.root.addChild(new GameObject('cube'));
    const component = cube.addComponent(ScriptComponent, runtime, 'Spinner');

    runtime.setParameter(component.id, 'speed', 10);
    runtime.setSources(new Map([['Spinner.ts', SPINNER(2)]])); // code default is still 2
    await runtime.reloadNow();

    expect(runtime.getParameters(component.id).find((p) => p.key === 'speed')?.value).toBe(10);
  });

  it('keeps the previous module when a reload fails to compile', async () => {
    const runtime = await makeRuntime();
    runtime.setSources(new Map([['Spinner.ts', SPINNER(3)]]));
    await runtime.reloadNow();

    const scene = new Scene();
    const cube = scene.root.addChild(new GameObject('cube'));
    cube.addComponent(ScriptComponent, runtime, 'Spinner');

    runtime.setSources(new Map([['Spinner.ts', 'export class Spinner extends { {{ not valid']]));
    await runtime.reloadNow();

    // The last good module is still live and ticking.
    cube.transform.rotation = Quaternion.identity();
    scene.update(0.5);
    expect(cube.transform.rotation.y).toBeCloseTo(Math.sin(0.75), 5);
  });

  it('lets a script spawn objects and destroy itself through the curated API', async () => {
    const runtime = await makeRuntime();
    runtime.setSources(
      new Map([
        [
          'scripts.ts',
          `
import { Script } from '@webgine/scripting';
export class Spawner extends Script {
  onLoad() { this.world.spawnCube('spawned'); }
}
export class Kamikaze extends Script {
  tick() { this.gameObject.destroy(); }
}`,
        ],
      ]),
    );
    await runtime.reloadNow();

    const scene = new Scene();
    const spawner = scene.root.addChild(new GameObject('spawner'));
    spawner.addComponent(ScriptComponent, runtime, 'Spawner');
    expect(scene.root.findByName('spawned')).not.toBeNull();

    const victim = scene.root.addChild(new GameObject('victim'));
    victim.addComponent(ScriptComponent, runtime, 'Kamikaze');
    scene.update(0.016);
    expect(scene.root.findByName('victim')).toBeNull();
  });
});
