# Assessment XAcademy — "¿Por dónde empezar?"

Página pública del assessment de cursos de XAcademy / Technology With Purpose, servida desde Vercel.

Mismo esquema que la Bolsa de Trabajo:

- **Vercel** sirve la página (`index.html` + `logo.webp`), sin el banner de Apps Script.
- **Apps Script + Google Sheets** quedan como backend: cada resultado se manda por POST a la URL `/exec` del script y se agrega a la hoja **Respuestas**.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | El assessment completo (preguntas, lógica de recomendación, resultados). |
| `logo.webp` | Logo TWP, antes embebido en base64 (140 KB → 15 KB). |
| `apps-script/Codigo.gs` | Versión actualizada del `Código.gs`: agrega `doPost` para recibir los envíos. **No se publica en Vercel**, va pegado en el editor de Apps Script. |

## Puesta en marcha

1. **Apps Script**: reemplazar el contenido de `Código.gs` por `apps-script/Codigo.gs`. Ejecutar `probarDoPost` desde el editor y verificar que aparezca una fila de prueba en Respuestas (después borrarla).
2. **Nueva versión de la implementación**: Implementar → Administrar implementaciones → editar (lápiz) la implementación actual → Versión: *Nueva versión* → Implementar. Así la URL `/exec` **no cambia**. Acceso: *Cualquier usuario*.
3. **URL en el HTML**: en `index.html`, pegar esa URL `/exec` en la constante `API_URL`.
4. **Vercel**: importar este repo (Add New → Project), framework *Other*, sin build. Cada push a `main` redeploya solo.
5. **Prueba punta a punta**: completar el assessment en la URL de Vercel y verificar la fila nueva en la hoja.

## Cómo editar contenidos

Todo lo editable está al principio del `<script>` en `index.html`:

- `PROGRAMS`: duración, público y descripción de cada programa.
- `SIGNUP_URLS` / `SIGNUP_NOTES`: links de inscripción o aviso de inscripciones cerradas.
- `SOCIAL_LINKS`: pie de página.
- `CC_WORKSHOPS` / `CC_CONTACT_URL`: talleres de Ciudadanía Conectada.
- `ASSESSMENT_VERSION`: actualizarla cuando cambie la lógica, para distinguir respuestas en la hoja.

Las reglas de recomendación están en `computeResult`, `computeSecondaryFor` y funciones asociadas.

## Notas técnicas

- El envío usa `fetch` con `mode: "no-cors"` y `Content-Type: text/plain`: Apps Script no responde el preflight de CORS, así que el envío es "dispara y olvida" (la página no puede leer la respuesta). Para verificar, mirar la hoja o *Ejecuciones* en Apps Script.
- `keepalive: true` asegura que el envío termine aunque la persona cierre la pestaña al ver el resultado.
- El `doPost` solo guarda las claves de `COLUMNAS`, corta textos largos y neutraliza valores que empiecen con `= + - @` (para que no se interpreten como fórmulas), ya que el endpoint es público.
- `doGet` sigue sirviendo la versión vieja: el link de Apps Script sigue andando durante la transición.
