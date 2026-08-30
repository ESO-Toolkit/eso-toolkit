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
      screen.getByRole('heading', { level: 1, name: /DLSS 5 Neural Rendering in ESO/i }),
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

  it('documents the ESO-specific cs_5_1 blocker', () => {
    renderPage();

    expect(screen.getByText(/unrecognized compiler target 'cs_5_1'/i)).toBeInTheDocument();
  });

  it('covers the overlay and the Neural Rendering add-on panel', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /Using the ReShade overlay/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /The Neural Rendering add-on panel/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Enable DLSS Neural Rendering')).toBeInTheDocument();
    expect(screen.getByText('Skin Structure Strength')).toBeInTheDocument();
    expect(screen.getByText('Reset NR feature and clear failure latch')).toBeInTheDocument();
  });

  it('explains how to verify the depth buffer', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /Checking the depth buffer/i })).toBeInTheDocument();
    expect(screen.getByText(/Copy depth buffer before clear operations/i)).toBeInTheDocument();
  });

  it('sets the document title', () => {
    renderPage();
    expect(document.title).toBe('DLSS 5 Neural Rendering in ESO | ESO Toolkit');
  });
});
