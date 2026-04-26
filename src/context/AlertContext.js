import { createContext } from 'react';

export const AlertContext = createContext({
  alert: null,
  hasLocation: false,
  userCoords: null,
  requestLocation: () => {},
});
