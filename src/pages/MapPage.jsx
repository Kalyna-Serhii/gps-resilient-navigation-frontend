import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap, Tooltip as LeafletTooltip } from 'react-leaflet';
import {
  Box,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  SwipeableDrawer,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import DirectionsIcon from '@mui/icons-material/Directions';
import HistoryIcon from '@mui/icons-material/History';
import RouteIcon from '@mui/icons-material/Route';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import TuneIcon from '@mui/icons-material/Tune';
import DeleteIcon from '@mui/icons-material/Delete';
import GpsOffIcon from '@mui/icons-material/GpsOff';
import CheckIcon from '@mui/icons-material/Check';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { createRoute, getSavedRoutes, getRouteById, deleteRoute } from '../api/routes';
import { getRoutePois } from '../api/pois';
import { describeStep } from '../utils/maneuver';
import { formatPoiHint, AMENITY_COLORS } from '../utils/pois';
import { MAP_TILE_OPTIONS } from '../styles/theme';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { useAlert } from '../hooks/useAlert';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ROUTE_COLORS = ['#4fc3f7', '#ffa726', '#66bb6a'];

const u = txt => <span style={{ fontSize: 10 }}>{txt}</span>;

function RouteLabel({ distance, duration }) {
  const km = distance < 10000 ? (distance / 1000).toFixed(1) : Math.round(distance / 1000);
  const m = Math.round(distance);
  const mins = Math.round(duration / 60);
  const h = Math.floor(mins / 60);
  const min = mins % 60;
  return (
    <span style={{ fontSize: 13, letterSpacing: 0 }}>
      {distance < 1000 ? (
        <>
          {m}
          {u(' м')}
        </>
      ) : (
        <>
          {km}
          {u(' км')}
        </>
      )}
      {' — '}
      {h > 0 ? (
        <>
          {h}
          {u(' г')} {min}
          {u(' хв')}
        </>
      ) : (
        <>
          {mins}
          {u(' хв')}
        </>
      )}
    </span>
  );
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

function PlaceDropdown({ results, searched, onSelect }) {
  if (!searched) return null;

  return (
    <Paper sx={{ position: 'absolute', zIndex: 1000, width: '100%', maxHeight: 200, overflowY: 'auto' }}>
      {results.length === 0 ? (
        <Typography variant="body2" sx={{ p: 1.5, color: 'text.secondary' }}>
          Нічого не знайдено
        </Typography>
      ) : (
        <List dense>
          {results.map((r, i) => (
            <ListItemButton key={i} onClick={() => onSelect(r)}>
              <ListItemText primary={r.displayName} />
            </ListItemButton>
          ))}
        </List>
      )}
    </Paper>
  );
}

function MapPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { alert } = useAlert();
  const alertMode = alert?.active === true;

  const [tileId, setTileId] = useState('light');
  const [prevAlertMode, setPrevAlertMode] = useState(alertMode);
  const [preAlertTile, setPreAlertTile] = useState(null);
  if (prevAlertMode !== alertMode) {
    setPrevAlertMode(alertMode);
    if (alertMode) {
      setPreAlertTile(tileId);
      setTileId('osm');
    } else if (preAlertTile !== null) {
      setTileId(preAlertTile);
      setPreAlertTile(null);
    }
  }
  const tileUrl = MAP_TILE_OPTIONS.find(t => t.id === tileId)?.url;

  const origin$ = usePlaceSearch();
  const dest$ = usePlaceSearch();
  const { select: selectOrigin } = origin$;
  const { select: selectDest } = dest$;
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [steps, setSteps] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [currentRouteId, setCurrentRouteId] = useState(null);
  const [poisByStep, setPoisByStep] = useState({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [routeStarted, setRouteStarted] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState('history');
  const [userLocation, setUserLocation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [poisLoading, setPoisLoading] = useState(false);
  const mapRef = useRef(null);
  const hydratedRef = useRef(false);
  const navStateRef = useRef({});
  useEffect(() => {
    navStateRef.current = { alertMode, routeStarted, steps, currentStepIndex, destination, bounds };
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    const ARRIVE_THRESHOLD_M = 30;
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);

        const nav = navStateRef.current;
        if (nav.alertMode || !nav.routeStarted || !nav.steps?.length) return;

        const userLL = L.latLng(loc.lat, loc.lng);
        const nextStep = nav.steps[nav.currentStepIndex + 1];
        if (nextStep) {
          const [lng, lat] = nextStep.maneuver.location;
          if (userLL.distanceTo([lat, lng]) < ARRIVE_THRESHOLD_M) {
            setCurrentStepIndex(nav.currentStepIndex + 1);
          }
        } else if (nav.destination) {
          if (userLL.distanceTo([nav.destination.lat, nav.destination.lng]) < ARRIVE_THRESHOLD_M) {
            setRouteStarted(false);
            setCurrentStepIndex(0);
            if (nav.bounds) mapRef.current?.fitBounds(nav.bounds, { padding: [50, 50] });
          }
        }
      },
      null,
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSavedRoutes();
        setHistory(data ?? []);
      } catch {
        void 0;
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem('currentRouteId');
    if (!savedId) {
      hydratedRef.current = true;
      return;
    }
    const savedIdx = parseInt(localStorage.getItem('currentRouteIndex') || '0', 10);
    const savedStep = parseInt(localStorage.getItem('currentStepIndex') || '0', 10);
    const savedStarted = localStorage.getItem('routeStarted') === '1';

    getRouteById(savedId)
      .then(full => {
        const idx = Math.min(savedIdx, (full.routes?.length || 1) - 1);
        const routeVariant = full.routes?.[idx];
        if (!routeVariant) return;
        setOrigin(full.origin);
        setDestination(full.destination);
        setRoutes(full.routes);
        setSelectedRoute(idx);
        setCurrentRouteId(full._id);
        setSteps(routeVariant.steps || []);
        setCurrentStepIndex(Math.min(Math.max(savedStep, 0), Math.max((routeVariant.steps?.length || 1) - 1, 0)));
        setRouteStarted(savedStarted);
        selectOrigin(full.name.split(' → ')[0]);
        selectDest(full.name.split(' → ')[1] || '');
        const coords = routeVariant.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setBounds(L.latLngBounds(coords));
        setPanel('route');
      })
      .catch(() => {
        localStorage.removeItem('currentRouteId');
        localStorage.removeItem('currentRouteIndex');
        localStorage.removeItem('currentStepIndex');
        localStorage.removeItem('routeStarted');
      })
      .finally(() => {
        hydratedRef.current = true;
      });
  }, [selectOrigin, selectDest]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (currentRouteId) localStorage.setItem('currentRouteId', currentRouteId);
    else localStorage.removeItem('currentRouteId');
  }, [currentRouteId]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem('currentRouteIndex', String(selectedRoute));
  }, [selectedRoute]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem('currentStepIndex', String(currentStepIndex));
  }, [currentStepIndex]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem('routeStarted', routeStarted ? '1' : '0');
  }, [routeStarted]);

  useEffect(() => {
    if (!alertMode || !currentRouteId) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setPoisLoading(true);
    });
    getRoutePois(currentRouteId, selectedRoute)
      .then(data => {
        if (cancelled) return;
        const map = {};
        data.pois.forEach(p => {
          if (p.nearbyPois?.length) map[p.landmarkIndex] = p.nearbyPois;
        });
        setPoisByStep(map);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPoisLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [alertMode, currentRouteId, selectedRoute]);

  const [pendingGpsAction, setPendingGpsAction] = useState(null);

  const withGpsConfirm = action => {
    if (alertMode) {
      setPendingGpsAction(() => action);
    } else {
      action();
    }
  };

  const confirmGps = () => {
    pendingGpsAction?.();
    setPendingGpsAction(null);
  };

  const selectPlace = (place, setPoint, search$) => {
    setPoint({ lat: place.lat, lng: place.lng });
    search$.select(place.displayName);
  };

  const requestGeolocation = () => {
    navigator.geolocation.getCurrentPosition(pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), null, { enableHighAccuracy: true });
  };

  const applyMyLocation = (setPoint, search$) => {
    if (!userLocation) {
      requestGeolocation();
      return;
    }
    setPoint(userLocation);
    search$.select('Моє місцезнаходження');
  };

  const handleCreateRoute = async () => {
    if (!origin || !destination) return;
    setError('');
    setLoading(true);
    setRoutes([]);
    setSteps([]);
    setPoisByStep({});
    setCurrentStepIndex(0);
    setRouteStarted(false);
    try {
      const shortName = q => {
        if (!q) return '';
        const parts = q
          .split(',')
          .map(p => p.trim())
          .filter(Boolean);
        const isNumber = s => /^\d+/.test(s);
        const meaningful = parts.find(p => !isNumber(p));
        return meaningful || parts[0];
      };
      const name = `${shortName(origin$.query)} → ${shortName(dest$.query)}`;
      const data = await createRoute({ name, origin, destination });
      setRoutes(data.routes);
      setCurrentRouteId(data._id);
      setHistory(prev => [data, ...prev.filter(r => r._id !== data._id)]);
      if (data.routes.length > 0) {
        setSelectedRoute(0);
        setSteps(data.routes[0].steps || []);
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setBounds(L.latLngBounds(coords));
        setPanel('route');
        if (isMobile) setDrawerOpen(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteRoute(id);
      setHistory(prev => prev.filter(r => r._id !== id));
    } catch {
      void 0;
    }
  };

  const loadFromHistory = async saved => {
    setError('');
    setLoading(true);
    setPoisByStep({});
    setCurrentStepIndex(0);
    setRouteStarted(false);
    try {
      const full = await getRouteById(saved._id);
      setOrigin(full.origin);
      setDestination(full.destination);
      setRoutes(full.routes);
      setSelectedRoute(0);
      setCurrentRouteId(full._id);
      setSteps(full.routes[0]?.steps || []);
      origin$.select(full.name.split(' → ')[0]);
      dest$.select(full.name.split(' → ')[1] || '');
      const coords = full.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      setBounds(L.latLngBounds(coords));
      setPanel('route');
      if (isMobile) setDrawerOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const advanceStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) {
      setRouteStarted(false);
      setCurrentStepIndex(0);
      if (bounds) mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
      if (isMobile) setDrawerOpen(false);
      return;
    }
    setCurrentStepIndex(nextIndex);
    const [lng, lat] = steps[nextIndex].maneuver.location;
    mapRef.current?.flyTo([lat, lng], 16, { duration: 0.8 });
    if (isMobile) setDrawerOpen(false);
  };

  const handleSelectRoute = index => {
    setSelectedRoute(index);
    setSteps(routes[index].steps || []);
    setPoisByStep({});
    setCurrentStepIndex(0);
    setRouteStarted(false);
    const coords = routes[index].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    setBounds(L.latLngBounds(coords));
    if (isMobile) setDrawerOpen(false);
  };

  const formatDuration = seconds => {
    const mins = Math.max(1, Math.round(seconds / 60));
    if (mins < 60) return `${mins} хв`;
    return `${Math.floor(mins / 60)} г ${mins % 60} хв`;
  };

  const formatDistance = meters => {
    if (meters < 1000) return `${Math.round(meters)} м`;
    if (meters < 10000) return `${(meters / 1000).toFixed(1)} км`;
    return `${Math.round(meters / 1000)} км`;
  };

  const poiMarkers = alertMode ? Object.values(poisByStep).flat().filter(p => p.lat && p.lng) : [];

  const sidebarContent = (
    <>
      <ToggleButtonGroup
        value={tileId}
        exclusive
        onChange={(_, val) => {
          if (!val) return;
          setPreAlertTile(null);
          setTileId(val);
        }}
        size="small"
        fullWidth
      >
        {MAP_TILE_OPTIONS.map(t => (
          <ToggleButton key={t.id} value={t.id} sx={{ flex: 1, fontSize: 11 }}>
            {t.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {alertMode && (
        <Alert severity="warning" icon={<GpsOffIcon fontSize="small" />} sx={{ py: 0.5, fontSize: 12 }}>
          Тривога — GPS вимкнено. Орієнтуйтесь по карті та орієнтирах
        </Alert>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ position: 'relative' }}>
        <TextField
          label="Звідки"
          size="small"
          fullWidth
          value={origin$.query}
          onChange={e => {
            origin$.setQuery(e.target.value);
            setOrigin(null);
          }}
          slotProps={{
            input: {
              endAdornment: (
                <Tooltip title={userLocation ? 'Моє місцезнаходження' : 'Надайте доступ до геолокації'}>
                  <IconButton size="small" onClick={() => withGpsConfirm(() => applyMyLocation(setOrigin, origin$))} sx={{ cursor: 'pointer' }}>
                    <MyLocationIcon fontSize="small" color={userLocation ? 'primary' : 'disabled'} />
                  </IconButton>
                </Tooltip>
              ),
            },
          }}
        />
        <PlaceDropdown results={origin$.results} searched={origin$.searched} onSelect={place => selectPlace(place, setOrigin, origin$)} />
      </Box>

      <Box sx={{ position: 'relative' }}>
        <TextField
          label="Куди"
          size="small"
          fullWidth
          value={dest$.query}
          onChange={e => {
            dest$.setQuery(e.target.value);
            setDestination(null);
          }}
          slotProps={{
            input: {
              endAdornment: (
                <Tooltip title={userLocation ? 'Моє місцезнаходження' : 'Надайте доступ до геолокації'}>
                  <IconButton size="small" onClick={() => withGpsConfirm(() => applyMyLocation(setDestination, dest$))} sx={{ cursor: 'pointer' }}>
                    <MyLocationIcon fontSize="small" color={userLocation ? 'primary' : 'disabled'} />
                  </IconButton>
                </Tooltip>
              ),
            },
          }}
        />
        <PlaceDropdown results={dest$.results} searched={dest$.searched} onSelect={place => selectPlace(place, setDestination, dest$)} />
      </Box>

      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={20} /> : <DirectionsIcon />}
        onClick={handleCreateRoute}
        disabled={!origin || !destination || loading}
      >
        Побудувати маршрут
      </Button>

      {routes.length > 0 && steps.length > 0 && !routeStarted && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<DirectionsIcon />}
          onClick={() => {
            setRouteStarted(true);
            setCurrentStepIndex(0);
            const [lng, lat] = steps[0].maneuver.location;
            mapRef.current?.flyTo([lat, lng], 16, { duration: 0.8 });
            if (isMobile) setDrawerOpen(false);
          }}
        >
          Почати маршрут
        </Button>
      )}

      {routes.length > 0 && routeStarted && (
        <Button
          variant="outlined"
          color="success"
          startIcon={<CheckIcon />}
          onClick={() => {
            setRouteStarted(false);
            setCurrentStepIndex(0);
            if (bounds) mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
            if (isMobile) setDrawerOpen(false);
          }}
        >
          Завершити маршрут
        </Button>
      )}

      <Tabs value={panel} onChange={(_, v) => setPanel(v)} variant="fullWidth" sx={{ mt: 1, minHeight: 36 }}>
        <Tab icon={<RouteIcon fontSize="small" />} iconPosition="start" label="Маршрут" value="route" disabled={routes.length === 0} sx={{ minHeight: 36, fontSize: 12 }} />
        <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="Історія" value="history" sx={{ minHeight: 36, fontSize: 12 }} />
      </Tabs>

      {panel === 'route' && (
        <Box sx={{ 'flex': 1, 'overflowY': 'auto', 'minHeight': 0, 'scrollbarWidth': 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {routes.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {routes.length > 1 && (
                <Typography variant="subtitle2" gutterBottom>
                  Альтернативи
                </Typography>
              )}
              {routes.map((route, i) => (
                <Button
                  key={i}
                  size="small"
                  variant={selectedRoute === i ? 'contained' : 'outlined'}
                  onClick={() => handleSelectRoute(i)}
                  sx={{
                    'mr': 1,
                    'mb': 1,
                    'borderColor': ROUTE_COLORS[i],
                    'color': selectedRoute === i ? '#fff' : ROUTE_COLORS[i],
                    'backgroundColor': selectedRoute === i ? ROUTE_COLORS[i] : 'transparent',
                    '&:hover': { backgroundColor: ROUTE_COLORS[i], color: '#fff' },
                  }}
                >
                  <RouteLabel distance={route.distance} duration={route.duration} />
                </Button>
              ))}
            </Box>
          )}
          {steps.length > 0 && (
            <List dense>
              {steps.map((step, i) => {
                const stepPois = alertMode ? poisByStep[i] : null;
                const poi = stepPois?.[0] ?? null;
                const isCurrent = routeStarted && i === currentStepIndex;
                const isLast = i === steps.length - 1;
                return (
                  <ListItem
                    key={i}
                    disablePadding
                    sx={{
                      display: 'flex',
                      alignItems: 'stretch',
                      bgcolor: isCurrent ? 'action.selected' : undefined,
                      borderRadius: 1,
                    }}
                  >
                    <ListItemButton
                      dense
                      onClick={() => {
                        const [lng, lat] = step.maneuver.location;
                        const map = mapRef.current;
                        if (!map) return;
                        setRouteStarted(true);
                        setCurrentStepIndex(i);
                        const dist = map.distance(map.getCenter(), [lat, lng]);
                        const duration = Math.min(1.5, Math.max(0.3, dist / 100000));
                        map.flyTo([lat, lng], 15, { duration });
                        if (isMobile) setDrawerOpen(false);
                      }}
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      <ListItemText
                        primary={describeStep(step)}
                        secondary={
                          poi
                            ? `${formatDistance(step.distance)} — ${formatDuration(step.duration)} · ${formatPoiHint(poi)}`
                            : `${formatDistance(step.distance)} — ${formatDuration(step.duration)}`
                        }
                        slotProps={{
                          primary: isCurrent ? { sx: { fontWeight: 600 } } : undefined,
                          secondary: poi ? { sx: { color: AMENITY_COLORS[poi.amenity] ?? 'text.secondary' } } : undefined,
                        }}
                      />
                    </ListItemButton>
                    {isCurrent && alertMode && (
                      <Tooltip title={isLast ? 'Завершити — показати весь маршрут' : 'Пройдено — до наступного'}>
                        <IconButton size="small" color="primary" onClick={advanceStep} sx={{ flexShrink: 0, mr: 1, alignSelf: 'center' }}>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItem>
                );
              })}
            </List>
          )}
          {routes.length === 0 && steps.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}>
              Побудуйте маршрут
            </Typography>
          )}
        </Box>
      )}

      {panel === 'history' && (
        <Box sx={{ 'flex': 1, 'overflowY': 'auto', 'minHeight': 0, 'scrollbarWidth': 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {history.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}>
              Історія маршрутів порожня
            </Typography>
          ) : (
            <List dense disablePadding>
              {history.map(saved => (
                <ListItem
                  key={saved._id}
                  disablePadding
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.25 }}
                >
                  <ListItemText
                    onClick={() => loadFromHistory(saved)}
                    primary={saved.name}
                    secondary={new Date(saved.createdAt).toLocaleDateString('uk-UA')}
                    sx={{ minWidth: 0, flex: 1, m: 0 }}
                    slotProps={{
                      primary: { noWrap: true, sx: { 'fontSize': 13, 'cursor': 'pointer', '&:hover': { color: 'primary.main' } } },
                      secondary: { sx: { fontSize: 11, cursor: 'pointer' } },
                    }}
                  />
                  <Tooltip title="Видалити">
                    <IconButton size="small" onClick={e => handleDeleteRoute(e, saved._id)} sx={{ flexShrink: 0 }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}
    </>
  );

  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {!isMobile && (
        <Paper
          sx={{
            width: 360,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            overflow: 'hidden',
            borderRadius: 0,
          }}
        >
          <Typography variant="h6">Планувальник маршрутів</Typography>
          {sidebarContent}
        </Paper>
      )}

      <Box sx={{ flex: 1, position: 'relative' }}>
        <Tooltip title={userLocation ? 'Моє місцезнаходження' : 'Надайте доступ до геолокації'} placement="left">
          <span style={{ position: 'absolute', bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))', right: 12, zIndex: 1000 }}>
            <IconButton
              onClick={() => withGpsConfirm(() => (userLocation ? mapRef.current?.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 0.8 }) : requestGeolocation()))}
              sx={{
                'backgroundColor': 'background.paper',
                'boxShadow': 3,
                '&:hover': { backgroundColor: 'background.paper' },
              }}
            >
              <MyLocationIcon color={userLocation ? 'primary' : 'disabled'} />
            </IconButton>
          </span>
        </Tooltip>

        {isMobile && (
          <Fab
            color="primary"
            onClick={() => setDrawerOpen(true)}
            sx={{
              position: 'absolute',
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
            }}
          >
            <TuneIcon />
          </Fab>
        )}

        <MapContainer
          ref={mapRef}
          center={[48.5, 31.5]}
          zoom={7}
          minZoom={6.4}
          maxBounds={[
            [45.0, 22.0],
            [53.0, 41.0],
          ]}
          maxBoundsViscosity={1.0}
          zoomSnap={0}
          zoomDelta={0.5}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer key={tileId} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url={tileUrl} />

          {!alertMode && userLocation && (
            <>
              <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={10} pathOptions={{ color: '#fff', fillColor: '#4fc3f7', fillOpacity: 1, weight: 2 }} />
              <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={20} pathOptions={{ color: '#4fc3f7', fillColor: '#4fc3f7', fillOpacity: 0.2, weight: 1 }} />
            </>
          )}

          {origin && <Marker position={[origin.lat, origin.lng]} />}
          {destination && <Marker position={[destination.lat, destination.lng]} />}

          {routes[selectedRoute] &&
            (() => {
              const coords = routes[selectedRoute].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
              return <Polyline positions={coords} pathOptions={{ color: ROUTE_COLORS[selectedRoute] || '#4fc3f7', weight: 6 }} />;
            })()}

          {poiMarkers.map((poi, i) => (
            <CircleMarker
              key={i}
              center={[poi.lat, poi.lng]}
              radius={7}
              pathOptions={{ color: '#fff', fillColor: AMENITY_COLORS[poi.amenity] ?? '#888', fillOpacity: 1, weight: 2 }}
            >
              <LeafletTooltip direction="top" offset={[0, -8]} opacity={1}>
                {formatPoiHint(poi)}
              </LeafletTooltip>
            </CircleMarker>
          ))}

          <FitBounds bounds={bounds} />
        </MapContainer>
      </Box>

      {isMobile && (
        <SwipeableDrawer
          anchor="bottom"
          open={drawerOpen}
          onOpen={() => setDrawerOpen(true)}
          onClose={() => setDrawerOpen(false)}
          disableSwipeToOpen={false}
          sx={{
            '& .MuiDrawer-paper': {
              borderRadius: '16px 16px 0 0',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: 2,
            },
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'grey.400',
              mx: 'auto',
              mb: 2,
            }}
          />

          <Typography variant="h6" sx={{ mb: 1 }}>
            Планувальник маршрутів
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{sidebarContent}</Box>
        </SwipeableDrawer>
      )}

      <Snackbar
        open={poisLoading}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ pointerEvents: 'none' }}
        message={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={14} sx={{ color: 'inherit' }} />
            <Typography variant="caption">Завантаження орієнтирів...</Typography>
          </Box>
        }
      />

      <Dialog open={pendingGpsAction !== null} onClose={() => setPendingGpsAction(null)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { m: { xs: 2, sm: 4 } } } }}>
        <DialogTitle sx={{ pb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>Увімкнути GPS під час тривоги?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: { xs: 13, sm: 14 } }}>
            Під час повітряної тривоги GPS-сигнал може бути неточним або недоступним. Орієнтуйтесь по карті та орієнтирах на маршруті.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 }, gap: 1 }}>
          <Button onClick={() => setPendingGpsAction(null)} size="small">
            Скасувати
          </Button>
          <Button onClick={confirmGps} variant="contained" size="small" color="warning">
            Все одно увімкнути
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MapPage;
