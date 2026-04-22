import { useState, useEffect, useRef } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Tooltip } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { useThemeMode } from '../context/ThemeContext';
import { getAlertByLocation, getAlerts } from '../api/alerts';
import { POLL_INTERVAL_MS } from '../utils/constants.js';

function AlertIndicator() {
  const [alert, setAlert] = useState(null);
  const [hasLocation, setHasLocation] = useState(false);
  const intervalRef = useRef(null);

  const startPolling = (lat, lng) => {
    const poll = async () => {
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
    poll();
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        setHasLocation(true);
        startPolling(pos.coords.latitude, pos.coords.longitude);
      },
      () => startPolling(null, null),
      { timeout: 5000 },
    );
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setHasLocation(true);
          startPolling(pos.coords.latitude, pos.coords.longitude);
        },
        () => startPolling(null, null),
        { timeout: 5000 },
      );
    } else {
      startPolling(null, null);
    }
    return () => clearInterval(intervalRef.current);
  }, []);

  if (alert === null) return null;

  const noLocation = !hasLocation;
  const color = alert.active ? 'error' : 'success';
  const label = alert.active ? 'Тривога' : 'Спокійно';
  const regionShort = alert.region?.replace(' область', '');
  const activeIcon = alert.active ? <WarningAmberIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />;
  const tooltip = noLocation
    ? `${alert.active ? 'Є активні тривоги' : 'Тривог немає'} — натисніть щоб визначити ваш регіон`
    : alert.region
      ? `${alert.region}: ${alert.active ? 'активна тривога' : 'тривоги немає'}`
      : alert.active
        ? 'Є активні тривоги'
        : 'Тривог немає';

  return (
    <Tooltip title={tooltip}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden', minWidth: 0, cursor: noLocation ? 'pointer' : 'default' }}
        onClick={noLocation ? requestLocation : undefined}
      >
        <IconButton size="small" color={color} sx={{ p: 0.5, flexShrink: 0 }}>
          {activeIcon}
        </IconButton>
        {regionShort && (
          <Typography variant="caption" color={`${color}.main`} noWrap sx={{ display: { xs: 'none', md: 'block' } }}>
            {regionShort} — {label}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}

function Header() {
  const navigate = useNavigate();
  const { mode, toggleMode } = useThemeMode();
  const token = localStorage.getItem('accessToken');

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar sx={{ minWidth: 0 }}>
        <ExploreIcon sx={{ mr: 1, color: 'primary.main', flexShrink: 0 }} />
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: { xs: '0.95rem', sm: '1.25rem' },
          }}
        >
          GPS Resilient Navigation
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          {token && <AlertIndicator />}

          <IconButton onClick={toggleMode} color="inherit">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {token ? (
            <>
              <Button color="inherit" onClick={handleLogout}>
                Вийти
              </Button>
            </>
          ) : (
            <Button component={Link} to="/login" color="inherit">
              Увійти
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
