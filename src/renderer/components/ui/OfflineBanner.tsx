import { useOnlineStatus } from "../../hooks/use-online-status";
import { useT } from "../../i18n-context";
import styles from "./OfflineBanner.module.scss";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const t = useT();

  if (online) return null;

  return (
    <div className={styles.banner}>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <span>&#x26A0;&#xFE0F;</span>
      {t("ui.offlineWarning")}
    </div>
  );
}
