/**
 * Hook for positioning modals relative to trigger elements
 */

import { useEffect, useState } from 'react';

interface ModalPosition {
  top: number;
  left?: number;
  right?: number;
}

export const useModalPosition = (
  triggerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  offset: { x: number; y: number } = { x: 0, y: 10 }
): ModalPosition => {
  const [position, setPosition] = useState<ModalPosition>({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      // Position below the trigger button
      const top = rect.bottom + scrollY + offset.y;
      
      // Position to the right of the trigger, but ensure it doesn't go off screen
      const modalWidth = 480; // From CSS
      const viewportWidth = window.innerWidth;
      const rightEdge = rect.right + scrollX + offset.x;
      
      let newPosition: ModalPosition;
      
      // On mobile devices, position the modal more carefully
      if (viewportWidth <= 768) {
        // On mobile, center the modal and position it below the trigger
        newPosition = {
          top,
          left: Math.max(10, (viewportWidth - modalWidth) / 2),
        };
      } else if (rightEdge + modalWidth > viewportWidth) {
        // If modal would go off screen, position it to the left of the trigger
        newPosition = {
          top,
          left: undefined,
          right: viewportWidth - rect.left - scrollX + offset.x,
        };
      } else {
        // Position to the right of the trigger
        newPosition = {
          top,
          left: rightEdge,
        };
      }

      setPosition(newPosition);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, triggerRef, offset.x, offset.y]);

  return position;
};