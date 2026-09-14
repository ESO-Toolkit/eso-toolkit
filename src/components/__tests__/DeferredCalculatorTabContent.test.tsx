import { fireEvent, render, screen } from '@testing-library/react';
import React, { useMemo, useState } from 'react';

import { DeferredCalculatorTabContent } from '../Calculator';

describe('DeferredCalculatorTabContent', () => {
  it('does not rebuild tab content for an urgent tab-highlight update', () => {
    const buildContent = jest.fn();

    const Harness = (): React.JSX.Element => {
      const [selectedTab, setSelectedTab] = useState(0);
      const [deferredTab, setDeferredTab] = useState(0);
      const revision = useMemo(() => ({ deferredTab }), [deferredTab]);

      // This intentionally recreates on every parent render, matching Calculator.
      // The revision remains stable until deferred content is ready to update.
      const renderContent = (): React.JSX.Element => {
        buildContent(deferredTab);
        return <div data-testid="deferred-content">Content {deferredTab}</div>;
      };

      return (
        <>
          <output data-testid="selected-tab">Selected {selectedTab}</output>
          <button type="button" onClick={() => setSelectedTab(1)}>
            Highlight critical tab
          </button>
          <button type="button" onClick={() => setDeferredTab(1)}>
            Render critical tab
          </button>
          <DeferredCalculatorTabContent revision={revision} renderContent={renderContent} />
        </>
      );
    };

    render(<Harness />);
    expect(buildContent).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Highlight critical tab' }));
    expect(screen.getByTestId('selected-tab')).toHaveTextContent('Selected 1');
    expect(buildContent).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Render critical tab' }));
    expect(screen.getByTestId('deferred-content')).toHaveTextContent('Content 1');
    expect(buildContent).toHaveBeenCalledTimes(2);
  });
});
