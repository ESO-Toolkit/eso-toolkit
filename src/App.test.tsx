import { render, screen } from '@testing-library/react';

import App from './App';

test('renders ESO Log Insights application', () => {
  render(<App />);
  const titleElement = screen.getByText(/ESO Log Insights/i);
  expect(titleElement).toBeInTheDocument();
});
