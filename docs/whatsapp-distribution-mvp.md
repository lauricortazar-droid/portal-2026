# Asistente de distribución por WhatsApp — MVP

## Principio

La aplicación es un asistente de distribución, no un emisor masivo. El usuario prepara un mensaje una vez, selecciona destinatarios y avanza contacto por contacto. La aplicación abre WhatsApp con el número y el texto preparado, pero nunca pulsa **Enviar**.

## Decisiones técnicas

- Ruta privada: `/administracion/envios`.
- Reutiliza el inicio de sesión y control de acceso existentes del Portal FGDLL.
- Interfaz mobile-first con navegación inferior, botones grandes y soporte para zonas seguras de iPhone.
- Apertura de WhatsApp mediante `https://wa.me/<numero>?text=<mensaje-codificado>` usando número internacional normalizado.
- Copiar mensaje como alternativa universal.
- Persistencia inicial en `localStorage` del dispositivo para validar el flujo sin exponer contactos a servicios adicionales.
- Respaldo JSON y exportación CSV disponibles desde Configuración.
- PWA con manifest y service worker limitado a recursos estáticos. Las páginas privadas autenticadas no se guardan en caché.

## MVP implementado

1. Contactos: alta, edición, búsqueda, filtro por zona y archivo.
2. Importación: texto pegado y CSV; acepta coma, punto y coma, tabulación o `|`.
3. Detección de teléfonos duplicados e inválidos.
4. Listas reutilizables con pertenencia múltiple.
5. Plantillas de mensajes.
6. Variables: `{nombre}`, `{apellido}`, `{grupo}`, `{zona}`, `{fecha}`, `{hora}`, `{lugar}`.
7. Selección de contactos, lista completa y números rápidos sin guardar.
8. Vista previa personalizada antes de iniciar.
9. Campañas persistentes con enviados, pendientes, omitidos y progreso.
10. Reanudación desde el primer destinatario pendiente.
11. Copiar mensaje y abrir WhatsApp contacto por contacto.
12. Registro de la fecha del último mensaje gestionado por contacto.
13. Estadísticas básicas.
14. Respaldo y eliminación de datos locales.
15. PWA instalable.

## Normalización de teléfonos

- Se eliminan espacios, guiones y símbolos.
- Los números de 10 dígitos usan el código de país predeterminado; inicialmente `52`.
- Los enlaces `wa.me` se generan sin `+`, paréntesis ni guiones.
- Se rechazan números normalizados menores de 8 o mayores de 15 dígitos.

## Limitaciones asumidas conscientemente

### Envío

La app no confirma por sí misma que WhatsApp haya enviado el mensaje. El usuario marca **Enviado** después de regresar a la app. Este comportamiento mantiene control humano y evita automatizaciones no autorizadas.

### Archivos

El MVP no intenta adjuntar automáticamente imágenes o PDF a WhatsApp desde un enlace web. Una etapa posterior puede usar Web Share API cuando `navigator.canShare()` confirme compatibilidad y mantener descarga/copia como alternativa.

### Contactos del teléfono

No se intenta leer la agenda completa del dispositivo. La captura manual, pegado y CSV evitan solicitar permisos invasivos y funcionan de manera consistente en iOS y Android.

### Persistencia

La primera versión usa almacenamiento local para validar producto y UX. Esto significa que el contenido no se sincroniza entre dispositivos. La siguiente etapa debe migrar contactos, listas, plantillas, campañas y eventos a D1 con aislamiento por usuario, auditoría y estrategia de respaldo.

## Modelo de datos para etapa con D1

- `distribution_contacts`
- `distribution_lists`
- `distribution_list_contacts`
- `distribution_templates`
- `distribution_campaigns`
- `distribution_campaign_recipients`
- `distribution_events`

Todas las tablas deben incluir `owner_email` o una referencia equivalente al usuario autenticado. Las consultas y mutaciones deben validar la propiedad en servidor, no sólo en cliente.

## Etapa 2 sugerida

1. Persistencia D1 por usuario y sincronización multi-dispositivo.
2. Historial detallado por contacto derivado de eventos de campaña.
3. Importación XLSX mediante parser dedicado.
4. Materiales y archivos con R2 + Web Share cuando exista soporte.
5. Instalación PWA guiada en iOS/Android.
6. Evaluación independiente de WhatsApp Business Platform / Cloud API para casos institucionales que realmente justifiquen automatización oficial.
