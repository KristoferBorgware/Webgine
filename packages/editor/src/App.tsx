import { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Chip,
  CssBaseline,
  Paper,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material';
import { EditorHost } from '@webgine/engine';
import type { EngineEvent } from '@webgine/engine';

/**
 * Placeholder editor shell. Its job in Plan 1 is to prove the toolchain end to end:
 * React + MUI render, and the editor drives the engine in-process through the
 * command/event facade (a `ping` command answered by a `pong` event).
 */
export function App() {
  const theme = useMemo(() => createTheme({ palette: { mode: 'dark' } }), []);
  const [engineReply, setEngineReply] = useState<EngineEvent | null>(null);

  useEffect(() => {
    const host = new EditorHost();
    const unsubscribe = host.on((event) => setEngineReply(event));
    host.dispatch({ type: 'ping', nonce: Date.now() });
    return unsubscribe;
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar variant="dense">
            <Typography variant="h6" component="h1">
              Webgine Editor
            </Typography>
          </Toolbar>
        </AppBar>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Paper sx={{ p: 4, textAlign: 'center' }} elevation={2}>
            <Typography variant="body1" gutterBottom>
              Engine ↔ editor command/event seam
            </Typography>
            <Chip
              color={engineReply ? 'success' : 'default'}
              label={
                engineReply
                  ? `engine replied: ${engineReply.type} (nonce ${engineReply.nonce})`
                  : 'waiting for engine…'
              }
            />
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
