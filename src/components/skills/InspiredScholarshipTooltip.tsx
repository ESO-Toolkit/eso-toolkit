import React from 'react';

import { buildTooltipPropsFromAbilityId } from '../../utils/skillTooltipMapper';
import { LazySkillTooltip as SkillTooltip } from '../LazySkillTooltip';

export const InspiredScholarshipTooltip: React.FC = () => {
  // Use the new ID-based system
  const props = buildTooltipPropsFromAbilityId(185842);

  if (!props) {
    // Fallback if the ability isn't found
    return (
      <SkillTooltip
        name="Inspired Scholarship"
        description="Inspired Scholarship (ID: 185842)"
        lineText="Arcanist — Herald of the Tome"
        stats={[]}
      />
    );
  }

  return <SkillTooltip {...props} />;
};
