import { fireEvent, render, screen } from '@testing-library/react';

import { ResilientImg } from './ResilientImg';

describe('ResilientImg', () => {
  it('renders the first source initially', () => {
    render(<ResilientImg sources={['a.png', 'b.png']} alt="icon" />);
    expect(screen.getByAltText('icon')).toHaveAttribute('src', 'a.png');
  });

  it('advances to the next source when one fails to load', () => {
    render(<ResilientImg sources={['a.png', 'b.png']} alt="icon" />);
    const img = screen.getByAltText('icon');
    fireEvent.error(img);
    expect(screen.getByAltText('icon')).toHaveAttribute('src', 'b.png');
  });

  it('shows the fallback once every source has failed', () => {
    render(
      <ResilientImg
        sources={['a.png', 'b.png']}
        alt="icon"
        fallback={<span data-testid="ph">📦</span>}
      />,
    );
    fireEvent.error(screen.getByAltText('icon')); // a → b
    fireEvent.error(screen.getByAltText('icon')); // b → exhausted
    expect(screen.queryByAltText('icon')).toBeNull();
    expect(screen.getByTestId('ph')).toBeInTheDocument();
  });

  it('renders the fallback immediately when sources is empty', () => {
    render(<ResilientImg sources={[]} fallback={<span data-testid="ph">x</span>} />);
    expect(screen.getByTestId('ph')).toBeInTheDocument();
  });

  it('resets to the primary source when sources change to a new icon', () => {
    const { rerender } = render(<ResilientImg sources={['a.png', 'b.png']} alt="icon" />);
    fireEvent.error(screen.getByAltText('icon')); // a → b
    expect(screen.getByAltText('icon')).toHaveAttribute('src', 'b.png');
    // New item → new primary; must start from the new primary, not stay exhausted.
    rerender(<ResilientImg sources={['c.png', 'd.png']} alt="icon" />);
    expect(screen.getByAltText('icon')).toHaveAttribute('src', 'c.png');
  });

  it('forwards extra img props and still calls a caller onError', () => {
    const onError = jest.fn();
    render(
      <ResilientImg
        sources={['a.png', 'b.png']}
        alt="icon"
        className="foo"
        onError={onError}
      />,
    );
    const img = screen.getByAltText('icon');
    expect(img).toHaveClass('foo');
    fireEvent.error(img);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
