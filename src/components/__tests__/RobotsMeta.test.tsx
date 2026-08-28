/**
 * The interesting behaviour here is what RobotsMeta does NOT do: it must leave
 * an existing robots tag alone on indexable routes. Preview and report deploys
 * inject `noindex, nofollow` into every shell at deploy time, so a component
 * that wrote an affirmative value would un-hide them.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import { RobotsMeta } from '../RobotsMeta';

const robotsContent = (): string | null =>
  document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null;

const renderAt = (pathname: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <RobotsMeta />
    </MemoryRouter>,
  );

describe('RobotsMeta', () => {
  afterEach(() => {
    document.head.querySelectorAll('meta[name="robots"]').forEach((meta) => meta.remove());
  });

  it('adds noindex on a private route', () => {
    renderAt('/my-reports');
    expect(robotsContent()).toBe('noindex, nofollow');
  });

  it('adds nothing on an indexable route', () => {
    renderAt('/build-leaderboard');
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('removes the tag it added when the page unmounts', () => {
    const { unmount } = renderAt('/login');
    expect(robotsContent()).toBe('noindex, nofollow');
    unmount();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('leaves a preview-injected tag untouched on an indexable route', () => {
    const injected = document.createElement('meta');
    injected.name = 'robots';
    injected.content = 'noindex, nofollow';
    document.head.appendChild(injected);

    const { unmount } = renderAt('/kalpa');
    expect(robotsContent()).toBe('noindex, nofollow');
    unmount();
    expect(robotsContent()).toBe('noindex, nofollow');
  });

  it('restores a pre-existing tag rather than deleting it', () => {
    const injected = document.createElement('meta');
    injected.name = 'robots';
    injected.content = 'max-image-preview:large';
    document.head.appendChild(injected);

    const { unmount } = renderAt('/whoami');
    expect(robotsContent()).toBe('noindex, nofollow');
    unmount();
    expect(robotsContent()).toBe('max-image-preview:large');
  });

  it('follows client-side navigation between an indexable and a private route', () => {
    // MemoryRouter reads `initialEntries` once, so a rerender with a different
    // entry does not move the router. Navigate for real instead.
    const GoToReport: React.FC = () => {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate('/report/ABC123/summary')}>
          go
        </button>
      );
    };

    render(
      <MemoryRouter initialEntries={['/gear-sets']}>
        <RobotsMeta />
        <GoToReport />
      </MemoryRouter>,
    );
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'go' }));
    expect(robotsContent()).toBe('noindex, nofollow');
  });
});
