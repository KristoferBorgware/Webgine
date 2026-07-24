import { Box, Button, ButtonGroup } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import type { PlayState } from '@webgine/engine';

/** Play / Pause / Stop controls reflecting the engine's play state. */
export function Toolbar({
  playState,
  onPlay,
  onPause,
  onStop,
}: {
  playState: PlayState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
      <ButtonGroup variant="outlined" size="small">
        <Button
          startIcon={<PlayArrowIcon />}
          variant={playState === 'playing' ? 'contained' : 'outlined'}
          onClick={onPlay}
        >
          Play
        </Button>
        <Button
          startIcon={<PauseIcon />}
          variant={playState === 'paused' ? 'contained' : 'outlined'}
          onClick={onPause}
        >
          Pause
        </Button>
        <Button
          startIcon={<StopIcon />}
          variant={playState === 'editing' ? 'contained' : 'outlined'}
          onClick={onStop}
        >
          Stop
        </Button>
      </ButtonGroup>
    </Box>
  );
}
