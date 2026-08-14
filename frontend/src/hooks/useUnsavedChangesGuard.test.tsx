import { useState } from 'react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

function Harness() {
  const [isDirty, setIsDirty] = useState(false);
  const [discarded, setDiscarded] = useState(0);
  const [cancelled, setCancelled] = useState(0);
  const [result, setResult] = useState('');
  const { guard, modalElement, hasPending } = useUnsavedChangesGuard(isDirty, {
    onDiscard: () => setDiscarded((n) => n + 1),
    onCancel: () => setCancelled((n) => n + 1),
  });
  return (
    <div>
      <button data-testid="dirty-on" onClick={() => setIsDirty(true)}>
        dirty
      </button>
      <button data-testid="dirty-off" onClick={() => setIsDirty(false)}>
        clean
      </button>
      <button data-testid="go" onClick={() => guard(() => setResult('applied'))}>
        go
      </button>
      <Link data-testid="nav" to="/other">
        nav
      </Link>
      <span data-testid="result">{result}</span>
      <span data-testid="pending">{String(hasPending)}</span>
      <span data-testid="discarded">{discarded}</span>
      <span data-testid="cancelled">{cancelled}</span>
      {modalElement}
    </div>
  );
}

function renderWithRouter() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <Harness /> },
      { path: '/other', element: <div data-testid="other-page">other</div> },
    ],
    { initialEntries: ['/'] },
  );
  const utils = render(<RouterProvider router={router} />);
  return { router, ...utils };
}

describe('useUnsavedChangesGuard', () => {
  it('applies the action immediately when clean', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    await user.click(screen.getByTestId('go'));
    expect(screen.getByTestId('result').textContent).toBe('applied');
    expect(screen.getByTestId('pending').textContent).toBe('false');
  });

  it('intercepts the action and shows the confirm dialog when dirty', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    await user.click(screen.getByTestId('dirty-on'));
    await user.click(screen.getByTestId('go'));
    expect(screen.getByTestId('pending').textContent).toBe('true');
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    expect(screen.getByTestId('result').textContent).toBe('');
  });

  it('confirmed discard runs onDiscard and applies the pending action', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    await user.click(screen.getByTestId('dirty-on'));
    await user.click(screen.getByTestId('go'));
    await user.click(screen.getByRole('button', { name: 'Discard Changes' }));
    expect(screen.getByTestId('result').textContent).toBe('applied');
    expect(screen.getByTestId('discarded').textContent).toBe('1');
    expect(screen.getByTestId('pending').textContent).toBe('false');
  });

  it('cancelled discard keeps the state and calls onCancel', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    await user.click(screen.getByTestId('dirty-on'));
    await user.click(screen.getByTestId('go'));
    await user.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.getByTestId('result').textContent).toBe('');
    expect(screen.getByTestId('cancelled').textContent).toBe('1');
    expect(screen.getByTestId('pending').textContent).toBe('false');
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  });

  it('blocks full page unload while dirty only', async () => {
    renderWithRouter();
    const dirty = new Event('beforeunload', { cancelable: true });
    fireEvent(window, dirty);
    expect((dirty as BeforeUnloadEvent & { defaultPrevented: boolean }).defaultPrevented).toBe(false);

    const user = userEvent.setup();
    await user.click(screen.getByTestId('dirty-on'));
    const blocked = new Event('beforeunload', { cancelable: true });
    fireEvent(window, blocked);
    expect((blocked as BeforeUnloadEvent & { defaultPrevented: boolean }).defaultPrevented).toBe(true);
  });

  it('blocks in-app navigation while dirty and proceeds after discard', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    await user.click(screen.getByTestId('dirty-on'));
    await user.click(screen.getByTestId('nav'));
    expect(screen.getByTestId('pending').textContent).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Discard Changes' }));
    expect(screen.getByTestId('other-page')).toBeInTheDocument();
  });

  it('cancels in-app navigation when the user stays', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    await user.click(screen.getByTestId('dirty-on'));
    await user.click(screen.getByTestId('nav'));
    expect(screen.getByTestId('pending').textContent).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.queryByTestId('other-page')).not.toBeInTheDocument();
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  });

  it('does not block in-app navigation when clean', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    await user.click(screen.getByTestId('nav'));
    expect(screen.getByTestId('other-page')).toBeInTheDocument();
  });

  it('traps focus inside the dialog while open and restores it after cancel', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    const goButton = screen.getByTestId('go');
    await user.click(screen.getByTestId('dirty-on'));
    await user.click(goButton);
    await waitFor(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      expect(dialog).toBeTruthy();
      expect(dialog?.contains(document.activeElement)).toBe(true);
    });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab' });
    await user.click(screen.getByRole('button', { name: 'Stay' }));
    expect(goButton).toHaveFocus();
  });
});
