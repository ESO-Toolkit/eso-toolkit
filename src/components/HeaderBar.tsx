import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../AuthContext';
import { RootState } from '../store/storeWithHistory';
import { setDarkMode } from '../store/ui/uiSlice';
import { useAppDispatch } from '../store/useAppDispatch';

const HeaderBar: React.FC = () => {
  const { isLoggedIn, setAccessToken } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const dispatch = useAppDispatch();
  const darkMode = useSelector((state: RootState) => state.ui.darkMode);
  const navigate = useNavigate();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setAccessToken('');
    handleMenuClose();
  };
  const handleThemeToggle = () => {
    dispatch(setDarkMode(!darkMode));
    handleMenuClose();
  };

  return (
    <AppBar position="static" color="primary" sx={{ mb: 4 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Button
            color="inherit"
            sx={{ fontSize: '1.25rem', textTransform: 'none', p: 0 }}
            onClick={() => navigate('/')}
          >
            ESO Log Insights
          </Button>
        </Typography>
        {isLoggedIn && (
          <>
            <IconButton color="inherit" onClick={handleMenuOpen} sx={{ ml: 2 }}>
              <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={handleThemeToggle}>
                Switch to {darkMode ? 'Light' : 'Dark'} Mode
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default HeaderBar;
