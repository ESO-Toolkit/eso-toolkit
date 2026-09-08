import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import React from 'react';
import { Provider } from 'react-redux';

import buildEditorReducer, { addScreenshot } from '../../store/buildEditorSlice';

import { GuideSection } from './GuideSection';

const renderGuideSection = (screenshot?: string) => {
  const store = configureStore({ reducer: { buildEditor: buildEditorReducer } });
  if (screenshot) store.dispatch(addScreenshot(screenshot));

  return {
    store,
    ...render(
      <Provider store={store}>
        <SnackbarProvider>
          <GuideSection />
        </SnackbarProvider>
      </Provider>,
    ),
  };
};

const getGeneratedCssRules = (element: HTMLElement): string => {
  const generatedClassName = Array.from(element.classList).find((className) =>
    className.startsWith('css-'),
  );

  if (!generatedClassName) {
    throw new Error('Expected a generated MUI class on the element');
  }

  return Array.from(document.styleSheets)
    .flatMap((styleSheet) => Array.from(styleSheet.cssRules))
    .map((rule) => rule.cssText)
    .filter((rule) => rule.includes(`.${generatedClassName}`))
    .join('\n');
};

describe('GuideSection accessibility', () => {
  it('associates an invalid banner URL with an announced error status', async () => {
    const user = userEvent.setup();
    renderGuideSection();

    const bannerInput = screen.getByRole('textbox', { name: 'Banner image URL' });
    await user.type(bannerInput, 'http://example.com/banner.png');

    const errorStatus = screen.getByRole('status');
    expect(errorStatus).toHaveTextContent('Invalid URL — must start with https://');
    expect(errorStatus).toHaveAttribute('aria-live', 'polite');
    expect(bannerInput).toHaveAttribute('aria-invalid', 'true');
    expect(bannerInput).toHaveAttribute('aria-describedby', errorStatus.id);
    expect(bannerInput).toHaveAttribute('aria-errormessage', errorStatus.id);

    await user.clear(bannerInput);
    await user.type(bannerInput, 'https://example.com/banner.png');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(bannerInput).not.toHaveAttribute('aria-describedby');
    expect(bannerInput).not.toHaveAttribute('aria-errormessage');
  });

  it('keeps the mobile screenshot remove control visible, touch-sized, and keyboard operable', async () => {
    const user = userEvent.setup();
    renderGuideSection('data:image/png;base64,guide-screenshot');

    const removeButton = screen.getByRole('button', { name: 'Remove screenshot 1' });
    const cssRules = getGeneratedCssRules(removeButton);

    expect(cssRules).toContain('@media (min-width:0px)');
    expect(cssRules).toContain('width: 44px; height: 44px; opacity: 1;');
    expect(cssRules).toContain(':focus-visible {opacity: 1;');
    expect(cssRules).toContain('@media (hover: none), (pointer: coarse)');

    for (let tabCount = 0; tabCount < 6 && document.activeElement !== removeButton; tabCount += 1) {
      await user.tab();
    }
    expect(removeButton).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.queryByRole('button', { name: 'Remove screenshot 1' })).not.toBeInTheDocument();
  });
});
