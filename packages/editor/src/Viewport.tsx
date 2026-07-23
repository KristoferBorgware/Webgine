import { useEffect, useRef, useState } from 'react';
import { Alert, Box } from '@mui/material';
import {
  createSceneRenderer,
  OrbitCamera,
  Scene,
  SceneSerializer,
  type SceneRendererHandle,
} from '@webgine/engine';

/**
 * WebGPU viewport. Instantiates the demo scene, adds an orbit camera, and renders it
 * through the engine's SceneRenderer. The camera slowly orbits so the scene reads as live.
 */
export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let handle: SceneRendererHandle | null = null;
    let raf = 0;
    let disposed = false;

    const scene = new Scene();
    SceneSerializer.instantiate(SceneSerializer.buildDemoScene(), scene.root);

    const camera = scene.root.addChild(new OrbitCamera('editor-camera'));
    camera.active = true;
    camera.distance = 12;
    camera.update({ orbitY: 35 }); // tilt the view down a little
    scene.refreshActiveCamera();

    createSceneRenderer(canvas, scene, { onDeviceError: setError })
      .then((h) => {
        if (disposed) {
          h.destroy();
          return;
        }
        handle = h;
        const spin = () => {
          camera.update({ orbitX: 0.6 });
          raf = requestAnimationFrame(spin);
        };
        raf = requestAnimationFrame(spin);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      handle?.destroy();
    };
  }, []);

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {error && (
        <Alert severity="error" sx={{ position: 'absolute', top: 16, left: 16, right: 16 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
