import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import DirectionsIcon from '@mui/icons-material/Directions';
import HistoryIcon from '@mui/icons-material/History';
import RouteIcon from '@mui/icons-material/Route';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import TuneIcon from '@mui/icons-material/Tune';
import DeleteIcon from '@mui/icons-material/Delete';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { buildRoute, getSavedRoutes, deleteRoute } from '../api/routes';
import { describeStep } from '../utils/maneuver';
import { MAP_TILE_OPTIONS } from '../styles/theme';
import { usePlaceSearch } from '../hooks/usePlaceSearch';

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
  }, [bounds]);
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

  const [tileId, setTileId] = useState('light');
  const tileUrl = MAP_TILE_OPTIONS.find(t => t.id === tileId)?.url;
  const origin$ = usePlaceSearch();
  const dest$ = usePlaceSearch();
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [steps, setSteps] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState('history');
  const [userLocation, setUserLocation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const boundsRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), null, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSavedRoutes();
        setHistory(data ?? []);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const selectPlace = (place, setPoint, search$) => {
    setPoint({ lat: place.lat, lng: place.lng });
    search$.select(place.displayName);
  };

  const requestGeolocation = () => {
    navigator.geolocation.getCurrentPosition(pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), null, { enableHighAccuracy: true });
  };

  const useMyLocation = (setPoint, search$) => {
    if (!userLocation) {
      requestGeolocation();
      return;
    }
    setPoint(userLocation);
    search$.select('Моє місцезнаходження');
  };

  const handleBuildRoute = async () => {
    if (!origin || !destination) return;
    setError('');
    setLoading(true);
    setRoutes([]);
    setSteps([]);
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
      const data = await buildRoute({ name, origin, destination });
      setRoutes(data.routes);
      setHistory(prev => [data, ...prev.filter(r => r._id !== data._id)]);
      if (data.routes.length > 0) {
        setSelectedRoute(0);
        setSteps(data.routes[0].steps || []);
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        boundsRef.current = L.latLngBounds(coords);
        setPanel('route');
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
      // ignore
    }
  };

  const loadFromHistory = saved => {
    setOrigin(saved.origin);
    setDestination(saved.destination);
    setRoutes(saved.routes);
    setSelectedRoute(0);
    setSteps(saved.routes[0]?.steps || []);
    origin$.select(saved.name.split(' → ')[0]);
    dest$.select(saved.name.split(' → ')[1] || '');
    const coords = saved.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    boundsRef.current = L.latLngBounds(coords);
    setPanel('route');
  };

  const handleSelectRoute = index => {
    setSelectedRoute(index);
    setSteps(routes[index].steps || []);
    const coords = routes[index].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    boundsRef.current = L.latLngBounds(coords);
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

  const sidebarContent = (
    <>
      <ToggleButtonGroup value={tileId} exclusive onChange={(_, val) => val && setTileId(val)} size="small" fullWidth>
        {MAP_TILE_OPTIONS.map(t => (
          <ToggleButton key={t.id} value={t.id} sx={{ flex: 1, fontSize: 11 }}>
            {t.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Origin */}
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
                  <IconButton size="small" onClick={() => useMyLocation(setOrigin, origin$)} sx={{ cursor: 'pointer' }}>
                    <MyLocationIcon fontSize="small" color={userLocation ? 'primary' : 'disabled'} />
                  </IconButton>
                </Tooltip>
              ),
            },
          }}
        />
        <PlaceDropdown results={origin$.results} searched={origin$.searched} onSelect={place => selectPlace(place, setOrigin, origin$)} />
      </Box>

      {/* Destination */}
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
                  <IconButton size="small" onClick={() => useMyLocation(setDestination, dest$)} sx={{ cursor: 'pointer' }}>
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
        onClick={handleBuildRoute}
        disabled={!origin || !destination || loading}
      >
        Побудувати маршрут
      </Button>

      {/* Tabs */}
      <Tabs value={panel} onChange={(_, v) => setPanel(v)} variant="fullWidth" sx={{ mt: 1, minHeight: 36 }}>
        <Tab icon={<RouteIcon fontSize="small" />} iconPosition="start" label="Маршрут" value="route" disabled={routes.length === 0} sx={{ minHeight: 36, fontSize: 12 }} />
        <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="Історія" value="history" sx={{ minHeight: 36, fontSize: 12 }} />
      </Tabs>

      {/* Route panel */}
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
              {steps.map((step, i) => (
                <ListItemButton
                  key={i}
                  dense
                  onClick={() => {
                    const [lng, lat] = step.maneuver.location;
                    const map = mapRef.current;
                    if (!map) return;
                    const dist = map.distance(map.getCenter(), [lat, lng]);
                    const duration = Math.min(1.5, Math.max(0.3, dist / 100000));
                    map.flyTo([lat, lng], 15, { duration });
                    if (isMobile) setDrawerOpen(false);
                  }}
                >
                  <ListItemText primary={describeStep(step)} secondary={`${formatDistance(step.distance)} — ${formatDuration(step.duration)}`} />
                </ListItemButton>
              ))}
            </List>
          )}
          {routes.length === 0 && steps.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}>
              Побудуйте маршрут
            </Typography>
          )}
        </Box>
      )}

      {/* History panel */}
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
                  secondaryAction={
                    <Tooltip title="Видалити">
                      <IconButton edge="end" size="small" onClick={e => handleDeleteRoute(e, saved._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemButton onClick={() => loadFromHistory(saved)} sx={{ borderRadius: 1, px: 1, pr: 5 }}>
                    <ListItemText
                      primary={saved.name}
                      secondary={new Date(saved.createdAt).toLocaleDateString('uk-UA')}
                      slotProps={{ primary: { noWrap: true, sx: { fontSize: 13 } }, secondary: { sx: { fontSize: 11 } } }}
                    />
                  </ListItemButton>
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
      {/* Desktop sidebar */}
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

      {/* Map */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Tooltip title={userLocation ? 'Моє місцезнаходження' : 'Надайте доступ до геолокації'} placement="left">
          <span style={{ position: 'absolute', bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))', right: 12, zIndex: 1000 }}>
            <IconButton
              onClick={() => (userLocation ? mapRef.current?.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 0.8 }) : requestGeolocation())}
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

        {/* Mobile FAB */}
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

          {userLocation && (
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

          <FitBounds bounds={boundsRef.current} />
        </MapContainer>
      </Box>

      {/* Mobile bottom drawer */}
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
          {/* Drag handle */}
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
    </Box>
  );
}

export default MapPage;
