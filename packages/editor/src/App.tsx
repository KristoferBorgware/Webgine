import { useMemo } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material';
import { Workspace } from './Workspace';

/**
 * Editor shell: an app bar over the WebGPU viewport that renders the demo scene through
 * the engine.
 */
export function App() {
  const theme = useMemo(() => createTheme({ palette: { mode: 'dark' } }), []);

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
        <Workspace />
      </Box>
    </ThemeProvider>
  );
}
