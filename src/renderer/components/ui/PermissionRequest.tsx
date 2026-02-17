import type { ReactNode } from "react";
import { useT } from "../../i18n-context";
import styles from "./PermissionRequest.module.scss";
import btn from "../shared/buttons.module.scss";

interface PermissionRequestProps {
  icon: ReactNode;
  name: string;
  description: string;
  granted: boolean;
  statusText?: string;
  buttonText?: string;
  onRequest?: () => void;
  requesting?: boolean;
  className?: string;
}

export function PermissionRequest({
  icon,
  name,
  description,
  granted,
  statusText,
  buttonText,
  onRequest,
  requesting,
  className,
}: PermissionRequestProps) {
  const t = useT();

  return (
    <div className={`${styles.row} ${className ?? ""}`}>
      <div className={styles.info}>
        {icon}
        <div>
          <div className={styles.name}>{name}</div>
          <div className={styles.desc}>{description}</div>
        </div>
      </div>
      <div className={styles.action}>
        {granted ? (
          <span className={`${styles.badge} ${styles.granted}`}>
            {t("permissions.granted")}
          </span>
        ) : (
          <>
            {statusText && (
              <span className={`${styles.badge} ${styles.missing}`}>
                {statusText}
              </span>
            )}
            {!statusText && (
              <span className={`${styles.badge} ${styles.missing}`}>
                {t("permissions.notGranted")}
              </span>
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
