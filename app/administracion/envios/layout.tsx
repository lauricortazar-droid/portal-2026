import type { Metadata, Viewport } from "next";
import { ProtectedAccess } from "../../protected-access";
import "./envios.css";
import "./envios-fixes.css";
import "./envios-sync.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Envíos por WhatsApp | FGDLL",
  description: "Asistente privado para distribuir mensajes contacto por contacto mediante WhatsApp.",
  manifest: "/envios.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FGDLL Envíos",
  },
  icons: {
    icon: "/logo-gdll.png",
    apple: "/logo-gdll.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#135f3c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function EnviosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAccess returnTo="/administracion/envios">
      {children}
    </ProtectedAccess>
  );
}
