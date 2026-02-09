import styles from "./WarningBadge.module.scss";

interface WarningBadgeProps {
  show: boolean;
}

export function WarningBadge({ show }: WarningBadgeProps) {
  if (!show) return null;

  return (
    <span className={styles.badge} title="Setup incomplete">
      !
    </span>
  );
}
