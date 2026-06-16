import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import useDismissiblePopover from './useDismissiblePopover';

function PopoverHarness({ initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  const { rootRef, onTriggerClick, onTriggerDoubleClick, close } = useDismissiblePopover(open, setOpen);

  return (
    <div>
      <div ref={rootRef} data-testid="popover-root">
        <button type="button" onClick={onTriggerClick} onDoubleClick={onTriggerDoubleClick}>
          Toggle menu
        </button>
        {open && (
          <div data-testid="popover-panel">
            <button type="button" onClick={close}>Close</button>
          </div>
        )}
      </div>
      <button type="button">Outside</button>
    </div>
  );
}

describe('useDismissiblePopover', () => {
  it('toggles open state from the trigger', () => {
    render(<PopoverHarness />);
    expect(screen.queryByTestId('popover-panel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    expect(screen.getByTestId('popover-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    expect(screen.queryByTestId('popover-panel')).not.toBeInTheDocument();
  });

  it('closes on outside pointerdown without reopening the trigger', () => {
    render(<PopoverHarness initialOpen />);
    expect(screen.getByTestId('popover-panel')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByTestId('popover-panel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    expect(screen.getByTestId('popover-panel')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<PopoverHarness initialOpen />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('popover-panel')).not.toBeInTheDocument();
  });

  it('forces close on double-click', () => {
    render(<PopoverHarness initialOpen />);
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Toggle menu' }));
    expect(screen.queryByTestId('popover-panel')).not.toBeInTheDocument();
  });
});
