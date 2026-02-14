import { useOnlineStatus } from "../../hooks/use-online-status";
import { useT } from "../../i18n-context";
import { AlertTriangleIcon } from "../../../shared/icons";
import styles from "./OfflineBanner.module.scss";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const t = useT();

  if (online) return null;

  return (
    <div className={styles.banner}>
      <AlertTriangleIcon width={14} height={14} />
      {t("ui.offlineWarning")}
    </div>
  );
}
