import { useEffect, useState } from "react";
import { useT } from "../../i18n-context";
import { CheckRoundedIcon } from "../../../shared/icons";
import styles from "./SaveToast.module.scss";

interface SaveToastProps {
  show: boolean;
  timestamp: number;
  onHide: () => void;
  sidebarCollapsed?: boolean;
}

export function SaveToast({ show, timestamp, onHide, sidebarCollapsed }: SaveToastProps) {
  const t = useT();
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

  const positionClass = sidebarCollapsed ? styles.topRight : styles.aboveSidebar;

  return (
    <div className={`${styles.toast} ${visible ? styles.visible : styles.hidden} ${positionClass}`}>
      <CheckRoundedIcon width={16} height={16} />
      {t("ui.settingsSaved")}
    </div>
  );
}
