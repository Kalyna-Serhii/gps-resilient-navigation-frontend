import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from './Header';

function Layout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Box sx={{ flex: 1, display: 'flex' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
