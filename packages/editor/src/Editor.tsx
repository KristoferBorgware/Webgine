import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Divider } from '@mui/material';
import {
  createSceneRenderer,
  EditorHost,
  OrbitCamera,
  OrbitCameraController,
  PhysicsWorld,
  Scene,
  SceneSerializer,
  Vector3,
  type InspectorData,
  type PlayState,
  type SceneRendererHandle,
  type TreeNode,
} from '@webgine/engine';
import { ScriptComponent, ScriptRuntime, type ScriptParameter } from '@webgine/scripting';
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import sceneYaml from '../scenes/demo.yaml?raw';
import { DEMO_SCRIPT } from './demoScript';
import { Toolbar } from './Toolbar';
import { HierarchyPanel } from './HierarchyPanel';
import { ViewportPanel } from './ViewportPanel';
import { InspectorPanel } from './InspectorPanel';

type Vec3 = [number, number, number];

const DEG2RAD = Math.PI / 180;

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
    const camera = scene.root.addChild(new OrbitCamera('camera'));
    camera.active = true;
    camera.focus = new Vector3(0, 0, 0);
    camera.distance = 22;
    camera.setOrbit(0, 20 * DEG2RAD);
    scene.refreshActiveCamera();

    // Right-button drag orbits the camera about its focal point; the wheel zooms.
    const cameraController = new OrbitCameraController(canvas, camera);

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

        // Load the scene from the authored YAML: the engine builds mesh/rigid-body
        // components; the editor supplies the ScriptComponent factory over the runtime.
        const world = await PhysicsWorld.create();
        scene.physics = world;
        SceneSerializer.instantiate(SceneSerializer.parse(sceneYaml), scene.root, {
          physics: world,
          factories: {
            ScriptComponent: (obj, desc) =>
              obj.addComponent(
                ScriptComponent,
                runtime,
                String(desc.typeName),
                (desc.parameters as Record<string, unknown>) ?? {},
              ),
          },
        });

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
      cameraController.dispose();
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
