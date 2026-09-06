import { readFile } from "node:fs/promises";
import path from "node:path";
import { PortalError } from "../../lib/directory-store";
import { apiError, requireApiProfile } from "../../lib/portal-api";

export const dynamic = "force-dynamic";

const assets: Record<string, { filename: string; contentType: string }> = {
  "protocolo-sesion-diaria": { filename: "protocolo-sesion-diaria.pdf", contentType: "application/pdf" },
  "protocolo-sesion-diaria-preview": { filename: "protocolo-sesion-diaria.png", contentType: "image/png" },
  "protocolo-aniversarios": { filename: "protocolo-aniversarios.pdf", contentType: "application/pdf" },
  "protocolo-aniversarios-preview": { filename: "protocolo-aniversarios.png", contentType: "image/png" },
  "responsiva-completa-2026": { filename: "hoja-responsiva-fgdll-2026-completa.pdf", contentType: "application/pdf" },
  "responsiva-completa-2026-preview": { filename: "responsiva-completa-2026.png", contentType: "image/png" },
  "responsiva-compacta-2026": { filename: "hoja-responsiva-fgdll-2026-compacta.pdf", contentType: "application/pdf" },
  "responsiva-compacta-2026-preview": { filename: "responsiva-compacta-2026.png", contentType: "image/png" },
};

export async function GET(request: Request) {
  try {
    await requireApiProfile();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const asset = assets[id];
    if (!asset) throw new PortalError("El archivo solicitado no existe.", 404);
    const body = await readFile(path.join(process.cwd(), "app", "private-assets", "materiales", asset.filename));
    return new Response(body, {
      headers: {
        "content-type": asset.contentType,
        "content-length": String(body.byteLength),
        "content-disposition": `inline; filename="${asset.filename}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
