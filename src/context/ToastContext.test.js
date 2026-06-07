import { fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

function Probe() {
  const { showToast } = useToast();
  return <button type="button" onClick={() => showToast('Saved', 'success')}>notify</button>;
}

describe('ToastProvider', () => {
  it('shows dismissible toast notification', () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'notify' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument();
  });
});
