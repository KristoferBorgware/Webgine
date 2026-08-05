import { Alert, Box } from '@mui/material';
import type { RefObject } from 'react';

/**
 * Center panel: the WebGPU viewport. A left click ray-picks into the scene; camera
 * navigation (right-button drag to orbit, wheel to zoom) is owned by the engine's
 * OrbitCameraController, which the Editor attaches to this canvas.
 */
export function ViewportPanel({
  canvasRef,
  onPick,
  error,
}: {
  canvasRef: RefObject<HTMLCanvasElement>;
  onPick: (px: number, py: number, viewportW: number, viewportH: number) => void;
  error: string | null;
}) {
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    onPick(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
  };

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        // touchAction none: the camera controller handles pointer gestures itself, so the
        // browser must not claim them for scrolling/zooming.
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
          userSelect: 'none',
        }}
      />
      {error && (
        <Alert severity="error" sx={{ position: 'absolute', top: 16, left: 16, right: 16 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
