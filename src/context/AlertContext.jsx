import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getAlertByLocation, getAlerts } from '../api/alerts';
import { POLL_INTERVAL_MS } from '../utils/constants';

const AlertContext = createContext();

export function AlertContextProvider({ children }) {
  const [alert, setAlert] = useState(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const intervalRef = useRef(null);

  const poll = async (lat, lng) => {
    try {
      if (lat != null && lng != null) {
        const data = await getAlertByLocation(lat, lng);
        setAlert({ active: data.alertIsActive, region: data.detectedRegion });
      } else {
        const data = await getAlerts();
        setAlert({ active: data.activeCount > 2, region: null });
      }
    } catch {
      // ignore
    }
  };

  const startPolling = (lat, lng) => {
    poll(lat, lng);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => poll(lat, lng), POLL_INTERVAL_MS);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setHasLocation(true);
        setUserCoords({ lat, lng });
        startPolling(lat, lng);
      },
      () => startPolling(null, null),
      { timeout: 5000 },
    );
  };

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setHasLocation(true);
          setUserCoords({ lat, lng });
          startPolling(lat, lng);
        },
        () => startPolling(null, null),
        { timeout: 5000 },
      );
    } else {
      startPolling(null, null);
    }
    return () => clearInterval(intervalRef.current);
  }, []);

  return <AlertContext.Provider value={{ alert, hasLocation, userCoords, requestLocation }}>{children}</AlertContext.Provider>;
}

export function useAlert() {
  return useContext(AlertContext);
}
