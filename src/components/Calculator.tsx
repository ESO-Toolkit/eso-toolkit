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

// Mode filter configuration based on original calculator
const MODE_FILTER = {
  pve: {
    pen: [
      'Major Breach',
      'Minor Breach',
      'Roar of Alkosh',
      "Crimson Oath's Rive",
      'Tremorscale',
      'Legendary Infused Crusher Enchant',
      'Runic Sunder',
      "Velothi Ur-Mage's Amulet",
      'Armor Set Penetration Bonus',
      'Balorgh',
      'Dual Wield: Twin Blade and Blunt (Mace)',
      'Grave Lord Passive: Dismember',
      'Herald of the Tome: Splintered Secrets',
      'Light Armor Passive: Concentration',
      'Champion Point: Piercing',
      'Champion Point: Force of Nature',
    ],
    crit: [
      'Minor Force',
      'Major Force',
      'Minor Brittle',
      'Major Brittle',
      'Elemental Catalyst',
      'Armor Set Critical Damage Bonus',
      'War Machine',
      'Kinras Wrath',
      'Zaan',
      'Balorgh',
      'Perfected False God Devotion',
      'Stone Garden Torchbearer',
      'Assassination: Hemorrhage',
      'Herald of the Tome: Fated Fortune',
      'Aedric Spear: Piercing Spear',
      'Medium Armor: Dexterity',
      'Animal Companions: Advanced Species',
      'Dual Wield: Twin Blade and Blunt (Axe)',
      'Two Handed: Heavy Weapons (Battle Axe)',
      'Champion Point: Precision',
      'Champion Point: Fighting Finesse',
    ],
  },
  pvp: {
    pen: [
      'Major Breach',
      'Minor Breach',
      'Legendary Infused Crusher Enchant',
      'Runic Sunder',
      'Armor Set Penetration Bonus',
      'Balorgh',
      'Dual Wield: Twin Blade and Blunt (Mace)',
      'Grave Lord Passive: Dismember',
      'Herald of the Tome: Splintered Secrets',
      'Light Armor Passive: Concentration',
      'Champion Point: Piercing',
      'Champion Point: Force of Nature',
    ],
    crit: [
      'Minor Force',
      'Major Force',
      'Minor Brittle',
      'Major Brittle',
      'Armor Set Critical Damage Bonus',
      'Balorgh',
      'Perfected False God Devotion',
      'Stone Garden Torchbearer',
      'Assassination: Hemorrhage',
      'Herald of the Tome: Fated Fortune',
      'Aedric Spear: Piercing Spear',
      'Medium Armor: Dexterity',
      'Animal Companions: Advanced Species',
      'Dual Wield: Twin Blade and Blunt (Axe)',
      'Two Handed: Heavy Weapons (Battle Axe)',
      'Champion Point: Precision',
      'Champion Point: Fighting Finesse',
    ],
  },
};

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
  overflowX: 'hidden',
}));

const CalculatorCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'liteMode',
})<{ liteMode?: boolean }>(({ theme, liteMode }) => ({
  width: '100%',
  maxWidth: liteMode ? '100%' : '1200px',
  margin: '0 auto',
  background: liteMode
    ? 'transparent'
    : theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
  backdropFilter: liteMode ? 'none' : 'blur(20px)',
  WebkitBackdropFilter: liteMode ? 'none' : 'blur(20px)',
  borderRadius: liteMode ? 0 : 14,
  border: liteMode
    ? 'none'
    : theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.2)'
      : '1px solid rgba(203, 213, 225, 0.3)',
  boxShadow: liteMode ? 'none' : theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(0, 0, 0, 0.4)'
    : '0 8px 32px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 'auto',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  overflowX: 'hidden',
  '&:hover': !liteMode ? {
    transform: 'translateY(-2px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(0, 0, 0, 0.5)'
      : '0 12px 40px rgba(0, 0, 0, 0.15)',
  } : {},
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
  background: isLiteMode
    ? theme.palette.background.paper
    : 'transparent', // Make transparent when not in lite mode so inner container shows through
  backdropFilter: isLiteMode ? 'none' : 'blur(20px)',
  WebkitBackdropFilter: isLiteMode ? 'none' : 'blur(20px)',
  borderTop: isLiteMode
    ? 'none'
    : theme.palette.mode === 'dark'
      ? '1px solid rgba(56, 189, 248, 0.3)'
      : '1px solid rgba(203, 213, 225, 0.3)',
  borderRadius: isLiteMode ? 0 : '6px 6px 6px 6px',
  padding: isLiteMode ? theme.spacing(1.5) : theme.spacing(3),
  boxShadow: isLiteMode ? 'none' : theme.palette.mode === 'dark'
    ? '0 -8px 32px rgba(0, 0, 0, 0.4)'
    : '0 -8px 32px rgba(0, 0, 0, 0.1)',
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

// Custom styled alert component that matches the glassmorphism design
const StyledAlert = styled(Alert)(({ theme, severity, liteMode }: { theme: any; severity: 'success' | 'warning' | 'error' | 'info'; liteMode: boolean }) => ({
  borderRadius: liteMode ? 6 : 10,
  border: liteMode
    ? 'none'
    : theme.palette.mode === 'dark'
      ? severity === 'success'
        ? '1px solid rgba(34, 197, 94, 0.3)'
        : severity === 'warning'
          ? '1px solid rgba(251, 146, 60, 0.3)'
          : '1px solid rgba(239, 68, 68, 0.3)'
      : severity === 'success'
        ? '1px solid rgba(34, 197, 94, 0.2)'
        : severity === 'warning'
          ? '1px solid rgba(251, 146, 60, 0.2)'
          : '1px solid rgba(239, 68, 68, 0.2)',
  background: liteMode
    ? theme.palette.background.paper
    : theme.palette.mode === 'dark'
      ? severity === 'success'
        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)'
        : severity === 'warning'
          ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(251, 146, 60, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)'
      : severity === 'success'
        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.04) 100%)'
        : severity === 'warning'
          ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, rgba(251, 146, 60, 0.04) 100%)'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.04) 100%)',
  backdropFilter: liteMode ? 'none' : 'blur(10px)',
  '& .MuiAlert-icon': {
    color: severity === 'success'
      ? '#22c55e'
      : severity === 'warning'
        ? '#fb923c'
        : '#ef4444',
  },
  '& .MuiAlert-message': {
    fontSize: liteMode ? '0.75rem' : '0.875rem',
  },
}));

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

// Add global styles for animations
const GlobalStyles = () => (
  <style>
    {`
      @keyframes pulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 0.4; }
      }

      /* Override any 120px border radius that might be applied */
      [style*="border-radius: 120px"],
      [style*="border-radius:120px"] {
        border-radius: 6px !important;
      }

      /* Also target the specific CSS classes mentioned */
      .css-142s2u9,
      .css-r7rcg6 {
        border-radius: 6px !important;
      }

      /* General rule to catch any element with 120px border radius */
      *[style*="120px"] {
        border-radius: 6px !important;
      }

      /* Specific rules for status badges */
      .MuiBox-root[style*="border-radius"] {
        border-radius: 6px !important;
      }

      /* Target elements with warning/orange background (over cap) */
      [style*="rgba(251, 146, 60"],
      [style*="rgb(251, 146, 60"] {
        border-radius: 6px !important;
      }

      /* Super aggressive rule - target any styled box in the calculator */
      .MuiBox-root {
        border-radius: 6px !important;
      }

      /* Override for any element with border-radius that still shows 120px */
      *[style*="border-radius: 120px"],
      *[style*="border-radius:120px"] {
        border-radius: 6px !important;
      }

      /* Final catch-all for any stubborn elements */
      .css-r7rcg6,
      .css-142s2u9,
      [class*="css-"][style*="120px"] {
        border-radius: 6px !important;
      }
    `}
  </style>
);

const Calculator: React.FC = React.memo(() => {
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
    [calculateItemValue],
  );

  // Filter items based on current mode
  const getFilteredItems = useCallback((data: CalculatorData, calcType: 'pen' | 'crit') => {
    if (gameMode === 'both') {
      // Return all items when both modes are selected
      return data;
    }

    const allowedItems = MODE_FILTER[gameMode]?.[calcType] || [];
    const filteredData: CalculatorData = {
      groupBuffs: [],
      gear: [],
      passives: [],
      cp: [],
    };

    Object.keys(data).forEach((category) => {
      filteredData[category as keyof CalculatorData] = data[category as keyof CalculatorData].filter(
        (item) => allowedItems.includes(item.name),
      );
    });

    return filteredData;
  }, [gameMode]);

  // Optimized totals calculation with reduced dependencies
  const penTotal = useMemo(() => {
    const allowedItems = gameMode === 'both' ? null : MODE_FILTER[gameMode]?.['pen'] || null;
    let total = 0;

    // Pre-calculate for performance
    const items = [
      ...penetrationData.groupBuffs,
      ...penetrationData.gear,
      ...penetrationData.passives,
      ...penetrationData.cp,
    ];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.enabled && (!allowedItems || allowedItems.includes(item.name))) {
        const value = calculateItemValue(item);
        total += value;
              }
    }

        return total;
  }, [penetrationData, gameMode, calculateItemValue]);

  const critTotal = useMemo(() => {
    const allowedItems = gameMode === 'both' ? null : MODE_FILTER[gameMode]?.['crit'] || null;
    let total = 0;

    // Pre-calculate for performance
    const items = [
      ...criticalData.groupBuffs,
      ...criticalData.gear,
      ...criticalData.passives,
      ...criticalData.cp,
    ];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.enabled && (!allowedItems || allowedItems.includes(item.name))) {
        total += calculateItemValue(item);
      }
    }

    return total;
  }, [criticalData, gameMode, calculateItemValue]);

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

  // Update item handlers - optimized for performance
  const updatePenItem = useCallback(
    (category: keyof CalculatorData, index: number, updates: Partial<CalculatorItem>) => {
            setPenetrationData((prev: CalculatorData) => {
        const newCategoryItems = [...prev[category]];
        newCategoryItems[index] = { ...newCategoryItems[index], ...updates };
                return {
          ...prev,
          [category]: newCategoryItems,
        };
      });
    },
    [],
  );

  const updateCritItem = useCallback(
    (category: keyof CalculatorData, index: number, updates: Partial<CalculatorItem>) => {
      setCriticalData((prev: CalculatorData) => {
        const newCategoryItems = [...prev[category]];
        newCategoryItems[index] = { ...newCategoryItems[index], ...updates };
        return {
          ...prev,
          [category]: newCategoryItems,
        };
      });
    },
    [],
  );

  // Bulk toggle handlers
  const toggleAllPen = useCallback((enabled: boolean) => {
    setPenetrationData((prev: CalculatorData) => {
      const newData = { ...prev };

      Object.keys(newData).forEach((category) => {
        newData[category as keyof CalculatorData] = newData[category as keyof CalculatorData].map(
          (item: CalculatorItem) => (item.locked ? item : { ...item, enabled }),
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
          (item: CalculatorItem) => (item.locked ? item : { ...item, enabled }),
        );
      });
      return newData;
    });
  }, []);

  // Memoize expensive calculations and styles
  // Pre-calculate common style values to prevent recreation on every render
  const baseStyles = React.useMemo(() => ({
    enabledBg: theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.05)',
    disabledBg: theme.palette.mode === 'dark' ? 'rgba(2,6,23,0.45)' : 'rgba(248, 250, 252, 0.8)',
    enabledBorder: theme.palette.mode === 'dark' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
    disabledBorder: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(203, 213, 225, 0.3)',
    accentColor: theme.palette.mode === 'dark' ? '#38bdf8' : '#3b82f6',
    actionHover: theme.palette.action.hover,
  }), [theme.palette.mode, theme.palette.action.hover]);

  // Memoize calculator item styles with pre-calculated base values
  const getCalculatorItemStyles = React.useCallback(
    (item: CalculatorItem) => {
      const gridColumns = liteMode
        ? 'auto 36px 1fr auto'
        : isMobile
          ? 'auto 50px 1fr auto'
          : 'auto 60px 1fr auto auto';

      return {
        display: 'grid',
        gridTemplateColumns: gridColumns,
        alignItems: 'center',
        gap: liteMode ? 0.5 : 2,
        p: liteMode ? 0.5 : 1.5,
        background: item.enabled
          ? theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.08) 100%)'
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.05) 100%)'
          : theme.palette.mode === 'dark'
            ? 'rgba(15, 23, 42, 0.4)'
            : 'rgba(248, 250, 252, 0.8)',
        border: item.enabled
          ? theme.palette.mode === 'dark'
            ? '1px solid rgba(56, 189, 248, 0.3)'
            : '1px solid rgba(59, 130, 246, 0.2)'
          : theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(203, 213, 225, 0.2)',
        borderRadius: liteMode ? 6 : 10,
        mb: liteMode ? 0.5 : 1,
        cursor: item.locked ? 'not-allowed' : 'pointer',
        opacity: item.locked ? 0.7 : 1,
        transition: liteMode ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        backdropFilter: !liteMode ? 'blur(8px)' : 'none',
        '&:hover': !item.locked
          ? {
              transform: liteMode ? 'none' : 'translateY(-1px)',
              border: theme.palette.mode === 'dark'
                ? '1px solid rgba(56, 189, 248, 0.5)'
                : '1px solid rgba(59, 130, 246, 0.3)',
              boxShadow: liteMode ? 'none' : theme.palette.mode === 'dark'
                ? '0 4px 12px rgba(56, 189, 248, 0.2)'
                : '0 4px 12px rgba(59, 130, 246, 0.1)',
              '& .MuiCheckbox-root': {
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
              },
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
              width: '4px',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(180deg, #38bdf8 0%, #00e1ff 100%)'
                : 'linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '10px 0 0 10px',
            },
          }),
      };
    },
    [theme.palette.mode, liteMode, isMobile],
  );

  // Render item component - optimized to reduce re-renders
  const renderItem = React.useCallback(
    (
      item: CalculatorItem,
      index: number,
      category: keyof CalculatorData,
      updateFunction: (
        category: keyof CalculatorData,
        index: number,
        updates: Partial<CalculatorItem>,
      ) => void,
    ): React.JSX.Element => {
      const hasQuantity = item.maxQuantity && item.maxQuantity > 1;
      const key = `${category}-${index}-${item.enabled}-${item.quantity}-${hasQuantity}`;

      // Calculate display values once
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

      // Pre-calculate common styles
      const checkboxStyles = {
        '& .MuiSvgIcon-root': {
          fontSize: liteMode ? '0.9rem' : '1.2rem',
        },
        padding: liteMode ? '2px' : '4px',
      };

      const textFieldStyles = {
        width: liteMode ? 32 : isMobile ? 50 : 60,
        '& .MuiInputBase-root': {
          fontSize: liteMode ? '0.65rem' : isMobile ? '0.75rem' : '0.8rem',
          padding: liteMode ? '0 4px' : '4px 8px',
          height: liteMode ? '20px' : '32px',
          minHeight: liteMode ? '20px' : '32px',
          boxSizing: 'border-box',
        },
        '& .MuiInputBase-input': {
          padding: liteMode ? '2px 4px' : '2px 4px',
          textAlign: 'center',
          fontSize: liteMode ? '0.65rem' : '0.75rem',
          // Hide spin buttons for a cleaner look
          '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
            '-webkit-appearance': 'none',
            margin: 0,
          },
          '&[type=number]': {
            '-moz-appearance': 'textfield',
          },
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderWidth: liteMode ? '1px' : '1px',
        },
      };

      const nameStyles = {
        color: item.enabled ? 'text.primary' : 'text.disabled',
        fontSize: liteMode ? '0.7rem' : isMobile ? '0.875rem' : '0.9rem',
        lineHeight: 1.2,
      };

      const valueStyles = {
        color: '#38bdf8',
        fontWeight: 700,
        fontFamily: 'monospace',
        textShadow: theme.palette.mode === 'dark' ? '0 0 10px rgba(59,130,246,0.25)' : 'none',
        minWidth: liteMode ? '2ch' : isMobile ? '3ch' : '4ch',
        textAlign: 'right',
        fontSize: liteMode ? '0.65rem' : isMobile ? '0.8rem' : '0.875rem',
      };

      const perDisplayStyles = {
        color: theme.palette.text.secondary,
        fontStyle: 'italic',
        fontSize: isMobile ? '0.7rem' : '0.75rem',
      };

      // Handle click on the entire list item
      const handleItemClick = (e: React.MouseEvent): void => {
        // Don't toggle if clicking on interactive elements
        if (
          e.target instanceof HTMLInputElement || // TextField input
          e.target instanceof HTMLButtonElement || // IconButton
          (e.target as HTMLElement).closest('button') || // Any button
          (e.target as HTMLElement).closest('input') || // Any input
          (e.target as HTMLElement).closest('.MuiCheckbox-root') // Checkbox
        ) {
          return;
        }

        if (!item.locked) {
                    updateFunction(category, index, { enabled: !item.enabled });
        }
      };

      return (
        <ListItem
          key={key}
          sx={getCalculatorItemStyles(item)}
          onClick={handleItemClick}
          disabled={item.locked}
          button={!item.locked}
        >
          <ListItemIcon sx={{ minWidth: 'auto' }}>
            <Checkbox
              checked={item.enabled}
              disabled={item.locked}
              size="small"
              color="primary"
              disableRipple
              disableTouchRipple
              sx={checkboxStyles}
              onChange={(e) => updateFunction(category, index, { enabled: e.target.checked })}
              onClick={(e) => e.stopPropagation()} // Prevent ListItem click from also triggering
            />
          </ListItemIcon>

          <Tooltip
          title={!hasQuantity ? "This item doesn't have adjustable quantity" : (item.locked ? "This item is locked" : "")}
          placement="top"
          arrow
        >
          <TextField
            size="small"
            type="number"
            value={hasQuantity ? item.quantity : '-'}
            onChange={hasQuantity ? (e) =>
              updateFunction(category, index, {
                quantity: Math.max(
                  item.minQuantity || 0,
                  Math.min(item.maxQuantity || 100, parseInt(e.target.value) || 0),
                ),
              })
            : undefined}
            disabled={!hasQuantity || item.locked}
            placeholder={hasQuantity ? (item.quantityTitle || undefined) : 'N/A'}
            inputProps={{
              min: hasQuantity ? (item.minQuantity || 0) : 0,
              max: hasQuantity ? (item.maxQuantity || 100) : 0,
              step: hasQuantity ? (item.step || 1) : 1,
              readOnly: !hasQuantity,
            }}
            sx={{
              ...textFieldStyles,
              '& .MuiInputBase-root': {
                ...textFieldStyles['& .MuiInputBase-root'],
                backgroundColor: !hasQuantity ? (theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)') : undefined,
                opacity: !hasQuantity ? 0.6 : 1,
              },
              '& .MuiOutlinedInput-notchedOutline': {
                ...textFieldStyles['& .MuiOutlinedInput-notchedOutline'],
                borderColor: !hasQuantity ? (theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.4)') : undefined,
              },
              '& .MuiInputBase-input': {
                ...textFieldStyles['& .MuiInputBase-input'],
                color: !hasQuantity ? (theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.8)' : 'rgba(100, 116, 139, 0.8)') : undefined,
                cursor: !hasQuantity ? 'not-allowed' : 'text',
              },
            }}
            onClick={(e) => e.stopPropagation()} // Prevent ListItem click from also triggering
          />
        </Tooltip>

          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: liteMode ? 0.25 : 0.5, flex: 1 }}>
                  <Typography variant="body2" sx={nameStyles}>
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
                          p: 0.125,
                          minWidth: 'auto',
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'primary.main',
                          },
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent ListItem click from also triggering
                      >
                        <InfoIcon sx={{ fontSize: liteMode ? 10 : isMobile ? 14 : 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                {item.locked && (
                  <Chip
                    label="🔒"
                    size="small"
                    sx={{
                      height: liteMode ? 12 : isMobile ? 18 : 20,
                      fontSize: liteMode ? '0.55rem' : '0.65rem',
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    }}
                  />
                )}
              </Box>
            }
          />

          {perDisplay && !liteMode && (
            <Typography variant="caption" sx={perDisplayStyles}>
              {perDisplay}
            </Typography>
          )}

          <Typography variant="body2" sx={valueStyles}>
            {displayValue.toLocaleString()}
            {item.isPercent ? '%' : ''}
          </Typography>
        </ListItem>
      );
    },
    [getCalculatorItemStyles, liteMode, isMobile, theme.palette.mode, theme.palette.text.secondary],
  );

  // Render section
  const renderSection = (
    title: string,
    items: CalculatorItem[],
    category: keyof CalculatorData,
    updateFunction: (
      category: keyof CalculatorData,
      index: number,
      updates: Partial<CalculatorItem>,
    ) => void,
  ): React.JSX.Element => {
    if (liteMode) {
      // Lite mode: individual items rendered directly
      return (
        <>
          {items.map((item, index) => renderItem(item, index, category, updateFunction))}
        </>
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
          <List sx={{ p: 0, overflowX: 'hidden' }}>
            {items.map((item, index) => renderItem(item, index, category, updateFunction))}
          </List>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <>
      <GlobalStyles />
      <CalculatorContainer liteMode={liteMode}>
      <Container maxWidth={liteMode ? false : "lg"} sx={{ py: 2, px: liteMode ? 1 : 2, overflowX: 'hidden' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: liteMode ? 1 : 5 }}>
          <Typography
            variant={liteMode ? 'h5' : 'h1'}
            sx={{
              fontWeight: 900,
              fontFamily: 'Space Grotesk, Inter, sans-serif',
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #00e1ff 100%)'
                  : 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #334155 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: liteMode ? 0.5 : 1.5,
              fontSize: liteMode ? '1.5rem' : { xs: '2.5rem', md: '3rem' },
              letterSpacing: '-0.02em',
              textShadow: theme.palette.mode === 'dark' ? '0 0 30px rgba(56, 189, 248, 0.3)' : 'none',
              position: 'relative',
              '&::after': liteMode
                ? {
                    content: '" — Lite"',
                    color: '#22c55e',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    fontSize: '0.75rem',
                    position: 'absolute',
                    top: '8px',
                    right: '-60px',
                  }
                : {},
            }}
          >
            ⚔️ ESO Calculator
          </Typography>
          <Typography
            variant={liteMode ? 'body2' : 'h6'}
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 400,
              mb: liteMode ? 0.5 : 3,
              fontSize: liteMode ? '0.8rem' : { xs: '1rem', md: '1.2rem' },
              letterSpacing: '0.02em',
              opacity: 0.9,
            }}
          >
            Penetration & Critical Damage Optimizer — U47
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
              mb: liteMode ? 1 : 4,
              flexWrap: 'wrap',
              gap: liteMode ? 1 : 3,
              p: liteMode ? 2 : 4,
              borderBottom: liteMode ? 'none' : '1px solid',
              borderColor: liteMode ? 'transparent' : theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(203, 213, 225, 0.3)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: liteMode ? 1.5 : 3,
                flexWrap: 'wrap',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={liteMode}
                    onChange={(e) => setLiteMode(e.target.checked)}
                    size={liteMode ? 'small' : 'medium'}
                    sx={{
                      '& .MuiSwitch-switchBase': {
                        '&.Mui-checked': {
                          color: '#22c55e',
                        },
                        '&.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: 'rgba(34, 197, 94, 0.3)',
                        },
                      },
                      '& .MuiSwitch-track': {
                        borderRadius: '12px',
                      },
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: liteMode ? '0.85rem' : '1rem', fontWeight: 600 }}>
                      ⚡
                    </Typography>
                    <Typography sx={{ fontSize: liteMode ? '0.85rem' : '1rem', fontWeight: 500 }}>
                      Lite Mode
                    </Typography>
                  </Box>
                }
              />
              <ButtonGroup
                size={liteMode ? 'small' : 'medium'}
                variant="outlined"
                sx={{
                  '& .MuiButton-root': {
                    border: liteMode
                      ? '1px solid rgba(56, 189, 248, 0.3)'
                      : theme.palette.mode === 'dark'
                        ? '1px solid rgba(56, 189, 248, 0.3)'
                        : '1px solid rgba(203, 213, 225, 0.3)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      borderColor: '#38bdf8',
                    },
                  },
                }}
              >
                <Button
                  variant={gameMode === 'pve' ? 'contained' : 'outlined'}
                  onClick={() => setGameMode('pve')}
                  startIcon={<Typography fontSize={liteMode ? '0.8rem' : '1rem'}>🗡️</Typography>}
                  sx={{
                    fontSize: liteMode ? '0.8rem' : '0.9rem',
                    px: liteMode ? 1 : 1.5,
                    background: gameMode === 'pve'
                      ? theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(0, 225, 255, 0.3) 100%)'
                        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)'
                      : 'transparent',
                    borderColor: gameMode === 'pve' ? '#38bdf8' : undefined,
                  }}
                >
                  PvE
                </Button>
                <Button
                  variant={gameMode === 'pvp' ? 'contained' : 'outlined'}
                  onClick={() => setGameMode('pvp')}
                  startIcon={<Typography fontSize={liteMode ? '0.8rem' : '1rem'}>🛡️</Typography>}
                  sx={{
                    fontSize: liteMode ? '0.8rem' : '0.9rem',
                    px: liteMode ? 1 : 1.5,
                    background: gameMode === 'pvp'
                      ? theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(0, 225, 255, 0.3) 100%)'
                        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)'
                      : 'transparent',
                    borderColor: gameMode === 'pvp' ? '#38bdf8' : undefined,
                  }}
                >
                  PvP
                </Button>
                <Button
                  variant={gameMode === 'both' ? 'contained' : 'outlined'}
                  onClick={() => setGameMode('both')}
                  sx={{
                    fontSize: liteMode ? '0.8rem' : '0.9rem',
                    px: liteMode ? 1 : 1.5,
                    background: gameMode === 'both'
                      ? theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(0, 225, 255, 0.3) 100%)'
                        : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)'
                      : 'transparent',
                    borderColor: gameMode === 'both' ? '#38bdf8' : undefined,
                  }}
                >
                  Both
                </Button>
              </ButtonGroup>
            </Box>
          </Box>

          {/* Tabs */}
          <Box
            sx={{
              mb: liteMode ? 1 : isMobile ? 3 : 4,
              px: liteMode ? 2 : 4,
            }}
          >
            <Tabs
              value={selectedTab}
              onChange={(e, newValue) => setSelectedTab(newValue)}
              variant={isMobile ? 'fullWidth' : 'standard'}
              sx={{
                '& .MuiTab-root': {
                  fontSize: liteMode ? '0.85rem' : isMobile ? '0.9rem' : '1rem',
                  fontWeight: 600,
                  minHeight: liteMode ? 36 : isMobile ? 44 : 52,
                  padding: liteMode ? '8px 16px' : '12px 20px',
                  borderRadius: '8px 8px 0 0',
                  color: theme.palette.text.secondary,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    color: theme.palette.primary.main,
                    background: theme.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.05)'
                      : 'rgba(59, 130, 246, 0.05)',
                  },
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.1) 0%, rgba(0, 225, 255, 0.05) 100%)'
                      : 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#38bdf8',
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
              }}
            >
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography>🎯</Typography>
                    <Typography>Penetration</Typography>
                  </Box>
                }
                {...a11yProps(0)}
              />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography>⚡</Typography>
                    <Typography>Critical</Typography>
                  </Box>
                }
                {...a11yProps(1)}
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ px: liteMode ? 1.5 : 3, pb: 3 }}>
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
                    }}
                  >
                    {isMobile ? 'None' : 'Uncheck All'}
                  </Button>
                </Box>
              )}

              {(() => {
                const filteredPenData = getFilteredItems(penetrationData, 'pen');
                return liteMode ? (
                  // Lite mode: render all penetration items in a single flattened list
                  <List sx={{ p: 0, overflowX: 'hidden' }}>
                    {Object.values(filteredPenData).flatMap((items, categoryIndex) =>
                      items.map((item, itemIndex) =>
                        renderItem(
                          item,
                          itemIndex,
                          Object.keys(filteredPenData)[categoryIndex] as keyof CalculatorData,
                          updatePenItem,
                        ),
                      ),
                    )}
                  </List>
                ) : (
                  <>
                    {renderSection(
                      'Group Buffs',
                      filteredPenData.groupBuffs,
                      'groupBuffs',
                      updatePenItem,
                    )}
                    {renderSection('Gear & Enchantments', filteredPenData.gear, 'gear', updatePenItem)}
                    {renderSection(
                      'Passives & Skills',
                      filteredPenData.passives,
                      'passives',
                      updatePenItem,
                    )}
                    {renderSection('Champion Points', filteredPenData.cp, 'cp', updatePenItem)}
                  </>
                );
              })()}

              {/* Sentinel element for intersection observer */}
              <div
                ref={selectedTab === 0 ? sentinelRef : undefined}
                style={{ height: '1px', marginTop: '16px' }}
              />

              {selectedTab === 0 && (
                <StickyFooter isLiteMode={liteMode}
                  sx={{
                    position: 'relative',
                    p: liteMode ? 2 : 3,
                    borderRadius: liteMode ? 8 : 12,
                    background: liteMode
                      ? theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.8) 100%)'
                      : theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
                    border: liteMode
                      ? `1px solid ${penStatus === 'at-cap'
                          ? 'rgba(34, 197, 94, 0.2)'
                          : penStatus === 'over-cap'
                            ? 'rgba(251, 146, 60, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)'}`
                      : `1px solid ${theme.palette.mode === 'dark' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'}`,
                    boxShadow: liteMode
                      ? `0 4px 12px ${penStatus === 'at-cap'
                          ? 'rgba(34, 197, 94, 0.1)'
                          : penStatus === 'over-cap'
                            ? 'rgba(251, 146, 60, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)'}`
                      : theme.palette.mode === 'dark'
                        ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                        : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    backdropFilter: liteMode ? 'blur(10px)' : 'blur(20px)',
                    WebkitBackdropFilter: liteMode ? 'blur(10px)' : 'blur(20px)',
                    transition: 'all 0.3s ease',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: liteMode ? 2 : 3,
                      background: penStatus === 'at-cap'
                        ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                        : penStatus === 'over-cap'
                          ? 'linear-gradient(90deg, #fb923c, #f97316)'
                          : 'linear-gradient(90deg, #ef4444, #dc2626)',
                      borderRadius: liteMode ? 0 : '3px 3px 0 0',
                    },
                  }}
                >
  
                  {/* Clean, simple layout */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: { xs: 2, sm: 3 },
                    justifyContent: 'space-between',
                  }}>
                    {/* Left - Value */}
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: theme.palette.text.secondary,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' },
                          opacity: 0.8,
                          mb: 0.25,
                        }}
                      >
                        Total Penetration
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: '1.5rem', sm: '1.8rem' },
                          color: theme.palette.mode === 'dark' ? '#f1f5f9' : '#0f172a',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        {penTotal.toLocaleString()}
                      </Typography>
                    </Box>

                    {/* Right - Status and Info */}
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: { xs: 'flex-start', sm: 'flex-end' },
                      gap: 1,
                      textAlign: { xs: 'left', sm: 'right' },
                      minWidth: { xs: 'auto', sm: '200px' },
                    }}>
                      <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        borderRadius: '8px',
                        background: penStatus === 'at-cap' ?
                          theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)' :
                          penStatus === 'over-cap' ?
                            theme.palette.mode === 'dark' ? 'rgba(251, 146, 60, 0.15)' : 'rgba(251, 146, 60, 0.1)' :
                            theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${penStatus === 'at-cap' ?
                          theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)' :
                          penStatus === 'over-cap' ?
                            theme.palette.mode === 'dark' ? 'rgba(251, 146, 60, 0.3)' : 'rgba(251, 146, 60, 0.2)' :
                            theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
                      }}>
                        {penStatus === 'at-cap' && (
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} />
                        )}
                        {penStatus === 'over-cap' && (
                          <ErrorIcon sx={{ fontSize: 16, color: '#fb923c' }} />
                        )}
                        {penStatus === 'under-cap' && (
                          <HelpOutlineIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: penStatus === 'at-cap' ? '#22c55e' :
                                    penStatus === 'over-cap' ? '#fb923c' : '#ef4444',
                          }}
                        >
                          {penStatus === 'at-cap' ? 'Optimal' :
                           penStatus === 'over-cap' ? 'Over Cap' : 'Below Cap'}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.75rem',
                          color: theme.palette.text.secondary,
                          opacity: 0.7,
                        }}
                      >
                        {gameMode === 'pve'
                          ? 'Target: 18,200-18,999'
                          : gameMode === 'pvp'
                            ? 'Target: 33,300-37,000'
                            : 'PvE: 18.2K-19K | PvP: 33.3K-37K'}
                      </Typography>
                    </Box>
                  </Box>
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
                    }}
                  >
                    {isMobile ? 'None' : 'Uncheck All'}
                  </Button>
                </Box>
              )}

              {(() => {
                const filteredCritData = getFilteredItems(criticalData, 'crit');
                return liteMode ? (
                  // Lite mode: render all critical items in a single flattened list
                  <List sx={{ p: 0, overflowX: 'hidden' }}>
                    {Object.values(filteredCritData).flatMap((items, categoryIndex) =>
                      items.map((item, itemIndex) =>
                        renderItem(
                          item,
                          itemIndex,
                          Object.keys(filteredCritData)[categoryIndex] as keyof CalculatorData,
                          updateCritItem,
                        ),
                      ),
                    )}
                  </List>
                ) : (
                  <>
                    {renderSection(
                      'Base & Group Buffs',
                      filteredCritData.groupBuffs,
                      'groupBuffs',
                      updateCritItem,
                    )}
                    {renderSection('Gear & Enchantments', filteredCritData.gear, 'gear', updateCritItem)}
                    {renderSection(
                      'Passives & Skills',
                      filteredCritData.passives,
                      'passives',
                      updateCritItem,
                    )}
                    {renderSection('Champion Points', filteredCritData.cp, 'cp', updateCritItem)}
                  </>
                );
              })()}

              {/* Sentinel element for intersection observer */}
              <div
                ref={selectedTab === 1 ? sentinelRef : undefined}
                style={{ height: '1px', marginTop: '16px' }}
              />

              {selectedTab === 1 && (
                <StickyFooter isLiteMode={liteMode}
                  sx={{
                    position: 'relative',
                    p: liteMode ? 2 : 3,
                    borderRadius: liteMode ? 8 : 12,
                    background: liteMode
                      ? theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.8) 100%)'
                      : theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
                    border: liteMode
                      ? `1px solid ${critStatus === 'at-cap'
                          ? 'rgba(34, 197, 94, 0.2)'
                          : critStatus === 'over-cap'
                            ? 'rgba(251, 146, 60, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)'}`
                      : `1px solid ${theme.palette.mode === 'dark' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'}`,
                    boxShadow: liteMode
                      ? `0 4px 12px ${critStatus === 'at-cap'
                          ? 'rgba(34, 197, 94, 0.1)'
                          : critStatus === 'over-cap'
                            ? 'rgba(251, 146, 60, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)'}`
                      : theme.palette.mode === 'dark'
                        ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                        : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    backdropFilter: liteMode ? 'blur(10px)' : 'blur(20px)',
                    WebkitBackdropFilter: liteMode ? 'blur(10px)' : 'blur(20px)',
                    transition: 'all 0.3s ease',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: liteMode ? 2 : 3,
                      background: critStatus === 'at-cap'
                        ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                        : critStatus === 'over-cap'
                          ? 'linear-gradient(90deg, #fb923c, #f97316)'
                          : 'linear-gradient(90deg, #ef4444, #dc2626)',
                      borderRadius: liteMode ? 0 : '3px 3px 0 0',
                    },
                  }}
                >
    
                  {/* Clean, simple layout */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: { xs: 2, sm: 3 },
                    justifyContent: 'space-between',
                  }}>
                    {/* Left - Value */}
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: theme.palette.text.secondary,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' },
                          opacity: 0.8,
                          mb: 0.25,
                        }}
                      >
                        Total Critical Damage
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: '1.5rem', sm: '1.8rem' },
                          color: theme.palette.mode === 'dark' ? '#f1f5f9' : '#0f172a',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        {critTotal}%
                      </Typography>
                    </Box>

                    {/* Right - Status and Info */}
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: { xs: 'flex-start', sm: 'flex-end' },
                      gap: 1,
                      textAlign: { xs: 'left', sm: 'right' },
                      minWidth: { xs: 'auto', sm: '200px' },
                    }}>
                      <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        borderRadius: '8px',
                        background: critStatus === 'at-cap' ?
                          theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)' :
                          critStatus === 'over-cap' ?
                            theme.palette.mode === 'dark' ? 'rgba(251, 146, 60, 0.15)' : 'rgba(251, 146, 60, 0.1)' :
                            theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${critStatus === 'at-cap' ?
                          theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)' :
                          critStatus === 'over-cap' ?
                            theme.palette.mode === 'dark' ? 'rgba(251, 146, 60, 0.3)' : 'rgba(251, 146, 60, 0.2)' :
                            theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
                      }}>
                        {critStatus === 'at-cap' && (
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} />
                        )}
                        {critStatus === 'over-cap' && (
                          <ErrorIcon sx={{ fontSize: 16, color: '#fb923c' }} />
                        )}
                        {critStatus === 'under-cap' && (
                          <HelpOutlineIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: critStatus === 'at-cap' ? '#22c55e' :
                                    critStatus === 'over-cap' ? '#fb923c' : '#ef4444',
                          }}
                        >
                          {critStatus === 'at-cap' ? 'Optimal' :
                           critStatus === 'over-cap' ? 'Over Cap' : 'Below Cap'}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.75rem',
                          color: theme.palette.text.secondary,
                          opacity: 0.7,
                        }}
                      >
                        {gameMode === 'pve'
                          ? 'Target: 125%+'
                          : gameMode === 'pvp'
                            ? 'Target: 100%+'
                            : 'PvE: 125%+ | PvP: 100%+'}
                      </Typography>
                    </Box>
                  </Box>
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
    </>
  );
});

export { Calculator };
