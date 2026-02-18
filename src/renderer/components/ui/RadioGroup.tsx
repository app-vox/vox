import styles from "./RadioGroup.module.scss";

export interface RadioOption {
  value: string;
  label: string;
  description: string;
  recommended?: boolean;
}

interface RadioGroupProps {
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  recommendedLabel?: string;
}

export function RadioGroup({ name, value, options, onChange, recommendedLabel }: RadioGroupProps) {
  return (
    <div className={styles.list}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`${styles.row} ${value === opt.value ? styles.rowSelected : ""}`}
          onClick={() => onChange(opt.value)}
        >
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <div className={styles.info}>
            <span className={styles.label}>
              {opt.label}
              {opt.recommended && recommendedLabel && (
                <span className={styles.recommendedBadge}>{recommendedLabel}</span>
              )}
            </span>
            <span className={styles.description}>{opt.description}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
