import { render, screen } from '@testing-library/react';
import React from 'react';

import { EChart } from './EChart';

// Keep the lazy chart suspended to inspect its reserved space.
jest.mock('./EChartInner', () => ({
  __esModule: true,
  default: () => {
    throw new Promise(() => {});
  },
}));

describe('EChart loading layout', () => {
  it.each([undefined, 500, '40vh'])('reserves the requested height %s', (height) => {
    render(<EChart option={{}} height={height} />);
    expect(screen.getByRole('status')).toHaveStyle({
      height: typeof height === 'number' ? `${height}px` : (height ?? '300px'),
      width: '100%',
    });
  });

  it('respects style overrides just like the loaded chart', () => {
    render(<EChart option={{}} height={500} style={{ height: 240, width: '80%' }} />);
    expect(screen.getByRole('status')).toHaveStyle({ height: '240px', width: '80%' });
  });
});
