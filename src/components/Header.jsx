import { AppBar, Toolbar, Typography, Button, Box, IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { useThemeMode } from '../hooks/useThemeMode';
import { useAlert } from '../hooks/useAlert';

function AlertIndicator() {
  const { alert, hasLocation, requestLocation } = useAlert();

  if (alert === null) return null;

  const noLocation = !hasLocation;
  const hasAnyAlert = alert.active || alert.globalActive;
  const color = alert.active ? 'error' : alert.globalActive ? 'warning' : 'success';
  const label = alert.active ? 'Тривога' : 'Спокійно';
  const regionShort = alert.region?.replace(' область', '');
  const activeIcon = hasAnyAlert ? <WarningAmberIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />;
  const tooltip = noLocation
    ? `${alert.globalActive ? 'Є активні тривоги в країні' : 'Тривог немає'} — натисніть щоб визначити ваш регіон`
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
      void 0;
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar sx={{ minWidth: 0 }}>
        <Box component="img" src="/favicon.png" alt="logo" sx={{ width: 28, height: 28, mr: 1, flexShrink: 0 }} />
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            textDecoration: 'none',
            color: 'inherit',
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

        <Box sx={{ flexGrow: 1 }} />

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
