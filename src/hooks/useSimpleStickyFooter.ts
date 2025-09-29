// Simple sticky footer hook
import { useEffect, useRef, useState } from 'react';

export const useSimpleStickyFooter = (): {
  footerRef: React.RefObject<HTMLDivElement | null>;
  isSticky: boolean;
} => {
  const footerRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const footerEl = footerRef.current;
    if (!footerEl) return;

    const calculatorCard = footerEl.closest('[data-calculator-card]') as HTMLElement | null;
    if (!calculatorCard) return;

    const handleScroll = (): void => {
      const cardRect = calculatorCard.getBoundingClientRect();

      // Footer should be sticky when card bottom is below viewport
      const shouldBeSticky = cardRect.bottom > window.innerHeight;
      setIsSticky(shouldBeSticky);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { footerRef, isSticky };
};
