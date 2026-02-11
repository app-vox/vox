import { useState, useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import styles from "./ScrollButtons.module.scss";

interface ScrollButtonsProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export function ScrollButtons({ containerRef }: ScrollButtonsProps) {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);
  const activeTab = useConfigStore((s) => s.activeTab);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScrollButtons = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowTop(scrollTop > 20);
      setShowBottom(scrollTop + clientHeight < scrollHeight - 50);
    };

    updateScrollButtons();
    container.addEventListener("scroll", updateScrollButtons);
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      container.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [containerRef, activeTab]);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  };

  return (
    <>
      {showTop && (
        <button onClick={scrollToTop} className={`${styles.scrollButton} ${styles.scrollTop}`} aria-label="Scroll to top">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
      {showBottom && (
        <button onClick={scrollToBottom} className={`${styles.scrollButton} ${styles.scrollBottom}`} aria-label="Scroll to bottom">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </>
  );
}
