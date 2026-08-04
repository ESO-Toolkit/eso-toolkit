import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TraitChipRow } from '../TraitChipRow';
import type { ClusterTrait, FeatureGroupKey } from '../../types/clustering.types';

const theme = createTheme();

function trait(group: FeatureGroupKey, id: number, label: string, share: number): ClusterTrait {
  return { group, id, label, share };
}

function renderRow(group: FeatureGroupKey, core: ClusterTrait[], flex: ClusterTrait[] = []) {
  return render(
    <ThemeProvider theme={theme}>
      <TraitChipRow title="Row" group={group} core={core} flex={flex} />
    </ThemeProvider>,
  );
}

describe('TraitChipRow tooltip wording', () => {
  /**
   * A build wears BOTH of its five-piece sets at once, so listing the other as an
   * "alternative" implies a swap that does not exist.
   */
  it('describes co-occurring traits as included, not as alternatives', () => {
    renderRow(
      'fivePieceSets',
      [trait('fivePieceSets', 1, 'Deadly Strike', 1)],
      [trait('fivePieceSets', 2, 'Coral Riptide', 0.6)],
    );

    const chip = screen.getByTestId('trait-fivePieceSets-1');
    const tip =
      chip.getAttribute('aria-label') ?? chip.closest('[title]')?.getAttribute('title') ?? '';
    expect(tip).toMatch(/includes/i);
    expect(tip).toMatch(/also seen here/i);
    expect(tip).not.toMatch(/alternatives/i);
  });

  /** A monster set really is either/or, so "Alternatives" is accurate there. */
  it('describes single-slot traits as alternatives', () => {
    renderRow(
      'monsterSet',
      [trait('monsterSet', 350, 'Zaan', 0.8)],
      [trait('monsterSet', 270, 'Slimecraw', 0.2)],
    );

    const chip = screen.getByTestId('trait-monsterSet-350');
    const tip =
      chip.getAttribute('aria-label') ?? chip.closest('[title]')?.getAttribute('title') ?? '';
    expect(tip).toMatch(/runs/i);
    expect(tip).toMatch(/alternatives/i);
    expect(tip).not.toMatch(/also seen here/i);
  });

  it('omits the sibling clause when a trait stands alone', () => {
    renderRow('mythic', [trait('mythic', 694, "Velothi Ur-Mage's Amulet", 1)]);

    const chip = screen.getByTestId('trait-mythic-694');
    const tip =
      chip.getAttribute('aria-label') ?? chip.closest('[title]')?.getAttribute('title') ?? '';
    expect(tip).toMatch(/100% of this build runs/i);
    expect(tip).not.toMatch(/alternatives|also seen here/i);
  });

  it('renders nothing when the group has no traits', () => {
    const { container } = renderRow('food', []);
    expect(container).toBeEmptyDOMElement();
  });
});
