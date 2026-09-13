import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('uses native hash navigation and explicitly moves focus to its target', () => {
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          Main content
        </main>
      </>,
    );

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    const main = screen.getByRole('main');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    skipLink.dispatchEvent(click);

    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(click.defaultPrevented).toBe(false);
    expect(main).toHaveFocus();
  });

  it('uses its supplied target id', () => {
    render(
      <>
        <SkipLink targetId="page-content" />
        <main id="page-content" tabIndex={-1}>
          Main content
        </main>
      </>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Skip to main content' }));

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#page-content',
    );
    expect(screen.getByRole('main')).toHaveFocus();
  });
});
