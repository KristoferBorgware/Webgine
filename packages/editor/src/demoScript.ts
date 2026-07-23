// The built-in demo script shown in the editor's script panel. It is authored the way a
// project script is - importing only from '@webgine/scripting' - and is compiled and
// hot-reloaded live by the ScriptRuntime.
export const DEMO_SCRIPT = `import { Script, serialize, Vector3 } from '@webgine/scripting';

export class Spinner extends Script {
  @serialize({ min: 0, max: 6 }) speed = 1.5; // radians per second

  override onLoad(): void {
    console.log(\`Spinner attached to \${this.gameObject.name}\`);
  }

  override tick(dt: number): void {
    this.transform.rotate(Vector3.up(), this.speed * dt);
  }
}
`;
