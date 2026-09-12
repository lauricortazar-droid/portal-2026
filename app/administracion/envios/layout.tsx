import { ProtectedAccess } from "../../protected-access";

export const dynamic = "force-dynamic";

export default function EnviosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAccess returnTo="/administracion/envios">
      {children}
    </ProtectedAccess>
  );
}
