import { render, screen, within } from '@testing-library/react';
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

    expect(document.title).toBe('Kalpa: ESO Addon Manager & Log Uploader | ESO Toolkit');
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
    expect(
      screen.getByText('Your addons, combat logs, and shared setups. Together.'),
    ).toBeInTheDocument();
  });

  it('links the download CTA to the releases page and GitHub CTA to the repo, both external', () => {
    renderPage();

    const downloadLinks = screen.getAllByRole('link', { name: /download for windows/i });
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

  it('renders all twelve numbered features and links Pack Hub internally', () => {
    renderPage();

    const featuresSection = screen
      .getByRole('heading', { level: 2, name: 'Everything around your next session' })
      .closest('section');
    expect(featuresSection).not.toBeNull();

    const expectedFeatures = [
      'Discover and update addons',
      'Dependency resolution',
      'ESO Logs uploads',
      'Live logging and fight selection',
      'Pack Hub',
      'Settings editor',
      'Backups and restores',
      'Addon profiles',
      'Themes and accessibility',
      'Protected edits',
      'Minion migration and multiple installs',
      'Everyday library tools',
    ];
    for (const title of expectedFeatures) {
      expect(within(featuresSection as HTMLElement).getByText(title)).toBeInTheDocument();
    }

    const packHubLinks = within(featuresSection as HTMLElement).getAllByRole('link', {
      name: /browse pack hub/i,
    });
    expect(packHubLinks[0]).toHaveAttribute('href', '/pack-hub');
  });

  it('shows authentic screenshots with accessible descriptions and full-size links', () => {
    renderPage();
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    for (const image of images) {
      expect(image).toHaveAttribute('width', '1600');
      expect(image).toHaveAttribute('height', '900');
      expect(image.getAttribute('alt')).toBeTruthy();
      expect(image.closest('a')).toHaveAttribute('href', image.getAttribute('src'));
    }
    expect(
      screen.getByText(/Preview the Minion import and review integrity checks/),
    ).toBeInTheDocument();
  });

  it('renders eight FAQ entries', () => {
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
    expect(faq.mainEntity).toHaveLength(8);
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
    expect(contributionLink).toHaveAttribute('href', 'https://github.com/ESO-Toolkit/kalpa');
  });
});
