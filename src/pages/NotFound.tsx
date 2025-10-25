import { Home as HomeIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Box, Button, Container, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 404 Not Found page component
 * Displayed when users navigate to an invalid route
 */
export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = (): void => {
    navigate('/');
  };

  const handleGoBack = (): void => {
    navigate(-1);
  };

  return (
    <Container maxWidth="md">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
        textAlign="center"
        gap={3}
      >
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
            fontWeight: 700,
            color: 'primary.main',
            lineHeight: 1,
          }}
        >
          404
        </Typography>

        <Typography
          variant="h4"
          component="h2"
          gutterBottom
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            fontWeight: 500,
          }}
        >
          Page Not Found
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            maxWidth: '500px',
            mb: 2,
            fontSize: { xs: '1rem', sm: '1.1rem' },
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist. It might have been moved, deleted, or
          you may have mistyped the URL.
        </Typography>

        <Box display="flex" gap={2} flexWrap="wrap" justifyContent="center">
          <Button
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            sx={{
              minWidth: '150px',
            }}
          >
            Go Home
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowBackIcon />}
            onClick={handleGoBack}
            sx={{
              minWidth: '150px',
            }}
          >
            Go Back
          </Button>
        </Box>

        <Box mt={4}>
          <Typography variant="body2" color="text.secondary">
            Need help? Contact support or check the documentation.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};
