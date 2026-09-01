/**
 * Exportar a CSV lo que la tabla tiene delante.
 *
 * El artboard dibuja un boton «Excel» en media docena de pantallas y ninguno
 * hacia nada. Ninguna operacion del backend devuelve un XLSX de un listado, asi
 * que hay tres salidas: dejarlo inerte, apagarlo, o exportar de verdad lo que se
 * esta viendo. La tercera es la unica que le sirve a quien atiende, y no
 * necesita backend.
 *
 * **Se exporta la pagina que se ve, no el conjunto.** Decir «Excel» y bajar
 * 14 422 filas exigiria recorrer el padron entero desde el navegador; y decir
 * «Excel» y bajar 20 sin avisar seria peor. El nombre del archivo lo dice y
 * quien llama pasa el conteo para que la interfaz pueda advertirlo.
 */

/** Escapa una celda para CSV: comillas dobles y separador dentro del valor. */
function celda(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * Descarga un CSV con las filas dadas.
 *
 * Va con **punto y coma** y con BOM: es lo que Excel en configuracion regional
 * de Peru abre sin pasar por el asistente de importacion. Con coma y sin BOM,
 * el archivo se abre con todo en la primera columna y las tildes rotas, que es
 * como se descarta una exportacion por inutil.
 */
export function exportarCsv(nombre: string, cabeceras: readonly string[], filas: readonly unknown[][]): void {
  const lineas = [cabeceras.map(celda).join(';'), ...filas.map((f) => f.map(celda).join(';'))];
  const contenido = '﻿' + lineas.join('\r\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
