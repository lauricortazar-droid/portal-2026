# Asistente de distribución por WhatsApp — MVP + sincronización D1

## Principio

La aplicación es un asistente de distribución, no un emisor masivo. El usuario prepara un mensaje una vez, selecciona destinatarios y avanza contacto por contacto. La aplicación abre WhatsApp con el número y el texto preparado, pero nunca pulsa **Enviar**.

## Decisiones técnicas

- Ruta privada: `/administracion/envios`.
- Reutiliza el inicio de sesión y control de acceso existentes del Portal FGDLL.
- Interfaz mobile-first con navegación inferior, botones grandes y soporte para zonas seguras de iPhone.
- Apertura de WhatsApp mediante `https://wa.me/<numero>?text=<mensaje-codificado>` usando número internacional normalizado.
- Copiar mensaje como alternativa universal.
- Persistencia principal sincronizada en Cloudflare D1, aislada por el correo de la cuenta autenticada.
- Copia local por cuenta como respaldo operativo para continuar si la conexión falla temporalmente.
- Migración automática: si la cuenta todavía no tiene workspace en D1 y existe información local del MVP anterior, esa información se sube al iniciar.
- Control de revisiones para evitar que un dispositivo sobrescriba silenciosamente cambios más recientes hechos en otro.
- Respaldo JSON y exportación CSV disponibles desde Configuración.
- PWA con manifest y service worker limitado a recursos estáticos. Las páginas privadas autenticadas no se guardan en caché.

## Funciones implementadas

1. Contactos: alta, edición, búsqueda, filtro por zona y archivo.
2. Importación: texto pegado y CSV; acepta coma, punto y coma, tabulación o `|`.
3. Detección de teléfonos duplicados e inválidos.
4. Listas reutilizables con pertenencia múltiple.
5. Plantillas de mensajes.
6. Variables: `{nombre}`, `{apellido}`, `{grupo}`, `{zona}`, `{fecha}`, `{hora}`, `{lugar}`.
7. Selección múltiple, seleccionar todos, lista completa y números rápidos sin guardar.
8. Vista previa personalizada antes de iniciar.
9. Campañas persistentes con enviados, pendientes, omitidos, errores y progreso.
10. Reanudación desde el primer destinatario pendiente o con error.
11. Copiar mensaje y abrir WhatsApp contacto por contacto.
12. Historial por contacto con campaña, fecha y estado, además de la fecha del último mensaje gestionado.
13. Volver a pendiente cuando se marca un estado por error.
14. Estadísticas básicas.
15. Respaldo JSON y exportación CSV.
16. Sincronización multi-dispositivo mediante D1.
17. Detección explícita de conflicto entre dispositivos.
18. PWA instalable.

## Sincronización y modelo D1

La etapa sincronizada utiliza `distribution_workspaces`.

Cada cuenta autenticada tiene un único workspace con:

- `owner_email`: propietario del espacio.
- `payload_json`: contactos, listas, plantillas, campañas y configuración.
- `revision`: versión monotónica del workspace.
- `updated_at`: última escritura aceptada por D1.

La API privada `/api/distribution` exige una cuenta con perfil activo en el portal. El correo del propietario nunca se acepta desde el cliente: se obtiene de la sesión autenticada en el servidor.

### Escritura

Cada guardado envía la revisión que el dispositivo conoce. Si D1 ya tiene otra revisión, el servidor devuelve `409` y no sobrescribe nada. La interfaz muestra dos decisiones explícitas:

- **Usar versión de la nube**.
- **Conservar este dispositivo**.

La segunda opción vuelve a leer la revisión más reciente y sólo entonces guarda el estado local como nueva revisión.

### Trabajo sin conexión

El navegador conserva una copia local separada por cuenta. Si D1 no responde, el usuario puede seguir trabajando con esa copia. Al recuperar conexión, la app intenta sincronizarla utilizando la revisión conocida. Esto no convierte la aplicación en una solución offline-first completa, pero evita perder el progreso por una interrupción corta de red.

## Privacidad

- No se leen conversaciones de WhatsApp.
- No se almacena el contenido de chats recibidos.
- No se automatiza el botón **Enviar**.
- Los datos sincronizados sólo se consultan mediante endpoints autenticados del portal y se filtran por la identidad de la sesión.
- El service worker no almacena la página privada ni respuestas de la API; sólo recursos estáticos de la PWA.
- D1 es almacenamiento del servidor, no cifrado de extremo a extremo. La seguridad depende del control de acceso del portal, de la infraestructura y de las copias de seguridad configuradas para el entorno.

## Normalización de teléfonos

- Se eliminan espacios, guiones y símbolos.
- Los números de 10 dígitos usan el código de país predeterminado; inicialmente `52`.
- Los enlaces `wa.me` se generan sin `+`, paréntesis ni guiones.
- Se rechazan números normalizados menores de 8 o mayores de 15 dígitos.

## Limitaciones asumidas conscientemente

### Envío

La app no confirma por sí misma que WhatsApp haya enviado el mensaje. El usuario marca **Enviado** después de regresar a la app. Este comportamiento mantiene control humano y evita automatizaciones no autorizadas.

### Archivos

La versión actual no intenta adjuntar automáticamente imágenes o PDF a WhatsApp desde un enlace web. Una etapa posterior puede usar Web Share API cuando `navigator.canShare()` confirme compatibilidad y mantener descarga/copia como alternativa.

### Contactos del teléfono

No se intenta leer la agenda completa del dispositivo. La captura manual, pegado y CSV evitan depender de permisos y APIs de contactos que no tienen soporte uniforme entre navegadores móviles.

### Resolución de conflictos

La aplicación evita sobrescrituras silenciosas, pero no fusiona automáticamente dos ediciones simultáneas campo por campo. Ante un conflicto pide al usuario elegir cuál estado completo conservar.

## Siguiente etapa sugerida

1. Importación XLSX mediante parser dedicado.
2. Materiales y archivos con R2 + Web Share cuando exista soporte, con descarga como alternativa.
3. Instalación PWA guiada en iOS/Android y pruebas en dispositivos reales.
4. Filtros compuestos adicionales por etiqueta, cargo, estado y lista.
5. Historial/auditoría de revisiones si el uso multiusuario crece.
6. Evaluación independiente de WhatsApp Business Platform / Cloud API sólo para casos institucionales autorizados.
