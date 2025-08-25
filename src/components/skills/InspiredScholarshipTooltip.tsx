import { Box } from '@mui/material';
import React from 'react';

import { arcanistData } from '../../data/skillsets/arcanist';
import { mapSkillToTooltipProps } from '../../utils/skillTooltipMapper';
import SkillTooltip from '../SkillTooltip';

const InspiredScholarshipTooltip: React.FC = () => {
  const base = arcanistData.skillLines.heraldOfTheTome.activeAbilities.tomeBearersInspiration;
  const morph = base.morphs.inspiredScholarship;
  const props = mapSkillToTooltipProps({
    className: arcanistData.class,
    skillLineName: arcanistData.skillLines.heraldOfTheTome.name,
    node: {
      ...morph,
      // Compose a richer description using the data values
      description: (
        <>
          Etch a series of runes onto your weapon that pulse with power once every{' '}
          {morph.pulseInterval}. Each pulse enhances your class abilities, and striking an enemy
          with one deals an additional{' '}
          <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
            {morph.pulseDamage}
          </Box>{' '}
          and generates Crux if you have none.
          <br />
          <br />
          While slotted on either ability bar, gain{' '}
          <Box component="span" sx={{ color: 'secondary.main', fontWeight: 700 }}>
            Major Brutality
          </Box>{' '}
          and{' '}
          <Box component="span" sx={{ color: 'secondary.main', fontWeight: 700 }}>
            Major Sorcery
          </Box>
          , increasing your Weapon and Spell Damage by{' '}
          <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
            20%
          </Box>
          .
        </>
      ),
    },
    inheritFrom: base,
    morphOfName: base.name,
    // Known ESO Logs id for this morph; for other skills, pass abilityId/iconSlug if available
    abilityId: 185842,
  });

  return <SkillTooltip {...props} />;
};

export default InspiredScholarshipTooltip;
