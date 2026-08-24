import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import '@testing-library/jest-dom';
import { NotFound } from '../NotFound';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('NotFound', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders 404 error message', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText(/The page you're looking for doesn't exist/i)).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('navigates to home when "Go Home" button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    const homeButton = screen.getByRole('button', { name: /go home/i });
    await user.click(homeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates back when "Go Back" button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    const backButton = screen.getByRole('button', { name: /go back/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('displays actionable support and documentation links', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /github discussions/i })).toHaveAttribute(
      'href',
      'https://github.com/ESO-Toolkit/eso-toolkit/discussions',
    );
    expect(screen.getByRole('link', { name: /documentation/i })).toHaveAttribute(
      'href',
      'https://github.com/ESO-Toolkit/eso-toolkit#readme',
    );
  });
});
