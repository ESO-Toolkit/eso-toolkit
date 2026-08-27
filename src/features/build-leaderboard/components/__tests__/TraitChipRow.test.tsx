import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { ClusterTrait, FeatureGroupKey } from '../../types/clustering.types';
import { TraitChipRow } from '../TraitChipRow';

const theme = createTheme();

function trait(group: FeatureGroupKey, id: number, label: string, share: number): ClusterTrait {
  return { group, id, label, share };
}

function renderRow(
  group: FeatureGroupKey,
  core: ClusterTrait[],
  flex: ClusterTrait[] = [],
  variations: ClusterTrait[] = [],
) {
  return render(
    <ThemeProvider theme={theme}>
      <TraitChipRow title="Row" group={group} core={core} flex={flex} variations={variations} />
    </ThemeProvider>,
  );
}

/**
 * Open the tooltip and read what the user actually sees.
 *
 * Deliberately not read off `aria-label`. That attribute is MUI's own doing, so
 * asserting on it tests the library rather than our wording — and if MUI ever
 * stops setting it, a `?? ''` fallback would turn every `not.toMatch` here into
 * a test that passes without checking anything.
 */
async function tooltipTextFor(testId: string): Promise<string> {
  await userEvent.hover(screen.getByTestId(testId));
  const tip = await screen.findByRole('tooltip');
  return tip.textContent ?? '';
}

describe('TraitChipRow tooltip wording', () => {
  /**
   * A build wears BOTH of its five-piece sets at once, so listing the other as an
   * "alternative" implies a swap that does not exist.
   */
  it('describes co-occurring traits as included, not as alternatives', async () => {
    renderRow(
      'fivePieceSets',
      [trait('fivePieceSets', 1, 'Deadly Strike', 1)],
      [trait('fivePieceSets', 2, 'Coral Riptide', 0.6)],
    );

    const tip = await tooltipTextFor('trait-fivePieceSets-1');
    expect(tip).toMatch(/includes/i);
    expect(tip).toMatch(/also seen here/i);
    expect(tip).not.toMatch(/alternatives/i);
  });

  /** A monster set really is either/or, so "Alternatives" is accurate there. */
  it('describes single-slot traits as alternatives', async () => {
    renderRow(
      'monsterSet',
      [trait('monsterSet', 350, 'Zaan', 0.8)],
      [trait('monsterSet', 270, 'Slimecraw', 0.2)],
    );

    const tip = await tooltipTextFor('trait-monsterSet-350');
    expect(tip).toMatch(/runs/i);
    expect(tip).toMatch(/alternatives/i);
    expect(tip).not.toMatch(/also seen here/i);
  });

  it('omits the sibling clause when a trait stands alone', async () => {
    renderRow('mythic', [trait('mythic', 694, "Velothi Ur-Mage's Amulet", 1)]);

    const tip = await tooltipTextFor('trait-mythic-694');
    expect(tip).toMatch(/100% of this build runs/i);
    expect(tip).not.toMatch(/alternatives|also seen here/i);
  });

  it('renders nothing when the group has no traits', () => {
    const { container } = renderRow('food', []);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels frequency groups and reveals less-common picks without hover', async () => {
    renderRow(
      'monsterSet',
      [trait('monsterSet', 350, 'Zaan', 0.86)],
      [trait('monsterSet', 270, 'Slimecraw', 0.55)],
      [trait('monsterSet', 999, 'Kjalnar', 0.2)],
    );

    expect(screen.getByText(/^core$/i)).toBeInTheDocument();
    expect(screen.getByText(/common options/i)).toBeInTheDocument();
    expect(screen.queryByText('Kjalnar')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show 1 less-common pick/i }));

    expect(screen.getByText(/less common/i)).toBeInTheDocument();
    expect(screen.getByText('Kjalnar')).toBeInTheDocument();
  });

  it('bounds a combined signature while keeping group context visible', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <TraitChipRow
          title="Gear signature"
          group={['fivePieceSets', 'monsterSet'] as const}
          core={[
            trait('fivePieceSets', 1, 'Deadly Strike', 1),
            trait('monsterSet', 350, 'Zaan', 0.9),
          ]}
          flex={[trait('fivePieceSets', 2, 'Coral Riptide', 0.6)]}
          maxVisible={2}
          showVariationsControl={false}
        />
      </ThemeProvider>,
    );

    expect(container.querySelectorAll('[data-trait-kind]')).toHaveLength(2);
    expect(screen.getByText('Set')).toBeInTheDocument();
    expect(screen.getByText('Monster')).toBeInTheDocument();
    expect(screen.getByText('+1 more in the full breakdown')).toBeInTheDocument();
  });
});
