import { createTheme } from '@mui/material/styles';

export function buildTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#4fc3f7' : '#0288d1',
      },
      secondary: {
        main: '#66bb6a',
      },
      background: {
        default: mode === 'dark' ? '#070c19' : '#f0f4f8',
        paper: mode === 'dark' ? '#131825' : '#ffffff',
      },
    },
    components: {
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
    },
  });
}

export const MAP_TILE_OPTIONS = [
  {
    id: 'light',
    label: 'Світла',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  },
  {
    id: 'dark',
    label: 'Темна',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  },
  {
    id: 'osm',
    label: 'Детальна',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
];
