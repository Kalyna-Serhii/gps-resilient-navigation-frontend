import { useState } from 'react';
import { ThemeContext } from './ThemeContext';

export function ThemeContextProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'dark');

  const toggleMode = () => setMode(prev => {
    const next = prev === 'dark' ? 'light' : 'dark';
    localStorage.setItem('themeMode', next);
    return next;
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
