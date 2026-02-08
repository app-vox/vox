import { useEffect, useState } from "react";

export function Header() {
  const [logoSrc, setLogoSrc] = useState("");

  useEffect(() => {
    window.voxApi.resources.dataUrl("trayIcon@8x.png").then(setLogoSrc);
  }, []);

  return (
    <header className="header">
      <div className="header-title">
        {logoSrc && <img alt="Vox" src={logoSrc} className="header-logo" />}
        <span>Vox</span>
      </div>
      <span className="header-subtitle">Home</span>
    </header>
  );
}
