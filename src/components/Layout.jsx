import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from './Header';

function Layout() {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
