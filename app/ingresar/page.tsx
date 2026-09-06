import Link from "next/link";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string; email?: string }> }) {
  const params = await searchParams;
  const returnTo = params.return_to?.startsWith("/") && !params.return_to.startsWith("//") ? params.return_to : "/portal";
  return (
    <main className="login-page">
      <section className="login-card">
        <Link className="login-brand" href="/"><img src="/logo-gdll.png" alt="FGDLL" /><span>Fraternidad Guerreros de la Luz</span></Link>
        <span className="eyebrow">Zona privada</span>
        <h1>Entra al Portal FGDLL</h1>
        <p>Identifica tu servicio con el correo autorizado y la clave correspondiente a tu perfil.</p>
        {params.error === "admin" && <div className="login-error"><strong>Tu correo sí es de Administración General.</strong><br />Escribe la clave de administradores; la clave de líderes no permite entrar a este panel.</div>}
        {params.error === "portal" && <div className="login-error">El correo o la clave de acceso al portal no son correctos.</div>}
        <form action="/api/auth/login" method="post" className="login-form">
          <input type="hidden" name="return_to" value={returnTo} />
          <label><span>Nombre</span><input name="name" autoComplete="name" maxLength={160} placeholder="Tu nombre completo" /></label>
          <label><span>Correo electrónico</span><input name="email" type="email" autoComplete="email" required defaultValue={params.email ?? ""} placeholder="nombre@correo.com" /></label>
          <label><span>Clave de acceso</span><input name="code" type="password" autoComplete="current-password" required placeholder="Clave de administrador o del portal" /></label>
          <button className="button button-gold" type="submit">Entrar al portal</button>
        </form>
        <div className="login-help"><strong>Acceso de Administración General</strong><p>Los cuatro correos institucionalmente autorizados deben usar la clave privada de administradores. Los demás perfiles usan su acceso al portal.</p><a href="mailto:admin@fgdll.org?subject=Recuperar%20acceso%20administrativo">Recuperar acceso con administración</a></div>
      </section>
    </main>
  );
}
