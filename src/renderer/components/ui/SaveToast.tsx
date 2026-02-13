import { useEffect, useState } from "react";
import styles from "./SaveToast.module.scss";

interface SaveToastProps {
  show: boolean;
  timestamp: number;
  onHide: () => void;
}

export function SaveToast({ show, timestamp, onHide }: SaveToastProps) {
  const [visible, setVisible] = useState(false);
  const [prevTimestamp, setPrevTimestamp] = useState(timestamp);

  // Adjust state during render when a new save occurs (React recommended pattern)
  if (show && timestamp !== prevTimestamp) {
    setVisible(true);
    setPrevTimestamp(timestamp);
  }

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onHide, 300);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, timestamp, onHide]);

  useEffect(() => {
    if (show && visible) {
      const failsafe = setTimeout(() => {
        setVisible(false);
        onHide();
      }, 5000);
      return () => clearTimeout(failsafe);
    }
  }, [show, visible, onHide]);

  if (!show && !visible) return null;

  return (
    <div className={`${styles.toast} ${visible ? styles.visible : styles.hidden}`}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13.3333 4L6 11.3333L2.66667 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Settings saved
    </div>
  );
}
