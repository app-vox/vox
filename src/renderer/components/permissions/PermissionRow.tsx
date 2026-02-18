import type { ReactNode } from "react";
import { useT } from "../../i18n-context";
import styles from "./PermissionRow.module.scss";
import btn from "../shared/buttons.module.scss";

interface PermissionRowProps {
  icon: ReactNode;
  name: string;
  description: string;
  granted: boolean;
  statusText?: string;
  buttonText?: string;
  onRequest?: () => void;
  requesting?: boolean;
  setupRequired?: boolean;
  variant?: "default" | "onboarding";
}

export function PermissionRow({
  icon,
  name,
  description,
  granted,
  statusText,
  buttonText,
  onRequest,
  requesting,
  setupRequired = false,
  variant = "default",
}: PermissionRowProps) {
  const t = useT();

  return (
    <div className={`${styles.row} ${variant === "onboarding" ? styles.rowOnboarding : ""}`}>
      <div className={styles.info}>
        {variant === "onboarding" ? (
          <div className={styles.iconWrapper}>{icon}</div>
        ) : (
          icon
        )}
        <div>
          <div className={styles.name}>{name}</div>
          <div className={styles.desc}>{description}</div>
        </div>
      </div>
      <div className={styles.action}>
        {setupRequired ? (
          <span className={`${styles.badge} ${styles.setupBadge}`}>{t("permissions.setupRequired")}</span>
        ) : granted ? (
          <span className={`${styles.badge} ${styles.granted}`}>{t("permissions.granted")}</span>
        ) : (
          <>
            {variant === "default" && (
              <span className={`${styles.badge} ${styles.missing}`}>
                {statusText || t("permissions.notGranted")}
              </span>
            )}
            {variant === "onboarding" && statusText && (
              <span className={`${styles.badge} ${styles.missing}`}>{statusText}</span>
            )}
            {buttonText && onRequest && (
              <button
                onClick={onRequest}
                disabled={requesting}
                className={`${btn.btn} ${btn.secondary} ${btn.sm}`}
              >
                {requesting ? t("permissions.requesting") : buttonText}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
