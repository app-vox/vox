import { useT } from "../../i18n-context";
import styles from "./WarningBadge.module.scss";

interface WarningBadgeProps {
  show: boolean;
}

export function WarningBadge({ show }: WarningBadgeProps) {
  const t = useT();

  if (!show) return null;

  return (
    <span className={styles.badge} title={t("ui.setupIncomplete")}>
      !
    </span>
  );
}
