// ScriptRuntime - the scripting host. It compiles the project's in-memory script sources
// with esbuild-wasm, loads the result as an ES module, and manages script registrations
// keyed by a stable id. On a source change it recompiles, tears down the old instances,
// and re-creates each registration under its existing id (persisting parameter values) -
// so ScriptComponents never see the swap. Compile errors keep the previous module running;
// a script whose tick throws is muted until the next successful reload.

import * as esbuild from 'esbuild-wasm';
import { GameObject, Quaternion, Vector3, type Node } from '@webgine/engine';
import { Script, type ScriptBinding } from './Script';
import type { ScriptContext } from './handles';
import {
  applyParameters,
  getScriptParameters,
  readParameters,
  serialize,
  type ParamMeta,
} from './parameters';

type ScriptClass = new () => Script;

interface Registration {
  id: number;
  typeName: string;
  gameObject: GameObject;
  instance: Script | null;
  parameters: Record<string, unknown>;
  faulted: boolean;
}

/** A parameter's schema plus its current live value. */
export interface ScriptParameter extends ParamMeta {
  value: unknown;
}

export interface ScriptRuntimeOptions {
  /** URL of the esbuild wasm binary (browser). */
  wasmURL?: string;
  /** Pre-compiled wasm module (Node/tests). */
  wasmModule?: WebAssembly.Module;
  /** Whether esbuild runs in a worker (default true in the browser, false in Node). */
  worker?: boolean;
  /** Debounce for hot reload after a source change, in ms (default 250). */
  debounceMs?: number;
  /** Log sink; defaults to console.log with a [script] prefix. */
  log?: (message: string) => void;
}

// The SDK surface exposed to compiled scripts. Scripts import these from
// '@webgine/scripting'; the compiler rewrites that import to read from a global set here.
const SDK: Record<string, unknown> = { Script, serialize, Vector3, Quaternion };
const SDK_GLOBAL = '__WEBGINE_SDK__';

let initPromise: Promise<void> | null = null;

export class ScriptRuntime {
  private readonly registrations = new Map<number, Registration>();
  private readonly classes = new Map<string, ScriptClass>();
  private sources = new Map<string, string>();
  private nextId = 1;

  private readonly debounceMs: number;
  private readonly log: (message: string) => void;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;
  private reloading = false;
  private reloadQueued = false;

  constructor(private readonly options: ScriptRuntimeOptions = {}) {
    this.debounceMs = options.debounceMs ?? 250;
    this.log = options.log ?? ((m) => console.log(`[script] ${m}`));
  }

  /** Initializes esbuild-wasm once for the process. */
  async initialize(): Promise<void> {
    if (!initPromise) {
      const init: Parameters<typeof esbuild.initialize>[0] = {};
      if (this.options.wasmURL) init.wasmURL = this.options.wasmURL;
      if (this.options.wasmModule) init.wasmModule = this.options.wasmModule;
      if (this.options.worker !== undefined) init.worker = this.options.worker;
      initPromise = esbuild.initialize(init).catch((error: unknown) => {
        // esbuild-wasm can only be initialized once per page; tolerate a repeat init
        // (e.g. across a dev-server hot reload) rather than failing the runtime.
        if (String(error).includes('more than once')) return;
        throw error;
      });
    }
    await initPromise;
  }

  /** Replaces the project sources and schedules a debounced hot reload. */
  setSources(sources: Map<string, string>): void {
    this.sources = new Map(sources);
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = null;
      void this.reload();
    }, this.debounceMs);
  }

  /** Compiles the current sources immediately (used at setup). */
  async reloadNow(): Promise<void> {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }
    await this.reload();
  }

  /** Registers a script and returns its stable id, instantiating it if a module is loaded. */
  register(
    typeName: string,
    gameObject: GameObject,
    parameters: Readonly<Record<string, unknown>>,
  ): number {
    const registration: Registration = {
      id: this.nextId++,
      typeName,
      gameObject,
      instance: null,
      parameters: { ...parameters },
      faulted: false,
    };
    this.registrations.set(registration.id, registration);
    this.instantiate(registration);
    return registration.id;
  }

  /** Advances a script by dt. Null/faulted instances are skipped. */
  tick(id: number, dtSeconds: number): void {
    const registration = this.registrations.get(id);
    if (!registration || !registration.instance || registration.faulted) return;
    try {
      registration.instance.tick(dtSeconds);
    } catch (error) {
      registration.faulted = true; // muted until the next reload
      this.log(`${registration.typeName}.tick threw (muted until reload): ${errorText(error)}`);
    }
  }

  /** Tears down and removes a registration. */
  destroy(id: number): void {
    const registration = this.registrations.get(id);
    if (!registration) return;
    this.registrations.delete(id);
    this.callOnDestroy(registration);
  }

  /** The parameter schema plus current values for a registration (drives the inspector). */
  getParameters(id: number): ScriptParameter[] {
    const registration = this.registrations.get(id);
    if (!registration || !registration.instance) return [];
    const values = readParameters(registration.instance);
    return getScriptParameters(registration.instance.constructor as ScriptClass).map((meta) => ({
      ...meta,
      value: values[meta.key] ?? registration.parameters[meta.key] ?? meta.default,
    }));
  }

  /** Sets one parameter on a live script and persists it across reloads. */
  setParameter(id: number, key: string, value: unknown): void {
    const registration = this.registrations.get(id);
    if (!registration) return;
    registration.parameters[key] = value;
    if (registration.instance) applyParameters(registration.instance, { [key]: value });
  }

  // ---- compilation & (re)loading ----

  private async reload(): Promise<void> {
    if (this.reloading) {
      this.reloadQueued = true;
      return;
    }
    this.reloading = true;
    try {
      await this.compileAndSwap();
    } finally {
      this.reloading = false;
      if (this.reloadQueued) {
        this.reloadQueued = false;
        await this.reload();
      }
    }
  }

  private async compileAndSwap(): Promise<void> {
    let code: string;
    try {
      code = await this.compile();
    } catch (error) {
      this.log(`compile error: ${errorText(error)}`); // keep the previous module running
      return;
    }

    // Tear down the old instances. Explicitly-set parameter overrides are kept in
    // registration.parameters and re-applied below; unset fields adopt the new code
    // defaults, so editing a default in source takes effect on reload.
    for (const registration of this.registrations.values()) {
      if (registration.instance) {
        this.callOnDestroy(registration);
        registration.instance = null;
      }
      registration.faulted = false;
    }

    (globalThis as Record<string, unknown>)[SDK_GLOBAL] = SDK;
    const module = evaluateModule(code);

    this.classes.clear();
    for (const [name, value] of Object.entries(module)) {
      if (typeof value === 'function' && value.prototype instanceof Script) {
        const cls = value as ScriptClass;
        this.classes.set(name, cls);
        this.classes.set(cls.name, cls);
      }
    }

    let live = 0;
    for (const registration of this.registrations.values()) {
      this.instantiate(registration);
      if (registration.instance) live++;
    }
    this.log(`reload complete (${live}/${this.registrations.size} script(s) live).`);
  }

  private async compile(): Promise<string> {
    const result = await esbuild.build({
      entryPoints: ['webgine-entry'],
      bundle: true,
      format: 'cjs',
      write: false,
      logLevel: 'silent',
      tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
      plugins: [this.virtualPlugin()],
    });
    const output = result.outputFiles?.[0];
    if (!output) throw new Error('no output produced');
    return output.text;
  }

  private virtualPlugin(): esbuild.Plugin {
    const sources = this.sources;
    return {
      name: 'webgine-scripts',
      setup(build) {
        build.onResolve({ filter: /^webgine-entry$/ }, () => ({
          path: 'webgine-entry',
          namespace: 'entry',
        }));
        build.onLoad({ filter: /.*/, namespace: 'entry' }, () => ({
          contents: [...sources.keys()]
            .map((path) => `export * from ${JSON.stringify('webgine-user:' + path)};`)
            .join('\n'),
          loader: 'ts',
        }));

        build.onResolve({ filter: /^webgine-user:/ }, (args) => ({
          path: args.path.slice('webgine-user:'.length),
          namespace: 'user',
        }));
        build.onLoad({ filter: /.*/, namespace: 'user' }, (args) => ({
          contents: sources.get(args.path) ?? '',
          loader: 'ts',
        }));

        build.onResolve({ filter: /^@webgine\/scripting$/ }, () => ({
          path: 'sdk',
          namespace: 'sdk',
        }));
        build.onLoad({ filter: /.*/, namespace: 'sdk' }, () => ({
          contents: sdkShim(),
          loader: 'js',
        }));
      },
    };
  }

  // ---- registration lifecycle ----

  private instantiate(registration: Registration): void {
    const cls = this.resolveClass(registration.typeName);
    if (!cls) return; // pending until a module provides the type

    try {
      const instance = new cls();
      const binding: ScriptBinding = {
        gameObject: registration.gameObject,
        context: this.contextFor(registration.gameObject),
      };
      instance.bind(binding);
      applyParameters(instance, registration.parameters);
      registration.instance = instance;
      registration.faulted = false;
      try {
        instance.onLoad();
      } catch (error) {
        this.log(`${registration.typeName}.onLoad threw: ${errorText(error)}`);
      }
    } catch (error) {
      this.log(`failed to construct '${registration.typeName}': ${errorText(error)}`);
    }
  }

  private callOnDestroy(registration: Registration): void {
    if (!registration.instance) return;
    try {
      registration.instance.onDestroy();
    } catch (error) {
      this.log(`${registration.typeName}.onDestroy threw: ${errorText(error)}`);
    }
  }

  private resolveClass(typeName: string): ScriptClass | undefined {
    const direct = this.classes.get(typeName);
    if (direct) return direct;
    const shortName = typeName.includes('.')
      ? typeName.slice(typeName.lastIndexOf('.') + 1)
      : typeName;
    return this.classes.get(shortName);
  }

  private contextFor(gameObject: GameObject): ScriptContext {
    let root: Node = gameObject;
    while (root.parent) root = root.parent;
    return {
      root,
      destroy(object: GameObject): void {
        object.dispose();
        object.parent?.removeChild(object);
      },
    };
  }
}

function sdkShim(): string {
  const names = Object.keys(SDK);
  const lines = names.map((name) => `export const ${name} = m[${JSON.stringify(name)}];`);
  return `const m = globalThis[${JSON.stringify(SDK_GLOBAL)}];\n${lines.join('\n')}\n`;
}

// Evaluates a self-contained CommonJS bundle and returns its exports. The bundle pulls the
// SDK from a global (set before this runs) and makes no external requires, so it needs no
// module loader - which keeps it identical across the browser, Node and the test runner.
function evaluateModule(code: string): Record<string, unknown> {
  const module = { exports: {} as Record<string, unknown> };
  const requireShim = (name: string): never => {
    throw new Error(`scripts cannot require('${name}')`);
  };
  const factory = new Function('module', 'exports', 'require', code);
  factory(module, module.exports, requireShim);
  return module.exports;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
