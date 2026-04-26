import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export function useThemeMode() {
  return useContext(ThemeContext);
}
