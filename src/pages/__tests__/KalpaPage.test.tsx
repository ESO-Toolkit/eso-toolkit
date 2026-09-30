import { render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { ROUTE_META } from '../../constants/routeMeta';
import { KalpaPage, KALPA_PAGE_TITLE } from '../KalpaPage';

const renderPage = (): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <KalpaPage />
    </MemoryRouter>,
  );

describe('KalpaPage', () => {
  it('sets the document title matching the prerendered static route title', () => {
    renderPage();

    expect(document.title).toBe('Kalpa: ESO Addons, Graphics & Logs | ESO Toolkit');
    expect(document.title).toBe(KALPA_PAGE_TITLE);
    // The prerender script (scripts/generate-static-routes.cjs) stamps this very
    // entry into build/kalpa/index.html, so matching it here proves the
    // hydrated title cannot overwrite the prerendered one with a worse string.
    expect(KALPA_PAGE_TITLE).toBe(ROUTE_META['/kalpa'].title);
    expect(ROUTE_META['/kalpa'].prerender).toBe(true);
  });

  it('renders exactly one h1 with the product name and tagline', () => {
    renderPage();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Kalpa');
    expect(screen.getByText('Your ESO setup, in one place.')).toBeInTheDocument();
  });

  it('links the download CTA to the releases page and GitHub CTA to the repo, both external', () => {
    renderPage();

    const downloadLinks = screen.getAllByRole('link', { name: /download kalpa/i });
    expect(downloadLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of downloadLinks) {
      expect(link).toHaveAttribute('href', 'https://github.com/ESO-Toolkit/kalpa/releases/latest');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }

    const githubLinks = screen.getAllByRole('link', { name: /view on github/i });
    expect(githubLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of githubLinks) {
      expect(link).toHaveAttribute('href', 'https://github.com/ESO-Toolkit/kalpa');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });

  it('groups the verified capabilities into six pillars and links Pack Hub internally', () => {
    renderPage();
    for (const name of [
      'Find it, install it, keep it current.',
      "See what's running. Shape how ESO looks.",
      'Fights to ESO Logs, straight from the app.',
      'Share a whole setup in six characters.',
      '58 themes. 12 Elder Scrolls skins. Or your own.',
      "Careful with the files you can't replace.",
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    for (const name of [
      'Settings editor',
      'Backups and restores',
      'Addon profiles',
      'Protected edits',
      'Multiple installs',
      'Signed updates',
    ]) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: /browse pack hub/i })).toHaveAttribute(
      'href',
      '/pack-hub',
    );
  });

  it('shows authentic screenshots with accessible enlargement controls', () => {
    renderPage();
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(5);
    expect(images[0]).toHaveAttribute('loading', 'eager');
    expect(images[0]).toHaveAttribute('fetchpriority', 'high');
    for (const image of images.slice(1)) {
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).not.toHaveAttribute('fetchpriority');
    }
    for (const image of images) {
      expect(image).toHaveAttribute('width', '1600');
      expect(image).toHaveAttribute('height', '900');
      expect(image.getAttribute('alt')).toBeTruthy();
      expect(image.closest('button')).toHaveAccessibleName(
        `Enlarge screenshot: ${image.getAttribute('alt')}`,
      );
    }
    expect(
      screen.getByText(/Preview the Minion import and review integrity checks/),
    ).toBeInTheDocument();
  });

  it('renders nine FAQ entries', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Frequently asked questions' }),
    ).toBeInTheDocument();

    const questions = [
      'Is Kalpa free?',
      'Is Kalpa safe?',
      'Can I import my addons from Minion?',
      'Does Kalpa work with the Steam version of ESO?',
      'What are addon profiles?',
      'What is Pack Hub?',
      'Can I upload combat logs to ESO Logs?',
      'Does Kalpa run on Mac or Linux?',
      'Does Graphics Stack install ReShade or NVIDIA runtimes?',
    ];
    for (const question of questions) {
      expect(screen.getByRole('button', { name: question })).toBeInTheDocument();
    }
  });

  it('emits SoftwareApplication and FAQPage structured data that mirrors the page copy', () => {
    const { container } = renderPage();

    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(2);

    const documents = Array.from(
      scripts,
      (script) => JSON.parse(script.textContent ?? '{}') as Record<string, unknown>,
    );
    const byType = new Map(documents.map((doc) => [doc['@type'], doc]));

    const app = byType.get('SoftwareApplication') as Record<string, unknown>;
    expect(app.name).toBe('Kalpa');
    expect(app.applicationCategory).toBe('UtilitiesApplication');
    expect(app.operatingSystem).toBe('Windows, macOS, Linux');
    expect(app.downloadUrl).toBe('https://github.com/ESO-Toolkit/kalpa/releases/latest');
    expect(app.codeRepository).toBe('https://github.com/ESO-Toolkit/kalpa');
    expect((app.offers as { price: number; priceCurrency: string }).price).toBe(0);
    expect((app.publisher as { name: string }).name).toBe('ESO Toolkit');

    const faq = byType.get('FAQPage') as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(faq.mainEntity).toHaveLength(9);
    expect(faq.mainEntity[0].name).toBe('Is Kalpa free?');

    // The structured data answers must appear verbatim in the rendered page.
    for (const entry of faq.mainEntity) {
      expect(screen.getByText(entry.acceptedAnswer.text)).toBeInTheDocument();
    }
  });

  it('keeps outbound GitHub links clustered on the page (canonical home for outbound links)', () => {
    renderPage();

    const closingHeading = screen.getByRole('heading', {
      level: 2,
      name: 'Ready for your next session?',
    });
    expect(closingHeading).toBeInTheDocument();

    const contributionLink = screen.getByRole('link', { name: /open an issue on github/i });
    expect(contributionLink).toHaveAttribute('href', 'https://github.com/ESO-Toolkit/kalpa/issues');
  });
});
