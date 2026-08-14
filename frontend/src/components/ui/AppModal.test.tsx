import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppModal } from './AppModal';

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <AppModal
      open={open}
      title="First modal"
      onClose={() => setOpen(false)}
      footer={<button type="button">Footer action</button>}
    >
      <p>Body content</p>
    </AppModal>
  );
}

describe('AppModal', () => {
  it('renders nothing when closed', () => {
    render(<AppModal open={false} title="Hidden" onClose={() => {}}>content</AppModal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog, title and body in a portal', () => {
    render(
      <AppModal open title="My title" onClose={() => {}}>
        <p>Body content</p>
      </AppModal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('My title')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('title id links the heading to aria-labelledby', () => {
    render(
      <AppModal open title="Linked title" onClose={() => {}}>
        content
      </AppModal>,
    );
    const dialog = screen.getByRole('dialog');
    const heading = screen.getByText('Linked title');
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('renders the footer when provided', () => {
    render(
      <AppModal open title="T" onClose={() => {}} footer={<button type="button">Footer action</button>}>
        content
      </AppModal>,
    );
    expect(screen.getByRole('button', { name: 'Footer action' })).toBeInTheDocument();
  });

  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AppModal open title="T" onClose={onClose}>
        content
      </AppModal>,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape calls onClose when enabled', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AppModal open title="T" onClose={onClose}>
        content
      </AppModal>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape is ignored when disabled', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AppModal open title="T" onClose={onClose} closeOnEscape={false}>
        content
      </AppModal>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('backdrop click closes when enabled', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AppModal open title="T" onClose={onClose}>
        content
      </AppModal>,
    );
    await user.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop click is ignored when disabled', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AppModal open title="T" onClose={onClose} closeOnBackdrop={false}>
        content
      </AppModal>,
    );
    await user.click(screen.getByRole('presentation'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clicking inside the dialog does not bubble to the backdrop', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AppModal open title="T" onClose={onClose}>
        <button type="button">Inside</button>
      </AppModal>,
    );
    await user.click(screen.getByRole('button', { name: 'Inside' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('two simultaneous modals get distinct title ids', () => {
    render(
      <div>
        <AppModal open title="Modal A" onClose={() => {}}>
          A body
        </AppModal>
        <AppModal open title="Modal B" onClose={() => {}}>
          B body
        </AppModal>
      </div>,
    );
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(2);
    const idA = dialogs[0].getAttribute('aria-labelledby');
    const idB = dialogs[1].getAttribute('aria-labelledby');
    expect(idA).not.toBe(idB);
    expect(screen.getByText('Modal A')).toHaveAttribute('id', idA as string);
    expect(screen.getByText('Modal B')).toHaveAttribute('id', idB as string);
  });

  it('applies the width and className props', () => {
    render(
      <AppModal open title="T" onClose={() => {}} width="800px" className="custom-class">
        content
      </AppModal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('custom-class');
    expect(dialog).toHaveStyle({ maxWidth: '800px' });
  });

  it('closing via parent state removes the modal', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
