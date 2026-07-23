import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Chip, Paper, TextField, Typography } from '@mui/material';
import {
  createCube,
  createSceneRenderer,
  OrbitCamera,
  Scene,
  type SceneRendererHandle,
} from '@webgine/engine';
import { ScriptComponent, ScriptRuntime } from '@webgine/scripting';
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import { DEMO_SCRIPT } from './demoScript';

/**
 * The editor workspace: a WebGPU viewport of a scripted cube next to a live script panel.
 * Editing the script recompiles and hot-reloads it, so the cube's behaviour updates without
 * a reload; the panel reads the script's `speed` parameter back from the runtime.
 */
export function Workspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<ScriptRuntime | null>(null);
  const scriptIdRef = useRef<number | null>(null);

  const [source, setSource] = useState(DEMO_SCRIPT);
  const [speed, setSpeed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let handle: SceneRendererHandle | null = null;
    let poll = 0;

    const scene = new Scene();
    const cube = createCube(scene.root, 'cube');
    const camera = scene.root.addChild(new OrbitCamera('camera'));
    camera.active = true;
    camera.distance = 8;
    camera.update({ orbitY: 30 });
    scene.refreshActiveCamera();

    const runtime = new ScriptRuntime({
      wasmURL: esbuildWasmURL,
      log: (message) => console.log(`[script] ${message}`),
    });

    void (async () => {
      try {
        await runtime.initialize();
        runtime.setSources(new Map([['Spinner.ts', DEMO_SCRIPT]]));
        await runtime.reloadNow();

        const component = cube.addComponent(ScriptComponent, runtime, 'Spinner');
        scriptIdRef.current = component.id;
        runtimeRef.current = runtime;

        handle = await createSceneRenderer(canvas, scene, { onDeviceError: setError });
        if (disposed) {
          handle.destroy();
          return;
        }

        poll = window.setInterval(() => {
          const id = scriptIdRef.current;
          if (id === null) return;
          const param = runtime.getParameters(id).find((p) => p.key === 'speed');
          setSpeed(param && typeof param.value === 'number' ? param.value : null);
        }, 400);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      disposed = true;
      if (poll) clearInterval(poll);
      handle?.destroy();
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.setSources(new Map([['Spinner.ts', source]]));
  }, [source]);

  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        {error && (
          <Alert severity="error" sx={{ position: 'absolute', top: 16, left: 16, right: 16 }}>
            {error}
          </Alert>
        )}
      </Box>

      <Paper
        square
        elevation={3}
        sx={{ width: 400, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2">Script — Spinner.ts</Typography>
          <Typography variant="caption" color="text.secondary">
            Edit and save — the cube hot-reloads live.
          </Typography>
        </Box>
        <TextField
          multiline
          value={source}
          onChange={(e) => setSource(e.target.value)}
          variant="outlined"
          slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13 } } }}
          sx={{
            flex: 1,
            m: 2,
            overflow: 'auto',
            '& .MuiInputBase-root': { alignItems: 'flex-start' },
          }}
        />
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Chip size="small" color="primary" label={`speed = ${speed ?? '—'}`} />
        </Box>
      </Paper>
    </Box>
  );
}
