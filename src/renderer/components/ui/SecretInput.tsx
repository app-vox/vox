import { useState } from "react";
import { EyeIcon } from "../../../shared/icons";
import { useT } from "../../i18n-context";
import form from "../shared/forms.module.scss";

interface SecretInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
}

export function SecretInput({ id, value, onChange, onFocus, onBlur, placeholder }: SecretInputProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div className={form.inputGroup}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className={form.iconBtn}
        title={t("ui.showHide")}
      >
        <EyeIcon />
      </button>
    </div>
  );
}
