import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledMarketingBadge = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(0, 225, 255, 0.05))',
  border: '1px solid rgba(56, 189, 248, 0.2)',
  borderRadius: '50px',
  padding: '0.5rem 1.2rem',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#38bdf8',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 20px rgba(56, 189, 248, 0.1)',
  animation: 'float 3s ease-in-out infinite',
  '@keyframes float': {
    '0%, 100%': { transform: 'translateY(0px)' },
    '50%': { transform: 'translateY(-4px)' },
  },
});

export const MarketingBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <StyledMarketingBadge>{children}</StyledMarketingBadge>;
};
