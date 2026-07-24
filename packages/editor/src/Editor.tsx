import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Divider } from '@mui/material';
import {
  createCube,
  createSceneRenderer,
  EditorHost,
  OrbitCamera,
  Scene,
  type InspectorData,
  type PlayState,
  type SceneRendererHandle,
  type TreeNode,
} from '@webgine/engine';
import { ScriptComponent, ScriptRuntime, type ScriptParameter } from '@webgine/scripting';
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import { DEMO_SCRIPT } from './demoScript';
import { Toolbar } from './Toolbar';
import { HierarchyPanel } from './HierarchyPanel';
import { ViewportPanel } from './ViewportPanel';
import { InspectorPanel } from './InspectorPanel';

type Vec3 = [number, number, number];

/**
 * Editor composition root. Builds the scene, script runtime, EditorHost and renderer, and
 * wires the three panels + toolbar to them. The engine's EditorHost answers everything
 * engine-side (hierarchy, selection, picking, transforms, play state); script parameters
 * come from the ScriptRuntime.
 */
export function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<EditorHost | null>(null);
  const runtimeRef = useRef<ScriptRuntime | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playState, setPlayState] = useState<PlayState>('editing');
  const [inspector, setInspector] = useState<InspectorData | null>(null);
  const [scriptParams, setScriptParams] = useState<ScriptParameter[]>([]);
  const [source, setSource] = useState(DEMO_SCRIPT);
  const [error, setError] = useState<string | null>(null);

  selectedIdRef.current = selectedId;

  const scriptIdFor = (data: InspectorData | null): number | null => {
    const script = data?.components.find((c) => c.kind === 'script');
    return script ? (script.scriptId as number) : null;
  };

  const refreshInspector = useCallback(() => {
    const host = hostRef.current;
    const runtime = runtimeRef.current;
    const id = selectedIdRef.current;
    if (!host || id === null) {
      setInspector(null);
      setScriptParams([]);
      return;
    }
    const data = host.getInspector(id);
    setInspector(data);
    const scriptId = scriptIdFor(data);
    setScriptParams(scriptId !== null && runtime ? runtime.getParameters(scriptId) : []);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let handle: SceneRendererHandle | null = null;
    let poll = 0;
    let off = () => {};

    const scene = new Scene();
    const cube = createCube(scene.root, 'cube');
    const camera = scene.root.addChild(new OrbitCamera('camera'));
    camera.active = true;
    camera.distance = 8;
    camera.update({ orbitY: 30 });
    scene.refreshActiveCamera();

    const host = new EditorHost(scene);
    const runtime = new ScriptRuntime({
      wasmURL: esbuildWasmURL,
      log: (message) => console.log(`[script] ${message}`),
    });

    void (async () => {
      try {
        await runtime.initialize();
        runtime.setSources(new Map([['Spinner.ts', DEMO_SCRIPT]]));
        await runtime.reloadNow();
        cube.addComponent(ScriptComponent, runtime, 'Spinner');

        hostRef.current = host;
        runtimeRef.current = runtime;
        setTree(host.getTree());
        setPlayState(host.getPlayState());

        off = host.on((event) => {
          if (event.type === 'selectionChanged') setSelectedId(event.id);
          else if (event.type === 'playStateChanged') setPlayState(event.state);
        });

        handle = await createSceneRenderer(canvas, scene, {
          onUpdate: (dt) => host.update(dt),
          onDeviceError: setError,
        });
        if (disposed) {
          off();
          handle.destroy();
          return;
        }
        poll = window.setInterval(refreshInspector, 150);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      disposed = true;
      if (poll) clearInterval(poll);
      off();
      handle?.destroy();
    };
  }, [refreshInspector]);

  useEffect(() => {
    refreshInspector();
  }, [selectedId, refreshInspector]);

  const setTransform = (setter: (id: string, v: Vec3) => void) => (v: Vec3) => {
    const id = selectedIdRef.current;
    if (id) {
      setter(id, v);
      refreshInspector();
    }
  };

  const onSetParam = (key: string, value: unknown) => {
    const runtime = runtimeRef.current;
    const scriptId = scriptIdFor(inspector);
    if (runtime && scriptId !== null) {
      runtime.setParameter(scriptId, key, value);
      refreshInspector();
    }
  };

  const onSourceChange = (next: string) => {
    setSource(next);
    runtimeRef.current?.setSources(new Map([['Spinner.ts', next]]));
  };

  const host = () => hostRef.current;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Toolbar
        playState={playState}
        onPlay={() => host()?.play()}
        onPause={() => host()?.pause()}
        onStop={() => host()?.stop()}
      />
      <Divider />
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <HierarchyPanel tree={tree} selectedId={selectedId} onSelect={(id) => host()?.select(id)} />
        <Divider orientation="vertical" flexItem />
        <ViewportPanel
          canvasRef={canvasRef}
          error={error}
          onPick={(px, py, w, h) => host()?.pick(px, py, w, h)}
        />
        <Divider orientation="vertical" flexItem />
        <InspectorPanel
          inspector={inspector}
          scriptParams={scriptParams}
          source={source}
          onSetPosition={setTransform((id, v) => host()?.setPosition(id, v))}
          onSetRotation={setTransform((id, v) => host()?.setRotationEuler(id, v))}
          onSetScale={setTransform((id, v) => host()?.setScale(id, v))}
          onSetParam={onSetParam}
          onSourceChange={onSourceChange}
        />
      </Box>
    </Box>
  );
}
