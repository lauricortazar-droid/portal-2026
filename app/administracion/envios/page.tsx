import { requireChatGPTUser } from "../../chatgpt-auth";
import { DistributionApp } from "./distribution-app";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Envíos por WhatsApp | FGDLL",
  description: "Asistente privado para preparar y distribuir mensajes contacto por contacto mediante WhatsApp.",
};

export default async function EnviosPage() {
  const user = await requireChatGPTUser("/administracion/envios");
  return <DistributionApp storageNamespace={user.email.toLowerCase()} />;
}
