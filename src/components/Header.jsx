import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';

function Header() {
  const navigate = useNavigate();
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
      <Toolbar>
        <ExploreIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}
        >
          GPS Resilient Navigation
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {token ? (
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <>
              <Button component={Link} to="/login" color="inherit">
                Login
              </Button>
              <Button component={Link} to="/register" variant="contained">
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
