interface StatusBoxProps {
  text: string;
  type: "info" | "success" | "error";
}

const typeClasses: Record<string, string> = {
  info: "status-info",
  success: "status-success",
  error: "status-error",
};

export function StatusBox({ text, type }: StatusBoxProps) {
  if (!text) return null;

  return (
    <div className={`status-box ${typeClasses[type]}`}>
      {text}
    </div>
  );
}
