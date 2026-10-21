/**
 * Assessment "¿Por dónde empezar?" — Technology With Purpose / XAcademy
 * Backend del assessment: recibe cada resultado y lo guarda en la hoja "Respuestas".
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
  ['q6',         'Objetivo principal'],
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

/** Lo llama la página de Vercel al mostrar el resultado (POST con el registro en JSON). */
function doPost(e) {
  try {
    const registro = JSON.parse((e && e.postData && e.postData.contents) || '{}');
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
