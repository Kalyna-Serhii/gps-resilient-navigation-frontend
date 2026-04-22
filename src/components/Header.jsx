import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import MapIcon from '@mui/icons-material/Map';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { useThemeMode } from '../context/ThemeContext';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

function Header() {
  const navigate = useNavigate();
  const { mode, toggleMode } = useThemeMode();
  const token = localStorage.getItem('accessToken');
  const userName = localStorage.getItem('userName');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar>
        <ExploreIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
          GPS Resilient Navigation
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button component={Link} to="/" color="inherit" startIcon={<MapIcon />} sx={{ minWidth: 0 }}>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Карта
            </Box>
          </Button>

          <IconButton onClick={toggleMode} color="inherit">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {token ? (
            <>
              {!isMobile && (
                <Typography variant="body1" sx={{ color: 'primary.main' }}>
                  {userName}
                </Typography>
              )}
              <Button color="inherit" onClick={handleLogout}>
                Вийти
              </Button>
            </>
          ) : (
            <>
              <Button component={Link} to="/login" color="inherit">
                Увійти
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
