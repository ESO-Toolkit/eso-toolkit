import React from 'react';

import { buildTooltipPropsFromAbilityId } from '../../utils/skillTooltipMapper';
import { LazySkillTooltip as SkillTooltip } from '../LazySkillTooltip';
import type { SkillTooltipProps } from '../SkillTooltip';

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
        iconSlug="ability_arcanist_005_a"
        stats={[]}
      />
    );
  }

  // Filter out any unknown props that might cause DOM element warnings
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    itemCount,
    ...filteredProps
  } = props as SkillTooltipProps & { itemCount?: unknown };

  return <SkillTooltip {...filteredProps} />;
};
