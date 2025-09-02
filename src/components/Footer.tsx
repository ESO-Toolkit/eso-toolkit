import { Box, Container, Typography, useTheme } from '@mui/material';
import React from 'react';

import esoLogo from '../assets/ESOHelpers-logo-icon.svg';

export const Footer: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        marginTop: { xs: '4rem', md: '6rem' },
        position: 'relative',
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, transparent 0%, rgba(15,23,42,0.4) 50%, rgba(3,7,18,0.8) 100%)'
            : 'linear-gradient(180deg, transparent 0%, rgba(248,250,252,0.6) 50%, rgba(241,245,249,0.9) 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.3), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.2), transparent)',
        },
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          px: { xs: 3, sm: 4, lg: 6 },
          py: { xs: 6, md: 8 },
        }}
      >
        {/* Main Footer Content */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1fr auto' },
            gap: { xs: 6, md: 8, lg: 12 },
            alignItems: 'start',
            mb: { xs: 6, md: 8 },
          }}
        >
          {/* Brand Section */}
          <Box sx={{ gridColumn: { xs: '1', lg: '1 / span 2' } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 3,
                justifyContent: { xs: 'center', lg: 'flex-start' },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(0, 225, 255, 0.1))'
                      : 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(0, 225, 255, 0.08))',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border:
                    theme.palette.mode === 'dark'
                      ? '1px solid rgba(56, 189, 248, 0.2)'
                      : '1px solid rgba(56, 189, 248, 0.15)',
                }}
              >
                <img src={esoLogo} alt="ESO Helpers" style={{ width: 24, height: 24 }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  letterSpacing: '-0.02em',
                  fontFamily: 'Space Grotesk,Inter,system-ui',
                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #00e1ff 100%)'
                      : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                ESO Helper Tools
              </Typography>
            </Box>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontSize: '1rem',
                lineHeight: 1.6,
                maxWidth: '400px',
                textAlign: { xs: 'center', lg: 'left' },
                opacity: 0.9,
                mx: { xs: 'auto', lg: 0 },
              }}
            >
              Essential tools built by the ESO community for enhanced gameplay, optimization, and
              guild management. Battle-tested by veterans across Tamriel.
            </Typography>
          </Box>

          {/* Tools Section */}
          <Box sx={{ textAlign: { xs: 'center', lg: 'left' } }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.1rem',
                color: 'text.primary',
                mb: 3,
                fontFamily: 'Space Grotesk,Inter,system-ui',
              }}
            >
              Tools
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { name: 'Text Editor', href: 'https://esohelper.tools/text-editor' },
                { name: 'Build Calculator', href: 'https://esohelper.tools/calculator' },
                { name: 'Log Analyzer', href: '#' },
              ].map((tool) => (
                <Box key={tool.name}>
                  <a
                    href={tool.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: theme.palette.text.secondary,
                      textDecoration: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      display: 'inline-block',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#38bdf8';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.palette.text.secondary;
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    {tool.name}
                  </a>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Community Section */}
          <Box sx={{ textAlign: { xs: 'center', lg: 'left' } }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.1rem',
                color: 'text.primary',
                mb: 3,
                fontFamily: 'Space Grotesk,Inter,system-ui',
              }}
            >
              Community
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { name: 'Discord', href: 'https://discord.gg/mMjwcQYFdc' },
                { name: 'GitHub', href: 'https://github.com/esohelper' },
              ].map((link) => (
                <Box key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: theme.palette.text.secondary,
                      textDecoration: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      display: 'inline-block',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#38bdf8';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.palette.text.secondary;
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    {link.name}
                  </a>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Elegant Divider */}
        <Box
          sx={{
            position: 'relative',
            height: '1px',
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.15), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.1), transparent)',
            mb: { xs: 4, md: 6 },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '-2px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '200px',
              height: '5px',
              background:
                theme.palette.mode === 'dark'
                  ? 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.3) 0%, transparent 70%)'
                  : 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.2) 0%, transparent 70%)',
              filter: 'blur(2px)',
            },
          }}
        />

        {/* Bottom Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: { xs: 3, md: 4 },
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.9rem',
              fontWeight: 500,
              opacity: 0.8,
              order: { xs: 2, md: 1 },
            }}
          >
            © 2024 ESO Helper Tools
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.85rem',
              opacity: 0.7,
              fontWeight: 400,
              order: { xs: 1, md: 2 },
              lineHeight: 1.4,
            }}
          >
            Not affiliated with ZeniMax Online Studios, Bethesda, or esologs.com
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
