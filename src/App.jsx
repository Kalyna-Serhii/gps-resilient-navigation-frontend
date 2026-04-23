import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ThemeContextProvider, useThemeMode } from './context/ThemeContext';
import { AlertContextProvider } from './context/AlertContext';
import { buildTheme } from './styles/theme';
import router from './router';

function ThemedApp() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeContextProvider>
      <AlertContextProvider>
        <ThemedApp />
      </AlertContextProvider>
    </ThemeContextProvider>
  );
}

export default App;
