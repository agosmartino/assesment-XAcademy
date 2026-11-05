/**
 * Assessment "¿Por dónde empezar?" — Technology With Purpose / XAcademy
 * Backend del assessment: recibe cada resultado y lo guarda en la hoja "Respuestas".
 * Si la persona deja su correo para novedades, se guarda aparte en la hoja
 * "Contactos" (sin vincularlo a sus respuestas, que siguen siendo anónimas).
 *
 * La página pública vive en Vercel (repo assessment-xacademy) y manda cada resultado
 * por POST a la URL /exec de este script. doGet sigue sirviendo la versión anterior
 * para que el link viejo no se rompa mientras se migra.
 *
 * Este script tiene que estar vinculado a la planilla donde se guardan las respuestas
 * (se crea desde la planilla: Extensiones > Apps Script).
 */

const NOMBRE_HOJA = 'Respuestas';
const MAX_LARGO_CAMPO = 1000; // corta textos absurdamente largos

const NOMBRE_HOJA_CONTACTOS = 'Contactos';
const COLUMNAS_CONTACTOS = ['Fecha y hora', 'Correo', 'Programa recomendado', 'Origen'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Orden de las columnas: [clave que manda el assessment, encabezado en la planilla]
const COLUMNAS = [
  ['fecha',      'Fecha y hora'],
  ['q1',         'Situación laboral'],
  ['q2',         'Rubro'],
  ['cap',        'Formación previa en tecnología'],
  ['capBis',     'Programas de XAcademy ya cursados'],
  ['q3',         'Comodidad con herramientas nuevas'],
  ['q4',         'Uso de herramientas de Google'],
  ['q5',         'Uso de IA'],
  ['q6',         'Objetivos elegidos'],
  ['q6prio',     'Objetivo prioritario'],
  ['bis',        'Desempate (7.bis)'],
  ['q7',         'Meses disponibles'],
  ['q8',         'Experiencia en programación'],
  ['q9',         'Experiencia en testing'],
  ['q10',        'IA a nivel técnico'],
  ['principal',  'Programa recomendado'],
  ['secundario', 'Siguiente paso sugerido'],
  ['exclusion',  'Nota de exclusión'],
  ['version',    'Versión del assessment']
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Assessment — Technology With Purpose')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Lo llama la página de Vercel (POST con JSON):
 * - al mostrar el resultado → fila en "Respuestas";
 * - si la persona deja su correo ({ tipo: 'contacto', ... }) → fila en "Contactos".
 */
function doPost(e) {
  try {
    const registro = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (registro.tipo === 'contacto') {
      return respuestaJson_(guardarContacto(registro));
    }
    guardarRespuesta(registro);
    return respuestaJson_({ ok: true });
  } catch (err) {
    console.error('Error guardando respuesta:', err);
    return respuestaJson_({ ok: false, error: String(err) });
  }
}

function respuestaJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Agrega una fila con el registro. Solo toma las claves de COLUMNAS. */
function guardarRespuesta(registro) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // evita que dos respuestas simultáneas se pisen
  try {
    const hoja = obtenerHoja_();
    const datos = Object.assign({}, registro, { fecha: new Date() });
    const fila = COLUMNAS.map(([clave]) => limpiar_(datos[clave]));
    hoja.appendRow(fila);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Guarda un correo para novedades de inscripción. No duplica: si el correo ya
 * está en la hoja, no agrega otra fila.
 */
function guardarContacto(datos) {
  if (datos.website) return { ok: true }; // campo trampa: lo completan solo los bots
  const email = String(datos.email || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: 'email inválido' };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hoja = obtenerHojaContactos_();
    const n = hoja.getLastRow() - 1;
    if (n > 0) {
      const existentes = hoja.getRange(2, 2, n, 1).getValues().map(r => String(r[0]).trim().toLowerCase());
      if (existentes.indexOf(email) !== -1) return { ok: true, duplicado: true };
    }
    hoja.appendRow([new Date(), limpiar_(email), limpiar_(datos.programa), limpiar_(datos.origen || 'Assessment')]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function obtenerHojaContactos_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(NOMBRE_HOJA_CONTACTOS);
  if (!hoja) hoja = ss.insertSheet(NOMBRE_HOJA_CONTACTOS);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(COLUMNAS_CONTACTOS);
    hoja.getRange(1, 1, 1, COLUMNAS_CONTACTOS.length).setFontWeight('bold').setBackground('#f1edfd');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/**
 * Normaliza cada valor antes de escribirlo. Como ahora el endpoint es público,
 * se evita que un texto que empiece con = + - @ se interprete como fórmula.
 */
function limpiar_(v) {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return v;
  let s = String(v).slice(0, MAX_LARGO_CAMPO);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/** Devuelve la hoja de respuestas; si no existe la crea con encabezados. */
function obtenerHoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(NOMBRE_HOJA);
  }
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(COLUMNAS.map(([, encabezado]) => encabezado));
    hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold').setBackground('#f1edfd');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/** Para probar desde el editor (Ejecutar > probarGuardado): agrega una fila de ejemplo. */
function probarGuardado() {
  guardarRespuesta({ q1: 'PRUEBA', principal: 'Skills Up', version: 'prueba' });
}

/** Para probar el doPost desde el editor, simulando lo que manda Vercel. */
function probarDoPost() {
  const r = doPost({ postData: { contents: JSON.stringify({ q1: 'PRUEBA doPost', principal: 'QA Manual', version: 'prueba' }) } });
  console.log(r.getContent());
}

/** Para probar el guardado de correos desde el editor. */
function probarContacto() {
  const r = doPost({ postData: { contents: JSON.stringify({ tipo: 'contacto', email: 'prueba@ejemplo.com', programa: 'QA Manual', origen: 'prueba' }) } });
  console.log(r.getContent());
}
