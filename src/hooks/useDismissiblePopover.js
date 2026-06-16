import { useCallback, useEffect, useRef } from 'react';

export function useCloseOnOutside(open, rootRef, onClose) {
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      onClose();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, rootRef]);
}

/**
 * Shared open/close behavior for dropdown menus and popovers.
 * Attach rootRef to the element wrapping both the trigger and the panel.
 */
export default function useDismissiblePopover(open, setOpen) {
  const rootRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, [setOpen]);

  useCloseOnOutside(open, rootRef, close);

  const onTriggerClick = useCallback(() => {
    setOpen((value) => !value);
  }, [setOpen]);

  const onTriggerDoubleClick = useCallback((event) => {
    event.preventDefault();
    setOpen(false);
  }, [setOpen]);

  return {
    rootRef,
    close,
    toggle,
    onTriggerClick,
    onTriggerDoubleClick,
  };
}
