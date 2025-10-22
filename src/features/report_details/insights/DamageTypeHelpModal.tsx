import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  List,
  ListItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import React from 'react';

interface DamageTypeHelpModalProps {
  open: boolean;
  onClose: () => void;
}

// AOE Ability IDs and names (from DamageTypeBreakdownPanel.tsx)
// IMPORTANT: This list matches the AOE_ABILITY_IDS in DamageTypeBreakdownPanel.tsx
const AOE_ABILITIES = [
  { id: 126633, name: 'Elemental Ring' },
  { id: 75752, name: 'Roar of Alkosh' },
  { id: 133494, name: 'Elemental Storm' },
  { id: 227072, name: 'Elemental Storm Tick' },
  { id: 172672, name: 'Elemental Susceptibility' },
  { id: 102136, name: 'Wall of Elements' },
  { id: 183123, name: 'Destructive Reach' },
  { id: 186370, name: 'Destructive Clench' },
  { id: 189869, name: 'Frost Reach' },
  { id: 185407, name: 'Flame Reach' },
  { id: 191078, name: 'Shock Reach' },
  { id: 183006, name: "Cephaliarch's Flail" },
  { id: 32711, name: 'Volley' },
  { id: 32714, name: 'Endless Hail' },
  { id: 32948, name: 'Arrow Barrage' },
  { id: 20252, name: 'Caltrops' },
  { id: 20930, name: 'Razor Caltrops' },
  { id: 98438, name: 'Anti-Cavalry Caltrops' },
  { id: 32792, name: 'Trap Beast' },
  { id: 32794, name: 'Rearming Trap' },
  { id: 115572, name: 'Lightweight Beast Trap' },
  { id: 117809, name: 'Barbed Trap' },
  { id: 117854, name: 'Cutting Dive' },
  { id: 117715, name: 'Screaming Cliff Racer' },
  { id: 118011, name: 'Dive' },
  { id: 123082, name: 'Growing Swarm' },
  { id: 118766, name: 'Fetcher Infection' },
  { id: 122392, name: 'Infectious Claws' },
  { id: 118314, name: 'Scorch' },
  { id: 143944, name: 'Subterranean Assault' },
  { id: 143946, name: 'Deep Fissure' },
  { id: 118720, name: 'Eruption' },
  { id: 23202, name: 'Liquid Lightning' },
  { id: 23667, name: 'Elemental Ring 2' },
  { id: 29809, name: 'Pulsar' },
  { id: 29806, name: 'Elemental Drain 2' },
  { id: 23232, name: 'Hurricane' },
  { id: 23214, name: 'Crushing Shock' },
  { id: 23196, name: 'Force Shock' },
  { id: 23208, name: 'Destructive Touch' },
  { id: 24329, name: 'Destructive Clench 2' },
  { id: 77186, name: 'Destructive Reach 2' },
  { id: 94424, name: 'Elemental Storm 2' },
  { id: 181331, name: 'Elemental Rage' },
  { id: 88802, name: 'Eye of the Storm' },
  { id: 100218, name: 'Elemental Storm 3' },
  { id: 26869, name: 'Wall of Fire' },
  { id: 80172, name: 'Blockade of Fire' },
  { id: 26794, name: 'Unstable Wall of Fire' },
  { id: 44432, name: 'Engulfing Flames Skill' },
  { id: 26879, name: 'Wall of Frost' },
  { id: 26871, name: 'Unstable Wall of Frost' },
  { id: 108936, name: 'Blockade of Frost' },
  { id: 62912, name: "Winter's Revenge" },
  { id: 62951, name: 'Glacial Presence' },
  { id: 62990, name: 'Icy Escape' },
  { id: 85127, name: 'Frozen Gate' },
  { id: 40267, name: 'Wall of Storms' },
  { id: 40252, name: 'Unstable Wall of Storms' },
  { id: 61502, name: 'Blockade of Storms' },
  { id: 62547, name: 'Deadly Cloak' },
  { id: 62529, name: 'Quick Cloak' },
  { id: 38891, name: 'Whirling Blades' },
  { id: 38792, name: 'Lightning Flood' },
  { id: 126474, name: 'Lightning Splash' },
  { id: 38745, name: 'Blazing Spear' },
  { id: 42029, name: 'Spear Shards' },
  { id: 85432, name: 'Luminous Shards' },
  { id: 41990, name: 'Solar Barrage' },
  { id: 80107, name: 'Solar Disturbance' },
  { id: 126720, name: 'Dark Flare' },
  { id: 41839, name: 'Nova' },
  { id: 217348, name: 'Solar Prison' },
  { id: 217459, name: 'Solar Disturbance 2' },
  { id: 222678, name: 'Supernova' },
  { id: 40161, name: 'Necrotic Orb' },
  { id: 38690, name: 'Mystic Orb' },
  { id: 63474, name: 'Energy Orb' },
  { id: 63471, name: 'Healing Combustion' },
  { id: 40469, name: 'Scalding Rune' },
  { id: 215779, name: 'Volcanic Rune' },
];

// Status Effect Ability IDs
const STATUS_EFFECT_ABILITIES = [
  { id: 18084, name: 'Burning' },
  { id: 95136, name: 'Chilled' },
  { id: 95134, name: 'Concussed' },
  { id: 178127, name: 'Poisoned' },
  { id: 148801, name: 'Diseased' },
  { id: 178118, name: 'Hemorrhaging' },
  { id: 21929, name: 'Overcharged' },
  { id: 178123, name: 'Sundered' },
];

/**
 * Help modal explaining damage type calculations
 */
export const DamageTypeHelpModal: React.FC<DamageTypeHelpModalProps> = ({ open, onClose }) => {
  const handleClose = (): void => {
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleClose();
    }
  };

  const damageTypeExplanations = [
    {
      name: 'Magic',
      icon: '✨',
      color: '#6366F1',
      description:
        'Combines all magical damage types including Magic, Fire, Frost, and Shock damage flags.',
      calculation:
        'Sum of damage events with Magic (64), Fire (4), Frost (16), or Shock (512) flags',
      hasAbilityList: false,
    },
    {
      name: 'Martial',
      icon: '⚔️',
      color: '#8B5A2B',
      description: 'Combines physical damage types including Physical, Bleed, Poison, and Disease.',
      calculation:
        'Sum of damage events with Physical (1), Bleed (2), Poison (8), or Disease (256) flags',
      hasAbilityList: false,
    },
    {
      name: 'Direct',
      icon: '🎯',
      color: '#F59E0B',
      description:
        'Instant damage from abilities that hit immediately, excluding damage over time effects.',
      calculation:
        'Damage events from abilities where tick=false (direct hits, not periodic ticks)',
      hasAbilityList: false,
    },
    {
      name: 'Damage over Time',
      icon: '🔄',
      color: '#EF4444',
      description: 'Damage that applies over multiple ticks, such as bleeds and burning effects.',
      calculation:
        'Damage events where tick=true (periodic damage from any ability with over-time effects)',
      hasAbilityList: false,
      note: 'Based on event tick flag, not specific ability IDs',
    },
    {
      name: 'Area of Effect',
      icon: '💥',
      color: '#8B5CF6',
      description: 'Damage that hits multiple targets in an area.',
      calculation: `Damage from ${AOE_ABILITIES.length} classified AOE abilities`,
      hasAbilityList: true,
      abilities: AOE_ABILITIES,
    },
    {
      name: 'Status Effects',
      icon: '🌟',
      color: '#EC4899',
      description: 'Damage from status effects like Burning, Chilled, Concussed, Poisoned, etc.',
      calculation: `Damage from ${STATUS_EFFECT_ABILITIES.length} status effect abilities`,
      hasAbilityList: true,
      abilities: STATUS_EFFECT_ABILITIES,
    },
    {
      name: 'Fire',
      icon: '🔥',
      color: '#EF4444',
      description: 'Damage with the Fire damage type flag.',
      calculation: 'Damage events with Fire (4) flag set',
      hasAbilityList: false,
    },
    {
      name: 'Poison',
      icon: '☠️',
      color: '#10B981',
      description: 'Damage with the Poison damage type flag.',
      calculation: 'Damage events with Poison (8) or Disease (256) flags',
      hasAbilityList: false,
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      onKeyDown={handleKeyDown}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      PaperProps={{
        component: 'div',
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="span">
            Damage Type Calculations
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            This panel categorizes damage into different types based on damage flags, ability
            classifications, and game mechanics. Some abilities may contribute to multiple
            categories.
          </Typography>

          <List disablePadding>
            {damageTypeExplanations.map((type, idx) => (
              <ListItem
                key={idx}
                sx={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  borderRadius: 2,
                  mb: 2,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  border: '1px solid',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  p: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, width: '100%' }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: type.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                    }}
                  >
                    {type.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {type.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {type.description}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ width: '100%', mt: 1 }}>
                  <Chip
                    label="Calculation Method"
                    size="small"
                    sx={{
                      mb: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(59, 130, 246, 0.1)',
                      color: (theme) => (theme.palette.mode === 'dark' ? '#60a5fa' : '#2563eb'),
                      fontWeight: 600,
                    }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      fontFamily: 'monospace',
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                      p: 1.5,
                      borderRadius: 1,
                      lineHeight: 1.5,
                    }}
                  >
                    {type.calculation}
                  </Typography>
                  {type.note && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        mt: 1,
                        fontStyle: 'italic',
                      }}
                    >
                      Note: {type.note}
                    </Typography>
                  )}
                </Box>

                {/* Expandable ability list */}
                {type.hasAbilityList && type.abilities && type.abilities.length > 0 && (
                  <Box sx={{ width: '100%', mt: 2 }}>
                    <Accordion
                      sx={{
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                        boxShadow: 'none',
                        '&:before': { display: 'none' },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          minHeight: 40,
                          '&.Mui-expanded': { minHeight: 40 },
                          '& .MuiAccordionSummary-content': {
                            my: 1,
                          },
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          View all {type.abilities.length} abilities
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 1 }}>
                        <Box
                          sx={{
                            maxHeight: 200,
                            overflowY: 'auto',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 0.5,
                          }}
                        >
                          {type.abilities.map((ability) => (
                            <Typography
                              key={ability.id}
                              variant="caption"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.7rem',
                                color: 'text.secondary',
                                p: 0.5,
                                borderRadius: 0.5,
                                bgcolor: (theme) =>
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.03)',
                              }}
                            >
                              {ability.name} ({ability.id})
                            </Typography>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )}
              </ListItem>
            ))}
          </List>

          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(59, 130, 246, 0.1)'
                  : 'rgba(59, 130, 246, 0.05)',
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(59, 130, 246, 0.3)'
                  : 'rgba(59, 130, 246, 0.2)',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Important Notes:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Damage types are <strong>not mutually exclusive</strong> - a single damage event can
                count toward multiple categories
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                For example, a Fire AOE DOT ability contributes to Magic, Fire, AOE, and DOT
                categories
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                The total across all categories may exceed the overall damage total due to this
                overlap
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Only damage from <strong>friendly players</strong> is included in these calculations
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="primary" variant="contained" type="button">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};
