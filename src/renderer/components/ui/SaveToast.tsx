import { useEffect, useState } from "react";

interface SaveToastProps {
  show: boolean;
  onHide: () => void;
}

export function SaveToast({ show, onHide }: SaveToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onHide, 300); // Wait for fade out animation
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  if (!show && !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        background: "#10b981",
        color: "white",
        padding: "12px 16px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease-in-out",
        fontSize: "14px",
        fontWeight: "500",
      }}
    >
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
