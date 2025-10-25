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
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    const homeButton = screen.getByRole('button', { name: /go home/i });
    await userEvent.click(homeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates back when "Go Back" button is clicked', async () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    const backButton = screen.getByRole('button', { name: /go back/i });
    await userEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('displays help text', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Need help\? Contact support or check the documentation\./i),
    ).toBeInTheDocument();
  });
});
