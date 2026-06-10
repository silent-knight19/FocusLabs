import { useEffect } from 'react';

let lockCount = 0;
let previousOverflow = '';

export function useLockBodyScroll(isOpen) {
  useEffect(() => {
    if (isOpen) {
      if (lockCount === 0) {
        previousOverflow = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
      }
      lockCount++;
      return () => {
        lockCount--;
        if (lockCount <= 0) {
          lockCount = 0;
          document.body.style.overflow = previousOverflow;
        }
      };
    }
  }, [isOpen]);
}
