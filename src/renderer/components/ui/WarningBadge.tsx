import { useT } from "../../i18n-context";
import styles from "./WarningBadge.module.scss";

interface WarningBadgeProps {
  show: boolean;
}

export function WarningBadge({ show }: WarningBadgeProps) {
  const t = useT();

  if (!show) return null;

  return (
    /* eslint-disable-next-line i18next/no-literal-string */
    <span className={styles.badge} title={t("ui.setupIncomplete")}>!</span>
  );
}
