import { useState } from "react";
import { EyeIcon } from "./icons";

interface SecretInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SecretInput({ id, value, onChange, placeholder }: SecretInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="input-group">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="icon-btn"
        title="Show/hide"
      >
        <EyeIcon />
      </button>
    </div>
  );
}
