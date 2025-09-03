import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  HelpOutline as HelpOutlineIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Container,
  Tabs,
  Tab,
  Paper,
  FormControlLabel,
  Switch,
  Button,
  ButtonGroup,
  TextField,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Tooltip,
  IconButton,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { styled, useTheme, alpha } from '@mui/material/styles';
import React, { useState, useMemo, useCallback, useRef } from 'react';

import {
  CalculatorItem,
  CalculatorData,
  PENETRATION_DATA,
  CRITICAL_DATA,
  PEN_OPTIMAL_MIN_PVE,
  PEN_OPTIMAL_MAX_PVE,
  PEN_OPTIMAL_MIN_PVP,
  PEN_OPTIMAL_MAX_PVP,
  CRIT_OPTIMAL_MIN,
  CRIT_OPTIMAL_MAX,
} from '../data/skill-lines/calculator-data';

// Mode type
type GameMode = 'pve' | 'pvp' | 'both';

// Styled components
const CalculatorContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'liteMode',
})<{ liteMode?: boolean }>(({ theme, liteMode }) => ({
  minHeight: '100vh',
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : 'transparent',
  position: 'relative',
  width: '100%',
  maxWidth: '100vw',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

// Modern Switch styling
const ModernSwitch = styled(Switch)(({ theme }) => ({
  width: 58,
  height: 32,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(26px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.mode === 'dark' ? '#38bdf8' : '#0f172a',
        opacity: 1,
        border: 0,
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 0 20px rgba(56, 189, 248, 0.3), inset 0 2px 4px rgba(0,0,0,0.1)'
          : '0 0 15px rgba(15, 23, 42, 0.2), inset 0 2px 4px rgba(0,0,0,0.05)',
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: theme.palette.mode === 'dark' ? '#38bdf8' : '#0f172a',
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.mode === 'light'
        ? theme.palette.grey[100]
        : theme.palette.grey[600],
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 28,
    height: 28,
    background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.2)',
    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 3px 12px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.25)',
    },
  },
  '& .MuiSwitch-track': {
    borderRadius: 16,
    backgroundColor: theme.palette.mode === 'light' ? '#94a3b8' : '#475569',
    opacity: 1,
    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    border: theme.palette.mode === 'dark' 
      ? '1px solid rgba(148, 163, 184, 0.3)' 
      : '1px solid rgba(71, 85, 105, 0.3)',
    '&:hover': {
      backgroundColor: theme.palette.mode === 'light' ? '#64748b' : '#64748b',
    },
  },
}));

const CalculatorCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'liteMode',
})<{ liteMode?: boolean }>(({ theme, liteMode }) => ({
  width: '100%',
  maxWidth: liteMode ? '100%' : '1200px',
  margin: '0 auto',
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: liteMode ? 0 : theme.spacing(2),
  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
  boxShadow: liteMode ? 'none' : theme.shadows[4],
  display: 'flex',
  flexDirection: 'column',
  minHeight: 'auto',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
}));

// CSS handles sticky positioning - no custom hook needed

const TotalSection = styled(Box)<{ isLiteMode: boolean }>(({ theme, isLiteMode }) => ({
  position: 'relative',
}));

const StickyFooter = styled(Box)<{ isLiteMode: boolean }>(({ theme, isLiteMode }) => ({
  position: 'sticky',
  bottom: 0,
  zIndex: 1000,
  marginTop: 'auto',
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  borderRadius: '12px 12px 0 0',
  padding: theme.spacing(isLiteMode ? 1.5 : 3),
  boxShadow: theme.shadows[8],
  backdropFilter: 'blur(10px)',
  paddingBottom: `calc(${theme.spacing(isLiteMode ? 1.5 : 3)} + env(safe-area-inset-bottom))`,
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps): React.JSX.Element {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`calculator-tabpanel-${index}`}
      aria-labelledby={`calculator-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number): { id: string; 'aria-controls': string } {
  return {
    id: `calculator-tab-${index}`,
    'aria-controls': `calculator-tabpanel-${index}`,
  };
}

// Custom tooltip content component that matches SkillTooltip styling
interface CalculatorTooltipProps {
  title: string;
  content: string;
}

const CalculatorTooltip: React.FC<CalculatorTooltipProps> = ({ title, content }) => {
  const theme = useTheme();

  return (
    <Card
      variant="outlined"
      sx={{
        maxWidth: 320,
        minWidth: 240,
        border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        backgroundColor:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.95)
            : alpha(theme.palette.background.paper, 0.98),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mb: 1,
            color:
              theme.palette.mode === 'dark'
                ? theme.palette.primary.light
                : theme.palette.primary.main,
            fontSize: '0.9rem',
          }}
        >
          {title}
        </Typography>
        <Divider sx={{ my: 1, borderColor: alpha(theme.palette.common.white, 0.08) }} />
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            lineHeight: 1.4,
            fontSize: '0.8rem',
            wordBreak: 'break-word',
            '& strong': {
              color:
                theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : theme.palette.primary.main,
              fontWeight: 600,
            },
            '& em': {
              color: 'text.secondary',
              fontStyle: 'italic',
            },
            '& .tt-head': {
              fontWeight: 600,
              color:
                theme.palette.mode === 'dark'
                  ? theme.palette.secondary.light
                  : theme.palette.secondary.main,
              fontSize: '0.75rem',
              marginTop: theme.spacing(0.5),
              marginBottom: theme.spacing(0.25),
            },
            '& br': {
              marginBottom: theme.spacing(0.5),
            },
            '& ul': {
              margin: 0,
              paddingLeft: theme.spacing(2),
              '& li': {
                marginBottom: theme.spacing(0.25),
              },
            },
            '& a': {
              color: theme.palette.primary.main,
              textDecoration: 'underline',
              '&:hover': {
                color: theme.palette.primary.light,
              },
            },
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </CardContent>
    </Card>
  );
};

const Calculator: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedTab, setSelectedTab] = useState(0);
  const [liteMode, setLiteMode] = useState(isMobile);
  const [gameMode, setGameMode] = useState<GameMode>('both');
  const [penetrationData, setPenetrationData] = useState<CalculatorData>(PENETRATION_DATA);
  const [criticalData, setCriticalData] = useState<CalculatorData>(CRITICAL_DATA);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Calculate total values
  const calculateItemValue = useCallback((item: CalculatorItem): number => {
    if (!item.enabled) return 0;

    if (item.name === 'Anthelmir') {
      // Penetration = Weapon Damage ÷ 2.5
      const wd = parseFloat(item.quantity.toString()) || 0;
      return Math.round(wd / 2.5);
    } else if (item.name === 'Balorgh') {
      // Penetration = Ultimate × 23
      const ult = parseFloat(item.quantity.toString()) || 0;
      return Math.round(ult * 23);
    } else if (item.isFlat) {
      return item.value || 0;
    } else {
      return item.quantity * (item.per || 0);
    }
  }, []);

  const calculateTotalValue = useCallback(
    (data: CalculatorData): number => {
      let total = 0;
      Object.values(data).forEach((section) => {
        section.forEach((item: CalculatorItem) => {
          total += calculateItemValue(item);
        });
      });
      return total;
    },
    [calculateItemValue]
  );

  const penTotal = useMemo(
    () => calculateTotalValue(penetrationData),
    [penetrationData, calculateTotalValue]
  );
  const critTotal = useMemo(
    () => calculateTotalValue(criticalData),
    [criticalData, calculateTotalValue]
  );

  // Status calculation
  const getPenStatus = useCallback((total: number, mode: GameMode) => {
    if (mode === 'pve') {
      if (total >= PEN_OPTIMAL_MIN_PVE && total <= PEN_OPTIMAL_MAX_PVE) return 'at-cap';
      if (total > PEN_OPTIMAL_MAX_PVE) return 'over-cap';
      return 'under-cap';
    } else if (mode === 'pvp') {
      if (total >= PEN_OPTIMAL_MIN_PVP && total <= PEN_OPTIMAL_MAX_PVP) return 'at-cap';
      if (total > PEN_OPTIMAL_MAX_PVP) return 'over-cap';
      return 'under-cap';
    }
    // Both mode - show PvE ranges
    if (total >= PEN_OPTIMAL_MIN_PVE && total <= PEN_OPTIMAL_MAX_PVE) return 'at-cap';
    if (total > PEN_OPTIMAL_MAX_PVE) return 'over-cap';
    return 'under-cap';
  }, []);

  const getCritStatus = useCallback((total: number) => {
    if (total >= CRIT_OPTIMAL_MIN && total <= CRIT_OPTIMAL_MAX) return 'at-cap';
    if (total > CRIT_OPTIMAL_MAX) return 'over-cap';
    return 'under-cap';
  }, []);

  const penStatus = getPenStatus(penTotal, gameMode);
  const critStatus = getCritStatus(critTotal);

  // Update item handlers
  const updatePenItem = useCallback(
    (category: keyof CalculatorData, index: number, updates: Partial<CalculatorItem>) => {
      setPenetrationData((prev: CalculatorData) => ({
        ...prev,
        [category]: prev[category].map((item: CalculatorItem, i: number) =>
          i === index ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );

  const updateCritItem = useCallback(
    (category: keyof CalculatorData, index: number, updates: Partial<CalculatorItem>) => {
      setCriticalData((prev: CalculatorData) => ({
        ...prev,
        [category]: prev[category].map((item: CalculatorItem, i: number) =>
          i === index ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );

  // Bulk toggle handlers
  const toggleAllPen = useCallback((enabled: boolean) => {
    setPenetrationData((prev: CalculatorData) => {
      const newData = { ...prev };
      Object.keys(newData).forEach((category) => {
        newData[category as keyof CalculatorData] = newData[category as keyof CalculatorData].map(
          (item: CalculatorItem) => (item.locked ? item : { ...item, enabled })
        );
      });
      return newData;
    });
  }, []);

  const toggleAllCrit = useCallback((enabled: boolean) => {
    setCriticalData((prev: CalculatorData) => {
      const newData = { ...prev };
      Object.keys(newData).forEach((category) => {
        newData[category as keyof CalculatorData] = newData[category as keyof CalculatorData].map(
          (item: CalculatorItem) => (item.locked ? item : { ...item, enabled })
        );
      });
      return newData;
    });
  }, []);

  // Render item component
  const renderItem = (
    item: CalculatorItem,
    index: number,
    category: keyof CalculatorData,
    updateFunction: (
      category: keyof CalculatorData,
      index: number,
      updates: Partial<CalculatorItem>
    ) => void
  ): React.JSX.Element => {
    const hasQuantity = item.maxQuantity && item.maxQuantity > 1;
    let displayValue: number;
    let perDisplay = '';

    if (item.name === 'Anthelmir') {
      const wd = parseFloat(item.quantity.toString()) || 0;
      displayValue = Math.round(wd / 2.5);
    } else if (item.name === 'Balorgh') {
      const ult = parseFloat(item.quantity.toString()) || 0;
      displayValue = Math.round(ult * 23);
    } else if (item.isFlat) {
      displayValue = item.value || 0;
    } else {
      displayValue = item.quantity * (item.per || 0);
      perDisplay = (item.per || 0) + (item.isPercent ? '%' : '');
    }

    return (
      <ListItem
        key={index}
        sx={{
          display: 'grid',
          gridTemplateColumns: hasQuantity
            ? liteMode
              ? 'auto 50px 1fr auto'
              : isMobile
                ? 'auto 60px 1fr auto'
                : 'auto 80px 1fr auto auto'
            : liteMode
              ? 'auto 1fr auto'
              : isMobile
                ? 'auto 1fr auto'
                : 'auto 1fr auto',
          alignItems: 'center',
          gap: liteMode ? 0.75 : 2,
          p: liteMode ? 0.5 : 1.5,
          background: item.enabled
            ? theme.palette.mode === 'dark'
              ? 'rgba(56, 189, 248, 0.12)'
              : 'rgba(59, 130, 246, 0.05)'
            : theme.palette.mode === 'dark'
              ? 'rgba(2,6,23,0.45)'
              : 'rgba(248, 250, 252, 0.8)',
          border: item.enabled
            ? theme.palette.mode === 'dark'
              ? '1px solid rgba(56, 189, 248, 0.4)'
              : '1px solid rgba(59, 130, 246, 0.3)'
            : theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(203, 213, 225, 0.3)',
          borderRadius: liteMode ? 0.5 : 2,
          mb: liteMode ? 0 : 1,
          cursor: item.locked ? 'not-allowed' : 'pointer',
          opacity: item.locked ? 0.8 : 1,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          '&:hover': !item.locked
            ? {
                backgroundColor: item.enabled
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.18)'
                    : 'rgba(59, 130, 246, 0.08)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(2,6,23,0.6)'
                    : 'rgba(248, 250, 252, 0.95)',
                borderColor: item.enabled
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.6)'
                    : 'rgba(59, 130, 246, 0.5)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(203, 213, 225, 0.5)',
                transform: liteMode ? 'none' : 'translateY(-1px)',
                boxShadow: !liteMode
                  ? item.enabled
                    ? theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(56, 189, 248, 0.15)'
                      : '0 4px 12px rgba(59, 130, 246, 0.1)'
                    : theme.palette.mode === 'dark'
                      ? '0 4px 8px rgba(0, 0, 0, 0.15)'
                      : '0 2px 6px rgba(0, 0, 0, 0.08)'
                  : 'none',
              }
            : {},
          // Accent border for enabled items
          ...(item.enabled &&
            !liteMode && {
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '3px',
                backgroundColor: theme.palette.mode === 'dark' ? '#38bdf8' : '#3b82f6',
                borderRadius: '2px 0 0 2px',
              },
            }),
        }}
        onClick={() => !item.locked && updateFunction(category, index, { enabled: !item.enabled })}
      >
        <ListItemIcon sx={{ minWidth: 'auto' }}>
          <Checkbox
            checked={item.enabled}
            disabled={item.locked}
            size="small"
            color="primary"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateFunction(category, index, { enabled: e.target.checked })}
          />
        </ListItemIcon>

        {hasQuantity && (
          <TextField
            size="small"
            type="number"
            value={item.quantity}
            onChange={(e) =>
              updateFunction(category, index, {
                quantity: Math.max(
                  item.minQuantity || 0,
                  Math.min(item.maxQuantity || 100, parseInt(e.target.value) || 0)
                ),
              })
            }
            onClick={(e) => e.stopPropagation()}
            disabled={item.locked}
            placeholder={item.quantityTitle || undefined}
            inputProps={{
              min: item.minQuantity || 0,
              max: item.maxQuantity || 100,
              step: item.step || 1,
            }}
            sx={{
              width: liteMode ? 50 : isMobile ? 60 : 80,
              '& .MuiInputBase-root': {
                fontSize: liteMode ? '0.75rem' : isMobile ? '0.8rem' : '0.875rem',
              },
            }}
          />
        )}

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: item.enabled ? 'text.primary' : 'text.disabled',
                    textDecoration: item.enabled ? 'none' : 'line-through',
                    fontSize: liteMode ? '0.8rem' : isMobile ? '0.875rem' : '0.9rem',
                    lineHeight: 1.3,
                  }}
                >
                  {item.name}
                </Typography>
                {item.tooltip && !item.hideTooltip && (
                  <Tooltip
                    title={<CalculatorTooltip title={item.name} content={item.tooltip} />}
                    enterTouchDelay={0}
                    leaveTouchDelay={3000}
                    placement="top-start"
                    enterDelay={0}
                    arrow
                    slotProps={{
                      popper: {
                        modifiers: [
                          {
                            name: 'preventOverflow',
                            options: { padding: 8, rootBoundary: 'viewport' },
                          },
                          {
                            name: 'flip',
                            options: {
                              fallbackPlacements: ['top', 'bottom', 'left', 'right'],
                            },
                          },
                          { name: 'offset', options: { offset: [0, 8] } },
                        ],
                      },
                      tooltip: { sx: { p: 0 } },
                    }}
                  >
                    <IconButton
                      size="small"
                      sx={{
                        p: 0.25,
                        minWidth: 'auto',
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'primary.main',
                        },
                      }}
                    >
                      <InfoIcon sx={{ fontSize: liteMode ? 12 : isMobile ? 14 : 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {item.locked && (
                <Chip
                  label="🔒"
                  size="small"
                  sx={{
                    height: liteMode ? 16 : isMobile ? 18 : 20,
                    fontSize: liteMode ? '0.6rem' : '0.65rem',
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                  }}
                />
              )}
            </Box>
          }
        />

        {perDisplay && !liteMode && (
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontStyle: 'italic',
              fontSize: isMobile ? '0.7rem' : '0.75rem',
            }}
          >
            {perDisplay}
          </Typography>
        )}

        <Typography
          variant="body2"
          sx={{
            color: '#38bdf8',
            fontWeight: 700,
            fontFamily: 'monospace',
            textShadow: theme.palette.mode === 'dark' ? '0 0 10px rgba(59,130,246,0.25)' : 'none',
            minWidth: liteMode ? '2.5ch' : isMobile ? '3ch' : '4ch',
            textAlign: 'right',
            fontSize: liteMode ? '0.75rem' : isMobile ? '0.8rem' : '0.875rem',
          }}
        >
          {displayValue.toLocaleString()}
          {item.isPercent ? '%' : ''}
        </Typography>
      </ListItem>
    );
  };

  // Render section
  const renderSection = (
    title: string,
    items: CalculatorItem[],
    category: keyof CalculatorData,
    updateFunction: (
      category: keyof CalculatorData,
      index: number,
      updates: Partial<CalculatorItem>
    ) => void
  ): React.JSX.Element => {
    if (liteMode) {
      // Lite mode: flat list with minimal section divider
      return (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: '0.8rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              mb: 1,
            }}
          >
            {title}
          </Typography>
          <List sx={{ p: 0 }}>
            {items.map((item, index) => renderItem(item, index, category, updateFunction))}
          </List>
        </Box>
      );
    }

    // Regular mode: accordion layout
    return (
      <Accordion
        defaultExpanded
        sx={{
          mb: 3,
          '&:last-child': {
            mb: 2,
          },
          '&.Mui-expanded': {
            mb: 4,
            '&:last-child': {
              mb: 3,
            },
          },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
            }}
          >
            {title}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pb: 2.5, pt: 1 }}>
          <List sx={{ p: 0 }}>
            {items.map((item, index) => renderItem(item, index, category, updateFunction))}
          </List>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <CalculatorContainer liteMode={liteMode}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: liteMode ? 1.5 : 4 }}>
          <Typography
            variant={liteMode ? 'h4' : 'h2'}
            sx={{
              fontWeight: 900,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #fff 0%, #38bdf8 50%, #00e1ff 100%)'
                  : 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #334155 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1,
              fontSize: liteMode ? '1.5rem' : undefined,
              position: 'relative',
              '&::after': liteMode
                ? {
                    content: '" — Lite"',
                    color: '#22c55e',
                    fontWeight: 800,
                    letterSpacing: '.3px',
                    fontSize: '0.8rem',
                  }
                : {},
            }}
          >
            ⚔️ ESO Calculator
          </Typography>
          <Typography
            variant={liteMode ? 'body1' : 'h5'}
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 300,
              mb: liteMode ? 1.5 : 3,
              fontSize: liteMode ? '0.9rem' : undefined,
            }}
          >
            Penetration & Critical Damage Optimizer - U47
          </Typography>
        </Box>

        {/* Main Calculator */}
        <CalculatorCard liteMode={liteMode}>
          {/* Controls */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: liteMode ? 1.5 : 3,
              flexWrap: 'wrap',
              gap: liteMode ? 0.5 : 2,
              p: 3,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: liteMode ? 1 : 2,
                flexWrap: 'wrap',
              }}
            >
              <FormControlLabel
                control={
                  <ModernSwitch
                    checked={liteMode}
                    onChange={(e) => setLiteMode(e.target.checked)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography 
                      component="span" 
                      sx={{ 
                        fontSize: '1.1rem',
                        filter: liteMode ? 'none' : 'grayscale(0.5)',
                        transition: 'filter 0.2s ease'
                      }}
                    >
                      ⚡
                    </Typography>
                    <Typography 
                      component="span" 
                      sx={{ 
                        fontSize: liteMode ? '0.8rem' : '1rem',
                        fontWeight: 600,
                        background: liteMode 
                          ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                          : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Lite Mode
                    </Typography>
                  </Box>
                }
                sx={{
                  margin: 0,
                  '& .MuiFormControlLabel-label': {
                    marginLeft: 1,
                  },
                }}
              />
              <ButtonGroup 
                size={liteMode ? 'small' : 'small'} 
                variant="outlined"
                sx={{
                  '& .MuiButton-root': {
                    borderRadius: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:not(:last-child)': {
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                    },
                    '&:not(:first-of-type)': {
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                    },
                    '&:first-of-type': {
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                    },
                    '&:last-child': {
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      borderTopRightRadius: '12px',
                      borderBottomRightRadius: '12px',
                    },
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 6px 20px rgba(56, 189, 248, 0.15)'
                        : '0 4px 16px rgba(15, 23, 42, 0.1)',
                      zIndex: 1,
                    },
                    '&.MuiButton-contained': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 4px 15px rgba(56, 189, 248, 0.25)'
                        : '0 4px 15px rgba(15, 23, 42, 0.15)',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                      },
                      '&:hover::before': {
                        opacity: 1,
                      },
                    },
                    '&.MuiButton-outlined': {
                      borderColor: theme.palette.mode === 'dark' 
                        ? 'rgba(56, 189, 248, 0.3)' 
                        : 'rgba(15, 23, 42, 0.2)',
                      backgroundColor: 'transparent',
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(56, 189, 248, 0.08)'
                          : 'rgba(15, 23, 42, 0.04)',
                      },
                    },
                  },
                }}
              >
                <Button
                  variant={gameMode === 'pve' ? 'contained' : 'outlined'}
                  onClick={() => setGameMode('pve')}
                  startIcon={<Typography fontSize={liteMode ? '0.7rem' : '1rem'}>🗡️</Typography>}
                  sx={{ fontSize: liteMode ? '0.7rem' : '0.875rem', px: liteMode ? 0.75 : 1.5 }}
                >
                  PvE
                </Button>
                <Button
                  variant={gameMode === 'pvp' ? 'contained' : 'outlined'}
                  onClick={() => setGameMode('pvp')}
                  startIcon={<Typography fontSize={liteMode ? '0.7rem' : '1rem'}>🛡️</Typography>}
                  sx={{ fontSize: liteMode ? '0.7rem' : '0.875rem', px: liteMode ? 0.75 : 1.5 }}
                >
                  PvP
                </Button>
                <Button
                  variant={gameMode === 'both' ? 'contained' : 'outlined'}
                  onClick={() => setGameMode('both')}
                  sx={{ fontSize: liteMode ? '0.7rem' : '0.875rem', px: liteMode ? 0.75 : 1.5 }}
                >
                  Both
                </Button>
              </ButtonGroup>
            </Box>
          </Box>

          {/* Tabs */}
          <Box
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: liteMode ? 1.5 : isMobile ? 2 : 3,
              px: 3,
              position: 'relative',
            }}
          >
            <Tabs
              value={selectedTab}
              onChange={(e, newValue) => setSelectedTab(newValue)}
              variant={isMobile ? 'fullWidth' : 'standard'}
              sx={{
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '2px 2px 0 0',
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #38bdf8 0%, #00e1ff 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 -2px 12px rgba(56, 189, 248, 0.4)'
                    : '0 -2px 8px rgba(15, 23, 42, 0.2)',
                },
                '& .MuiTab-root': {
                  fontSize: liteMode ? '0.8rem' : isMobile ? '0.875rem' : '0.9rem',
                  fontWeight: 600,
                  minHeight: liteMode ? 36 : isMobile ? 40 : 48,
                  textTransform: 'none',
                  borderRadius: '12px 12px 0 0',
                  margin: '0 4px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(0, 225, 255, 0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(30, 41, 59, 0.01) 100%)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                  },
                  '&:hover': {
                    color: theme.palette.mode === 'dark' ? '#38bdf8' : '#0f172a',
                    transform: 'translateY(-2px)',
                    '&::before': {
                      opacity: 1,
                    },
                  },
                  '&.Mui-selected': {
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(0, 225, 255, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(15, 23, 42, 0.08) 0%, rgba(30, 41, 59, 0.04) 100%)',
                    fontWeight: 700,
                    '&::before': {
                      opacity: 1,
                    },
                  },
                },
              }}
            >
              <Tab 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography component="span" sx={{ fontSize: '1rem' }}>🗡️</Typography>
                  <Typography component="span">Penetration</Typography>
                </Box>} 
                {...a11yProps(0)} 
              />
              <Tab 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography component="span" sx={{ fontSize: '1rem' }}>⚡</Typography>
                  <Typography component="span">Critical</Typography>
                </Box>} 
                {...a11yProps(1)} 
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ px: 3, pb: 3 }}>
            <TabPanel value={selectedTab} index={0}>
              {!liteMode && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: isMobile ? 1 : 2,
                    mb: isMobile ? 2 : 3,
                    justifyContent: isMobile ? 'center' : 'flex-start',
                    flexWrap: 'wrap',
                  }}
                >
                  <Button
                    variant="outlined"
                    size={isMobile ? 'small' : 'small'}
                    startIcon={<CheckCircleIcon sx={{ fontSize: isMobile ? 16 : 18 }} />}
                    onClick={() => toggleAllPen(true)}
                    sx={{
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      px: isMobile ? 1.5 : 2,
                      borderRadius: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderColor: theme.palette.mode === 'dark' 
                        ? 'rgba(34, 197, 94, 0.4)' 
                        : 'rgba(5, 150, 105, 0.4)',
                      color: theme.palette.mode === 'dark' ? '#22c55e' : '#059669',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                      },
                      '&:hover': {
                        borderColor: theme.palette.mode === 'dark' ? '#22c55e' : '#059669',
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(34, 197, 94, 0.08)'
                          : 'rgba(5, 150, 105, 0.04)',
                        transform: 'translateY(-2px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 6px 20px rgba(34, 197, 94, 0.15)'
                          : '0 4px 16px rgba(5, 150, 105, 0.1)',
                        '&::before': {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    {isMobile ? 'All' : 'Check All'}
                  </Button>
                  <Button
                    variant="outlined"
                    size={isMobile ? 'small' : 'small'}
                    startIcon={<ErrorIcon sx={{ fontSize: isMobile ? 16 : 18 }} />}
                    onClick={() => toggleAllPen(false)}
                    sx={{
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      px: isMobile ? 1.5 : 2,
                      borderRadius: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderColor: theme.palette.mode === 'dark' 
                        ? 'rgba(239, 68, 68, 0.4)' 
                        : 'rgba(220, 38, 38, 0.4)',
                      color: theme.palette.mode === 'dark' ? '#ef4444' : '#dc2626',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                      },
                      '&:hover': {
                        borderColor: theme.palette.mode === 'dark' ? '#ef4444' : '#dc2626',
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(239, 68, 68, 0.08)'
                          : 'rgba(220, 38, 38, 0.04)',
                        transform: 'translateY(-2px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 6px 20px rgba(239, 68, 68, 0.15)'
                          : '0 4px 16px rgba(220, 38, 38, 0.1)',
                        '&::before': {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    {isMobile ? 'None' : 'Uncheck All'}
                  </Button>
                </Box>
              )}

              {renderSection(
                'Group Buffs',
                penetrationData.groupBuffs,
                'groupBuffs',
                updatePenItem
              )}
              {renderSection('Gear & Enchantments', penetrationData.gear, 'gear', updatePenItem)}
              {renderSection(
                'Passives & Skills',
                penetrationData.passives,
                'passives',
                updatePenItem
              )}
              {renderSection('Champion Points', penetrationData.cp, 'cp', updatePenItem)}

              {/* Sentinel element for intersection observer */}
              <div
                ref={selectedTab === 0 ? sentinelRef : undefined}
                style={{ height: '1px', marginTop: '16px' }}
              />

              {selectedTab === 0 && (
                <StickyFooter isLiteMode={liteMode}>
                  <TotalSection data-testid="penetration-footer" isLiteMode={liteMode}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6" component="h3">
                        Total Penetration:
                      </Typography>
                      <Typography
                        variant="h5"
                        component="h4"
                        color="primary"
                        sx={{ fontWeight: 'bold' }}
                      >
                        {penTotal.toLocaleString()}
                      </Typography>
                    </Box>
                    <Alert
                      severity={
                        penStatus === 'at-cap'
                          ? 'success'
                          : penStatus === 'over-cap'
                            ? 'warning'
                            : 'error'
                      }
                      icon={
                        penStatus === 'at-cap' ? (
                          <CheckCircleIcon />
                        ) : penStatus === 'over-cap' ? (
                          <ErrorIcon />
                        ) : (
                          <HelpOutlineIcon />
                        )
                      }
                      sx={{ mt: 1 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {penStatus === 'at-cap'
                            ? 'Optimal Range'
                            : penStatus === 'over-cap'
                              ? 'Over Cap'
                              : 'Below Cap'}
                        </Typography>
                        <Typography variant="body2">
                          {gameMode === 'pve'
                            ? 'Optimal PvE: 18,200-18,999'
                            : gameMode === 'pvp'
                              ? 'Optimal PvP: 33,300-37,000'
                              : 'Optimal PvE: 18,200-18,999 | PvP: 33,300-37,000'}
                        </Typography>
                      </Box>
                    </Alert>
                  </TotalSection>
                </StickyFooter>
              )}
            </TabPanel>

            <TabPanel value={selectedTab} index={1}>
              {!liteMode && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: isMobile ? 1 : 2,
                    mb: isMobile ? 2 : 3,
                    justifyContent: isMobile ? 'center' : 'flex-start',
                    flexWrap: 'wrap',
                  }}
                >
                  <Button
                    variant="outlined"
                    size={isMobile ? 'small' : 'small'}
                    startIcon={<CheckCircleIcon sx={{ fontSize: isMobile ? 16 : 18 }} />}
                    onClick={() => toggleAllCrit(true)}
                    sx={{
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      px: isMobile ? 1.5 : 2,
                      borderRadius: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderColor: theme.palette.mode === 'dark' 
                        ? 'rgba(34, 197, 94, 0.4)' 
                        : 'rgba(5, 150, 105, 0.4)',
                      color: theme.palette.mode === 'dark' ? '#22c55e' : '#059669',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                      },
                      '&:hover': {
                        borderColor: theme.palette.mode === 'dark' ? '#22c55e' : '#059669',
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(34, 197, 94, 0.08)'
                          : 'rgba(5, 150, 105, 0.04)',
                        transform: 'translateY(-2px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 6px 20px rgba(34, 197, 94, 0.15)'
                          : '0 4px 16px rgba(5, 150, 105, 0.1)',
                        '&::before': {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    {isMobile ? 'All' : 'Check All'}
                  </Button>
                  <Button
                    variant="outlined"
                    size={isMobile ? 'small' : 'small'}
                    startIcon={<ErrorIcon sx={{ fontSize: isMobile ? 16 : 18 }} />}
                    onClick={() => toggleAllCrit(false)}
                    sx={{
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      px: isMobile ? 1.5 : 2,
                      borderRadius: '12px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderColor: theme.palette.mode === 'dark' 
                        ? 'rgba(239, 68, 68, 0.4)' 
                        : 'rgba(220, 38, 38, 0.4)',
                      color: theme.palette.mode === 'dark' ? '#ef4444' : '#dc2626',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                      },
                      '&:hover': {
                        borderColor: theme.palette.mode === 'dark' ? '#ef4444' : '#dc2626',
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(239, 68, 68, 0.08)'
                          : 'rgba(220, 38, 38, 0.04)',
                        transform: 'translateY(-2px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 6px 20px rgba(239, 68, 68, 0.15)'
                          : '0 4px 16px rgba(220, 38, 38, 0.1)',
                        '&::before': {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    {isMobile ? 'None' : 'Uncheck All'}
                  </Button>
                </Box>
              )}

              {renderSection(
                'Base & Group Buffs',
                criticalData.groupBuffs,
                'groupBuffs',
                updateCritItem
              )}
              {renderSection('Gear & Enchantments', criticalData.gear, 'gear', updateCritItem)}
              {renderSection(
                'Passives & Skills',
                criticalData.passives,
                'passives',
                updateCritItem
              )}
              {renderSection('Champion Points', criticalData.cp, 'cp', updateCritItem)}

              {/* Sentinel element for intersection observer */}
              <div
                ref={selectedTab === 1 ? sentinelRef : undefined}
                style={{ height: '1px', marginTop: '16px' }}
              />

              {selectedTab === 1 && (
                <StickyFooter isLiteMode={liteMode}>
                  <TotalSection data-testid="critical-footer" isLiteMode={liteMode}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6" component="h3">
                        Total Critical Damage:
                      </Typography>
                      <Typography
                        variant="h5"
                        component="h4"
                        color="primary"
                        sx={{ fontWeight: 'bold' }}
                      >
                        {critTotal}%
                      </Typography>
                    </Box>
                    <Alert
                      severity={
                        critStatus === 'at-cap'
                          ? 'success'
                          : critStatus === 'over-cap'
                            ? 'warning'
                            : 'error'
                      }
                      icon={
                        critStatus === 'at-cap' ? (
                          <CheckCircleIcon />
                        ) : critStatus === 'over-cap' ? (
                          <ErrorIcon />
                        ) : (
                          <HelpOutlineIcon />
                        )
                      }
                      sx={{ mt: 1 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {critStatus === 'at-cap'
                            ? 'Optimal Range'
                            : critStatus === 'over-cap'
                              ? 'Over Cap'
                              : 'Below Cap'}
                        </Typography>
                        <Typography variant="body2">
                          {gameMode === 'pve'
                            ? 'Optimal PvE: 125%+'
                            : gameMode === 'pvp'
                              ? 'Optimal PvP: 100%+'
                              : 'Optimal PvE: 125%+ | PvP: 100%+'}
                        </Typography>
                      </Box>
                    </Alert>
                  </TotalSection>
                </StickyFooter>
              )}
            </TabPanel>
          </Box>

          {/* Total Section - moved inside tab content */}
        </CalculatorCard>

        {/* Legend */}
        {!liteMode && (
          <Box sx={{ mt: 4, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Legend & Cap Information
            </Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '50%' }} />
                <Typography variant="body2">Optimal Range</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: 'warning.main', borderRadius: '50%' }} />
                <Typography variant="body2">Over Cap</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: 'error.main', borderRadius: '50%' }} />
                <Typography variant="body2">Below Cap</Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
              Grey italic numbers show per-stack values for stackable buffs
            </Typography>
          </Box>
        )}
      </Container>
    </CalculatorContainer>
  );
};

export { Calculator };
