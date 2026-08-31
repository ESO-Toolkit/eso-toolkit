import { act, render, screen } from '@testing-library/react';

import { BUILD_EDITOR_REVEAL_SECTION_EVENT, LazySection } from './LazySection';

describe('LazySection', () => {
  let observerCallback: IntersectionObserverCallback = () => undefined;
  const observe = jest.fn();
  const disconnect = jest.fn();
  let observerOptions: IntersectionObserverInit | undefined;

  beforeEach(() => {
    observe.mockClear();
    disconnect.mockClear();
    observerOptions = undefined;
    global.IntersectionObserver = jest.fn(
      (callback: IntersectionObserverCallback, options?: IntersectionObserverInit) => {
        observerCallback = callback;
        observerOptions = options;
        return { observe, disconnect } as unknown as IntersectionObserver;
      },
    );
  });

  it('keeps an unmounted section addressable and mounts it when it nears the viewport', () => {
    render(
      <LazySection sectionId="equipment">
        <div data-testid="equipment-editor">Equipment editor</div>
      </LazySection>,
    );

    const placeholder = document.getElementById('section-equipment');
    expect(placeholder).toBeInTheDocument();
    expect(screen.queryByTestId('equipment-editor')).not.toBeInTheDocument();

    act(() => {
      observerCallback(
        [{ isIntersecting: true, target: placeholder } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(screen.getByTestId('equipment-editor')).toBeInTheDocument();
    expect(disconnect).toHaveBeenCalled();
  });

  it('preloads against the editor scroll region instead of the outer viewport', () => {
    const { container } = render(
      <div data-build-editor-scroll-region>
        <LazySection sectionId="equipment">
          <div>Equipment editor</div>
        </LazySection>
      </div>,
    );

    expect(observerOptions).toEqual({
      root: container.querySelector('[data-build-editor-scroll-region]'),
      rootMargin: '1200px 0px',
    });
  });

  it('mounts the requested section before explicit navigation scrolls to it', () => {
    render(
      <LazySection sectionId="passives">
        <div data-testid="passives-editor">Passives editor</div>
      </LazySection>,
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(BUILD_EDITOR_REVEAL_SECTION_EVENT, { detail: 'passives' }),
      );
    });

    expect(screen.getByTestId('passives-editor')).toBeInTheDocument();
    expect(document.querySelector('[aria-hidden="true"]#section-passives')).not.toBeInTheDocument();
  });
});
