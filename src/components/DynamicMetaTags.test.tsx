import { render } from '@testing-library/react';

import { DynamicMetaTags, generateReportMetaTags, generatePlayerMetaTags } from './DynamicMetaTags';

// Mock window.location for generateReportMetaTags and generatePlayerMetaTags
const mockLocation = {
  origin: 'https://bkrupa.github.io',
  pathname: '/eso-log-aggregator/',
  hash: '#/report/ABC123/fight/1',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (window as any).location;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).location = mockLocation;

describe('DynamicMetaTags', () => {
  beforeEach(() => {
    // Clear any existing meta tags
    document.head.innerHTML = '';
  });

  it('should update document title', () => {
    render(<DynamicMetaTags title="Test Fight - Report Analysis" />);

    expect(document.title).toBe('Test Fight - Report Analysis | ESO Log Insights by NotaGuild');
  });

  it('should add Open Graph meta tags', () => {
    render(
      <DynamicMetaTags
        title="Cloudrest +3"
        description="Amazing DPS performance"
        image="https://example.com/preview.png"
        url="https://example.com/report/1"
        type="article"
      />
    );

    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Cloudrest +3'
    );
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(
      'Amazing DPS performance'
    );
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://example.com/preview.png'
    );
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://example.com/report/1'
    );
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe(
      'article'
    );
  });

  it('should add Twitter Card meta tags', () => {
    render(
      <DynamicMetaTags
        title="ESO Analysis"
        description="Combat log insights"
        image="https://example.com/card.png"
      />
    );

    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(
      'ESO Analysis'
    );
    expect(
      document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')
    ).toBe('Combat log insights');
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(
      'https://example.com/card.png'
    );
  });
});

describe('generateReportMetaTags', () => {
  it('should generate basic report meta tags', () => {
    const result = generateReportMetaTags('ABC123');

    expect(result.title).toBe('ABC123 Analysis');
    expect(result.description).toContain('Detailed combat log analysis for ESO report ABC123');
    expect(result.type).toBe('article');
  });

  it('should generate enhanced meta tags with fight details', () => {
    const result = generateReportMetaTags('ABC123', 'Cloudrest +3', 'TestPlayer', 95000, 525000);

    expect(result.title).toBe('Cloudrest +3 - ABC123 Analysis');
    expect(result.description).toContain('TestPlayer achieved 95,000 DPS on Cloudrest +3');
    expect(result.description).toContain('Fight duration: 8:45');
  });
});

describe('generatePlayerMetaTags', () => {
  it('should generate player-specific meta tags', () => {
    const result = generatePlayerMetaTags(
      'ABC123',
      'TestPlayer',
      'Dragonknight',
      85000,
      'Sunspire'
    );

    expect(result.title).toBe("TestPlayer's Performance - ABC123");
    expect(result.description).toContain('TestPlayer (Dragonknight)');
    expect(result.description).toContain('85,000 DPS on Sunspire');
    expect(result.type).toBe('article');
  });
});
