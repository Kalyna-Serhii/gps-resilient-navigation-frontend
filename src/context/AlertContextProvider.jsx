import { useState, useEffect, useCallback } from 'react';
import { getAlertByLocation, getAlerts } from '../api/alerts';
import { POLL_INTERVAL_MS } from '../utils/constants';
import { AlertContext } from './AlertContext';

export function AlertContextProvider({ children }) {
  const [alert, setAlert] = useState(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [pollCoords, setPollCoords] = useState({ lat: null, lng: null });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setHasLocation(true);
        setUserCoords({ lat, lng });
        setPollCoords({ lat, lng });
      },
      () => {
        void 0;
      },
      { timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setHasLocation(true);
        setUserCoords({ lat, lng });
        setPollCoords({ lat, lng });
      },
      () => {
        void 0;
      },
      { timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return;

    const poll = async () => {
      try {
        if (pollCoords.lat != null && pollCoords.lng != null) {
          const data = await getAlertByLocation(pollCoords.lat, pollCoords.lng);
          setAlert({ active: data.alertIsActive, globalActive: false, region: data.detectedRegion });
        } else {
          const data = await getAlerts();
          setAlert({ active: false, globalActive: data.activeCount > 2, region: null });
        }
      } catch {
        void 0;
      }
    };
    void poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pollCoords]);

  return <AlertContext.Provider value={{ alert, hasLocation, userCoords, requestLocation }}>{children}</AlertContext.Provider>;
}
