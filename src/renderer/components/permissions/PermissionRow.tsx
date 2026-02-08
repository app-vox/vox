import type { ReactNode } from "react";

interface PermissionRowProps {
  icon: ReactNode;
  name: string;
  description: string;
  granted: boolean;
  statusText?: string;
  buttonText: string;
  onRequest: () => void;
  requesting?: boolean;
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
}: PermissionRowProps) {
  return (
    <div className="permission-row">
      <div className="permission-info">
        {icon}
        <div>
          <div className="permission-name">{name}</div>
          <div className="permission-desc">{description}</div>
        </div>
      </div>
      <div className="permission-action">
        {granted ? (
          <span className="permission-badge granted">Granted</span>
        ) : (
          <>
            <span className="permission-badge missing">
              {statusText || "Not Granted"}
            </span>
            <button
              onClick={onRequest}
              disabled={requesting}
              className="btn btn-secondary btn-sm"
            >
              {requesting ? "Requesting..." : buttonText}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
