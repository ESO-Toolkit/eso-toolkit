import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { Dlss5NeuralRenderingGuidePage } from '../Dlss5NeuralRenderingGuidePage';

const renderPage = (): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <Dlss5NeuralRenderingGuidePage />
    </MemoryRouter>,
  );

describe('Dlss5NeuralRenderingGuidePage', () => {
  it('renders the hero', () => {
    renderPage();

    expect(
      // \s, not a literal space: the heading uses a non-breaking space before
      // "ESO" so a phone never orphans it onto its own line.
      screen.getByRole('heading', { level: 1, name: /DLSS 5 Neural Rendering in\sESO/i }),
    ).toBeInTheDocument();
  });

  it('leads with the risk callout, since the guide modifies a game file', () => {
    renderPage();

    expect(screen.getByText(/Read this before you start/i)).toBeInTheDocument();
    expect(screen.getByText(/It modifies a game file\./i)).toBeInTheDocument();
    expect(screen.getByText(/never issued an official position on ReShade/i)).toBeInTheDocument();
  });

  it('does not link or host the patched NR runtime', () => {
    renderPage();

    // The Ada/Blackwell-patched nvngx_dlssnr.dll is a modified-after-signing
    // NVIDIA binary. The guide must tell readers to source their own and must
    // never gain a download link to it.
    expect(screen.getByText(/We do not\s+host, link, or distribute/i)).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.getAttribute('href') ?? '').not.toMatch(/dlssnr/i);
    });
  });

  it('does not claim ESO lacks native DLSS', () => {
    const { container } = renderPage();

    // ESO shipped DLSS *and* DLAA natively in 2021 and was the first game ever
    // to support DLAA; both are in the in-game Anti-Aliasing dropdown, visible
    // only on RTX cards. The guide previously opened by claiming ESO had no
    // DLSS at all, which also contradicted its own troubleshooting section.
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/no native DLSS/i);
    expect(text).toMatch(/first game ever to support DLAA/i);
  });

  it('frames the premise as replacing a stale 2.2.16 runtime', () => {
    renderPage();

    // Stated twice now: once as the premise, once in the step that replaces it.
    expect(screen.getAllByText(/ESO bundles/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.2\.16/).length).toBeGreaterThan(0);
  });

  it('tells readers to check the DLSS runtime version, not whether it exists', () => {
    const { container } = renderPage();

    // ESO ships an nvngx_dlss.dll, so "there is no nvngx_dlss.dll at all" was
    // wrong for most readers. The merged entry must ask for a version check.
    const text = container.textContent ?? '';
    expect(text).toMatch(/Check the version, do not check whether the file exists/i);
    expect(text).not.toMatch(/There is no nvngx_dlss\.dll in the client folder at all/i);
  });

  it('warns that ESO own DLSS/DLAA must not be left on alongside the feeder', () => {
    const { container } = renderPage();

    const text = container.textContent ?? '';
    expect(text).toMatch(/ESO's DLSS breaks the depth buffer/i);
    expect(text).toMatch(/DLAA is subtler but still wrong/i);
  });

  it('documents the ESO-specific cs_5_1 blocker', () => {
    renderPage();

    expect(screen.getByText(/unrecognized compiler target 'cs_5_1'/i)).toBeInTheDocument();
  });

  it('presents the motion-vector provider as a choice, not as LaunchPad only', () => {
    const { container } = renderPage();

    // Upstream lists five providers behind one preprocessor definition and
    // recommends LumeniteFX Kernel. The guide previously described iMMERSE
    // LaunchPad as though it were required, which it never was.
    const text = container.textContent ?? '';
    expect(text).toMatch(/LumeniteFX Kernel/);
    expect(text).toMatch(/LaunchPad\s+is\s+a\s+provider,\s+not\s+the\s+provider/i);
    expect(
      screen.getByRole('heading', { name: /Choosing a motion-vector provider/i }),
    ).toBeInTheDocument();
  });

  it('documents both generations of the provider setting, labelled by version', () => {
    const { container } = renderPage();

    // DLSS5_MV_SOURCE + MV_PROVIDER (0.4.x, two values) and DLSS5_MV_PROVIDER
    // (current, 0-4) are the same setting one generation apart. A reader on
    // either build must be able to tell which one applies to them, so neither
    // name may be dropped in favour of the other.
    const text = container.textContent ?? '';
    expect(text).toMatch(/DLSS5_MV_PROVIDER/);
    expect(text).toMatch(/DLSS5_MV_SOURCE/);
    expect(text).toMatch(/0\.4\.x/);
    // Default and recommendation are different values; conflating them sends
    // readers away with provider 0 believing they took the recommended path.
    expect(text).toMatch(/built-in\s+default\s+is\s+0;\s+upstream's\s+recommendation\s+is\s+3/i);
  });

  it('keeps the ordering rule prominent, since it fails silently', () => {
    const { container } = renderPage();

    const text = container.textContent ?? '';
    expect(text).toMatch(/must be ABOVE/);
    expect(text).toMatch(/Get\s+the\s+order\s+wrong\s+and\s+nothing\s+errors/i);
  });

  it('documents a tuning panel for each path', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /Using the ReShade overlay/i })).toBeInTheDocument();
    // Two add-ons, two panels. The direct one is in the main flow; the feeder's
    // stays with the fallback so a reader is never handed the wrong controls.
    expect(screen.getByRole('heading', { name: /Tuning the neural pass/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Fallback: the feeder add-on panel/i }),
    ).toBeInTheDocument();
    // Both panels expose it and the direct path calls it out in prose, so this
    // counts rather than asserting a single match. It is the control the guide
    // points at first on either path.
    expect(screen.getAllByText('Skin Structure Strength').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Enable DLSS Neural Rendering')).toBeInTheDocument();
    expect(screen.getByText('Reset NR feature and clear failure latch')).toBeInTheDocument();
  });

  it('explains how to verify the depth buffer', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /Checking the depth buffer/i })).toBeInTheDocument();
    expect(screen.getByText(/Copy depth buffer before clear operations/i)).toBeInTheDocument();
  });

  it('leads with the direct path and keeps the feeder as a labelled fallback', () => {
    const { container } = renderPage();

    // Upstream routes 64-bit DX11 games away from the feeder, and the one-add-on
    // path was verified working on ESO. Setup must therefore be the direct path;
    // the two-add-on method stays on the page but below it, marked as a fallback.
    const text = container.textContent ?? '';
    const setupAt = text.indexOf('Setup');
    const fallbackAt = text.indexOf('Fallback: the two-add-on feeder path');
    expect(setupAt).toBeGreaterThan(-1);
    expect(fallbackAt).toBeGreaterThan(setupAt);
  });

  it('documents LoadFromDllMain, which is the failure that produces no error', () => {
    const { container } = renderPage();

    // Without this line the add-on loads after ESO has created its D3D12 device,
    // installs no DLSS hooks, and reports nothing wrong. It cost hours to find.
    const text = container.textContent ?? '';
    expect(text).toMatch(/LoadFromDllMain=renodx-dlss\.addon64/);
    expect(text).toMatch(/ReShade rewrites ReShade\.ini/i);
    expect(text).toMatch(/Loading externally registered add-on/);
  });

  it('sets the document title from route metadata', () => {
    renderPage();
    // Sourced via usePageTitle -> ROUTE_META, so it matches the prerendered
    // shell byte for byte. A mismatch here means someone hardcoded it again.
    expect(document.title).toBe('DLSS 5 Neural Rendering in ESO: Setup & Fixes | ESO Toolkit');
  });

  it('emits valid JSON-LD that does not break out of the script block', () => {
    const { container } = renderPage();

    const blocks = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
    expect(blocks).toHaveLength(2);

    const types = blocks.map((b) => {
      const raw = b.textContent ?? '';
      // An unescaped '<' would terminate the script element early in a real browser.
      expect(raw).not.toContain('<');
      return JSON.parse(raw)['@type'];
    });
    expect(types).toEqual(['TechArticle', 'HowTo']);
  });

  it('every table-of-contents link resolves to a real section anchor', () => {
    const { container } = renderPage();

    // Every in-page anchor, not just the table of contents: several body links
    // (#requirements, #overlay, #troubleshooting) are string literals rather than
    // entries in the SECTIONS registry, so a section-id rename would dangle them
    // while a TOC-only assertion stayed green.
    const tocLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    expect(tocLinks.length).toBeGreaterThan(0);

    tocLinks.forEach((link) => {
      const id = link.getAttribute('href')?.replace('#', '') ?? '';
      expect(id).not.toBe('');
      // A dangling anchor silently scrolls nowhere, which is worse than no TOC.
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    });
  });

  it('has a valid heading outline with no skipped levels', () => {
    const { container } = renderPage();

    const levels = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) =>
      Number(h.tagName[1]),
    );

    expect(levels[0]).toBe(1);
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    levels.slice(1).forEach((level, i) => {
      // Descending any amount is fine; ascending may only ever step by one.
      expect(level - levels[i]).toBeLessThanOrEqual(1);
    });
  });
});
