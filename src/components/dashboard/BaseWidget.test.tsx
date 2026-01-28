import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { BaseWidget } from './BaseWidget';

describe('BaseWidget', () => {
  const defaultProps = {
    id: 'test-widget-1',
    title: 'Test Widget',
    scope: 'most-recent' as const,
    onRemove: jest.fn(),
    onScopeChange: jest.fn(),
    isEmpty: false,
  };

  it('should render widget title', () => {
    render(
      <BaseWidget {...defaultProps}>
        <div>Widget Content</div>
      </BaseWidget>,
    );

    expect(screen.getByText('Test Widget')).toBeInTheDocument();
  });

  it('should render children when not empty', () => {
    render(
      <BaseWidget {...defaultProps}>
        <div>Widget Content</div>
      </BaseWidget>,
    );

    expect(screen.getByText('Widget Content')).toBeInTheDocument();
  });

  it('should show "No issues detected" when isEmpty is true', () => {
    render(
      <BaseWidget {...defaultProps} isEmpty={true}>
        <div>Widget Content</div>
      </BaseWidget>,
    );

    expect(screen.getByText('No issues detected')).toBeInTheDocument();
    expect(screen.queryByText('Widget Content')).not.toBeInTheDocument();
  });

  it('should call onRemove when remove button is clicked', async () => {
    const onRemove = jest.fn();

    render(
      <BaseWidget {...defaultProps} onRemove={onRemove}>
        <div>Widget Content</div>
      </BaseWidget>,
    );

    const removeButton = screen.getByLabelText(/remove widget/i);
    await userEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('should display current scope in menu button', () => {
    render(
      <BaseWidget {...defaultProps} scope="last-3">
        <div>Widget Content</div>
      </BaseWidget>,
    );

    expect(screen.getByText(/last 3 fights/i)).toBeInTheDocument();
  });

  it('should open scope menu when scope button is clicked', async () => {
    render(
      <BaseWidget {...defaultProps}>
        <div>Widget Content</div>
      </BaseWidget>,
    );

    const scopeButton = screen.getByText(/most recent/i);
    await userEvent.click(scopeButton);

    // Menu should be open with all options
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Most Recent')).toBeInTheDocument();
    expect(screen.getByText('Last 3 Fights')).toBeInTheDocument();
    expect(screen.getByText('Last 5 Fights')).toBeInTheDocument();
    expect(screen.getByText('All Fights')).toBeInTheDocument();
  });

  it('should call onScopeChange when a new scope is selected', async () => {
    const onScopeChange = jest.fn();

    render(
      <BaseWidget {...defaultProps} onScopeChange={onScopeChange}>
        <div>Widget Content</div>
      </BaseWidget>,
    );

    const scopeButton = screen.getByText(/most recent/i);
    await userEvent.click(scopeButton);

    const last5Option = screen.getByText('Last 5 Fights');
    await userEvent.click(last5Option);

    expect(onScopeChange).toHaveBeenCalledWith('last-5');
  });

  it('should display all scope options correctly', async () => {
    render(
      <BaseWidget {...defaultProps}>
        <div>Widget Content</div>
      </BaseWidget>,
    );

    const scopeButton = screen.getByText(/most recent/i);
    await userEvent.click(scopeButton);

    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Most Recent')).toBeInTheDocument();
    expect(within(menu).getByText('Last 3 Fights')).toBeInTheDocument();
    expect(within(menu).getByText('Last 5 Fights')).toBeInTheDocument();
    expect(within(menu).getByText('All Fights')).toBeInTheDocument();
  });

  it('should close menu after selecting a scope', async () => {
    render(
      <BaseWidget {...defaultProps}>
        <div>Widget Content</div>
      </BaseWidget>,
    );

    const scopeButton = screen.getByText(/most recent/i);
    await userEvent.click(scopeButton);

    expect(screen.getByRole('menu')).toBeInTheDocument();

    const last3Option = screen.getByText('Last 3 Fights');
    await userEvent.click(last3Option);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should render with different scopes', () => {
    const scopes: Array<{
      scope: 'most-recent' | 'last-3' | 'last-5' | 'all-fights';
      label: string;
    }> = [
      { scope: 'most-recent', label: 'Most Recent' },
      { scope: 'last-3', label: 'Last 3 Fights' },
      { scope: 'last-5', label: 'Last 5 Fights' },
      { scope: 'all-fights', label: 'All Fights' },
    ];

    scopes.forEach(({ scope, label }) => {
      const { unmount } = render(
        <BaseWidget {...defaultProps} scope={scope}>
          <div>Widget Content</div>
        </BaseWidget>,
      );

      expect(screen.getByText(new RegExp(label, 'i'))).toBeInTheDocument();
      unmount();
    });
  });

  it('should show checkmark on currently selected scope', async () => {
    render(
      <BaseWidget {...defaultProps} scope="last-3">
        <div>Widget Content</div>
      </BaseWidget>,
    );

    const scopeButton = screen.getByText(/last 3 fights/i);
    await userEvent.click(scopeButton);

    const menu = screen.getByRole('menu');
    const menuItems = within(menu).getAllByRole('menuitem');

    // The "Last 3 Fights" option should be selected
    const last3Item = menuItems.find((item) => item.textContent?.includes('Last 3 Fights'));
    expect(last3Item).toHaveAttribute('aria-selected', 'true');
  });
});
