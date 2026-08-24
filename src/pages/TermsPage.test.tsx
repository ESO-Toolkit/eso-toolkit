import { render, screen } from '@testing-library/react';

import { TermsPage } from './TermsPage';

describe('TermsPage', () => {
  it('renders the public terms and key links', () => {
    render(<TermsPage />);

    expect(screen.getByRole('heading', { name: 'Terms of Use' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: 'LICENSE' })).toHaveAttribute(
      'href',
      'https://github.com/ESO-Toolkit/eso-toolkit/blob/main/LICENSE',
    );
  });
});
