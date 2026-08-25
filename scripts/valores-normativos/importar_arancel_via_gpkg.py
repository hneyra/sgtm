#!/usr/bin/env python3
"""Convierte el GeoPackage de aranceles de terreno del MEF (planos graficos por via,
formato "M<ubigeo>0" heredado de la cobertura ArcInfo) en los archivos CSV que cargan
el catalogo vial y la tabla `arancel` de una municipalidad.

Por que existe
---------------
`docs/10-negocio/valores-normativos/aranceles-2026.md` (S1.3) documenta que el arancel de
cada via de una ciudad no viene en tabla de texto sino anotado sobre un plano grafico, y que
la forma correcta de traerlo no es releerlo a mano sino importarlo "desde el sistema GIS, con
informacion mas exacta". Este script es esa importacion. No decide ninguna cifra: cada valor
que produce es el mismo numero que ya trae el gpkg fuente, publicado por el MEF.

Que NO hace
-----------
- No inserta nada en la base. Produce archivos CSV que un caso de uso de carga (backend,
  `pe.gob.sgtm.catastro.aplicacion.ImportarArancel` / `ImportarVias`) puede leer.
- No decide si una cifra esta "verificada" (ADR-0007): el archivo de transcripcion en
  `docs/10-negocio/valores-normativos/` sigue necesitando su segunda firma antes de que
  alguien selle un conjunto de parametros con esta data.
- No sube nada a S3: eso lo hace `archivar_fuente_normativa.sh`, por separado, porque
  archivar el gpkg fuente y cargar sus valores son dos actos distintos con distinta huella.

Formato de entrada esperado
----------------------------
Un GeoPackage con una unica capa de features (lineas), nombrada "m<ubigeo>0" (convencion
observada en los planos que reparte el MEF), con al menos las columnas:

    TIPO       -- abreviatura del tipo de via: Av. / Cl. / Jr. / Pj. / Pr. (u otra: se reporta)
    NOMBRE     -- nombre de la via, sin el tipo
    VAL_V<anio> -- una columna por ejercicio, valor arancelario en soles/m2 (entero o casi)

Un valor de 0 se interpreta como "sin arancel asignado a ese arco en ese ejercicio" (no como
un arancel de S/.0), siguiendo la nota 2/3 del propio plano del MEF sobre como se anota.
Una fila sin TIPO ni NOMBRE es un arco de limite (manzana/sector), no una via, y se descarta.

Salida
------
Dentro de --salida (por omision, un directorio junto al gpkg):

    vias.csv                    codigo,tipo,nombre,ubigeo
        -- una fila por via nueva (agrupando TIPO+NOMBRE), en el formato que ya consume
           ImportarVias (#121). codigo = "<ubigeo>-NNNN", asignado en orden alfabetico
           para que reimportar el mismo gpkg produzca siempre los mismos codigos.

    arancel_<anio>.csv          viaCodigo,tramo,valorM2,documentoFuente
        -- una fila por via y grupo de valor distinto dentro de esa via, para ese ejercicio.
           Cuando una via tiene un solo valor a lo largo de todos sus arcos, tramo va vacio.
           Cuando tiene mas de uno (el caso que aranceles-2026.md S1.3 documenta: una via
           vale mas cerca de la avenida principal), tramo distingue cada grupo ("grupo N de
           M") y el detalle de que arco exacto cae en cada grupo queda en:

    arancel_<anio>_detalle.csv  viaCodigo,tramo,arcoGpkgFid,valorM2
        -- trazabilidad completa, arco a arco, hasta el `fid` del gpkg fuente. No se carga en
           la base (la base no modela geometria): es el respaldo para volver a la fuente.

    resumen.txt                 lo que un revisor humano necesita leer antes de cargar nada:
        cuantas vias y valores salieron, que filas se excluyeron y por que.

Uso
---
    python3 importar_arancel_via_gpkg.py FUENTE.gpkg \
        --norma "RM 514-2025-EF/15 (2025-10-30), Anexo 1" \
        --s3-uri s3://bucket/fuentes-normativas/aranceles/200105/2026-08-25T.../FUENTE.gpkg

Sin dependencias fuera de la libreria estandar: un GeoPackage es SQLite, y `sqlite3` alcanza
para leer los atributos (no hace falta GDAL/Fiona para esto: no se toca la geometria).
"""

from __future__ import annotations

import argparse
import csv
import re
import sqlite3
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

DOCUMENTO_FUENTE_MAXIMO = 200  # Arancel.java: DOCUMENTO_MAXIMO
TRAMO_MAXIMO = 80  # Arancel.java: LONGITUD_MAXIMA_DE_LA_SUBDIVISION
CODIGO_VIA_MAXIMO = 20  # Via.java: CODIGO_MAXIMO

# Abreviaturas observadas en los planos del MEF -> TipoVia (backend, catastro/dominio).
# Si un gpkg trae una abreviatura que no esta aqui, esas filas se reportan y se excluyen
# en vez de adivinar: TipoVia es un catalogo cerrado (la via forma parte de la direccion).
MAPA_TIPO_VIA = {
    "av.": "AVENIDA",
    "cl.": "CALLE",
    "jr.": "JIRON",
    "pj.": "PASAJE",
    "pr.": "PROLONGACION",
    "ca.": "CARRETERA",
    "mz.": "MALECON",
    "ov.": "OVALO",
    "pz.": "PLAZA",
}

PATRON_TABLA = re.compile(r"^m(\d{6})0?$", re.IGNORECASE)
PATRON_COLUMNA_VALOR = re.compile(r"^VAL_V(\d{4})$", re.IGNORECASE)


@dataclass(frozen=True)
class Arco:
    fid: int
    tipo_raw: str
    nombre: str
    valores: dict[int, int]  # ejercicio -> valor en soles/m2 (0 = sin asignar)


@dataclass
class Via:
    codigo: str
    tipo: str
    nombre: str


def main() -> int:
    argumentos = analizar_argumentos()
    conexion = sqlite3.connect(f"file:{argumentos.gpkg}?mode=ro", uri=True)
    try:
        tabla, ubigeo = resolver_capa(conexion, argumentos.ubigeo)
        columnas_valor = columnas_de_valor(conexion, tabla, argumentos.ejercicios)
        lectura = leer_arcos(conexion, tabla, columnas_valor)
    finally:
        conexion.close()

    vias, arcos_sin_valor = agrupar_vias(lectura.arcos, ubigeo)
    salida = argumentos.salida or argumentos.gpkg.parent / f"arancel-{ubigeo}"
    salida.mkdir(parents=True, exist_ok=True)

    escribir_vias_csv(salida / "vias.csv", vias)

    resumen_por_ejercicio = {}
    for ejercicio in sorted(columnas_valor):
        filas, detalle, vias_sin_valor = construir_filas_de_arancel(
            lectura.arcos, vias, ejercicio, argumentos.norma, argumentos.s3_uri, argumentos.gpkg.name
        )
        escribir_arancel_csv(salida / f"arancel_{ejercicio}.csv", filas)
        escribir_detalle_csv(salida / f"arancel_{ejercicio}_detalle.csv", detalle)
        resumen_por_ejercicio[ejercicio] = (len(filas), len(vias_sin_valor))

    escribir_resumen(
        salida / "resumen.txt",
        gpkg=argumentos.gpkg,
        tabla=tabla,
        ubigeo=ubigeo,
        lectura=lectura,
        vias=vias,
        arcos_sin_valor_en_ningun_ejercicio=len(arcos_sin_valor),
        resumen_por_ejercicio=resumen_por_ejercicio,
    )

    print(f"Listo. {len(vias)} via(s), {len(columnas_valor)} ejercicio(s). Salida en {salida}")
    print(f"Revisar {salida / 'resumen.txt'} antes de usar estos archivos para cargar nada.")
    return 0


def analizar_argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("gpkg", type=Path, help="Ruta al GeoPackage de aranceles del MEF")
    parser.add_argument(
        "--ubigeo",
        help="Codigo UBIGEO de 6 digitos. Si se omite, se toma del nombre de la capa (m<ubigeo>0)",
    )
    parser.add_argument(
        "--ejercicios",
        help="Lista de ejercicios separados por coma (p.ej. 2026,2027). "
        "Por omision, todas las columnas VAL_V<anio> que traiga el gpkg",
    )
    parser.add_argument(
        "--norma",
        default="RM 514-2025-EF/15 (2025-10-30), Anexo 1 — Valores Arancelarios de Terrenos "
        "Urbanos, planos graficos",
        help="Cita de la norma que aprueba estos valores, para documentoFuente",
    )
    parser.add_argument(
        "--s3-uri",
        default=None,
        help="URI del gpkg ya archivado en S3 (ver archivar_fuente_normativa.sh). "
        "Se referencia en documentoFuente para que una cifra cargada apunte a su fuente "
        "exacta; si se omite, se referencia el nombre de archivo local",
    )
    parser.add_argument(
        "--salida", type=Path, default=None, help="Directorio de salida (por omision, junto al gpkg)"
    )
    argumentos = parser.parse_args()
    if not argumentos.gpkg.is_file():
        parser.error(f"No existe el archivo: {argumentos.gpkg}")
    if argumentos.ejercicios:
        argumentos.ejercicios = {int(a) for a in argumentos.ejercicios.split(",")}
    return argumentos


def resolver_capa(conexion: sqlite3.Connection, ubigeo_forzado: str | None) -> tuple[str, str]:
    filas = conexion.execute(
        "SELECT table_name FROM gpkg_contents WHERE data_type = 'features'"
    ).fetchall()
    if len(filas) != 1:
        raise SystemExit(
            f"Se esperaba exactamente una capa de features en el gpkg y hay {len(filas)}: "
            f"{[f[0] for f in filas]}. Este script asume un plano de una sola municipalidad."
        )
    tabla = filas[0][0]
    coincide = PATRON_TABLA.match(tabla)
    if ubigeo_forzado:
        ubigeo = ubigeo_forzado
    elif coincide:
        ubigeo = coincide.group(1)
    else:
        raise SystemExit(
            f"La capa se llama «{tabla}» y de ahi no se puede leer un UBIGEO; "
            "pasa --ubigeo explicitamente."
        )
    if not re.fullmatch(r"\d{6}", ubigeo):
        raise SystemExit(f"UBIGEO invalido: «{ubigeo}» (van 6 digitos)")
    return tabla, ubigeo


def columnas_de_valor(
    conexion: sqlite3.Connection, tabla: str, ejercicios_pedidos: set[int] | None
) -> dict[int, str]:
    columnas = conexion.execute(f'PRAGMA table_info("{tabla}")').fetchall()
    encontradas = {}
    for _, nombre, *_resto in columnas:
        coincide = PATRON_COLUMNA_VALOR.match(nombre)
        if coincide:
            encontradas[int(coincide.group(1))] = nombre
    if not encontradas:
        raise SystemExit(
            f"Ninguna columna VAL_V<anio> en «{tabla}»: no hay valores arancelarios que leer."
        )
    if ejercicios_pedidos:
        faltantes = ejercicios_pedidos - encontradas.keys()
        if faltantes:
            raise SystemExit(
                f"Se pidieron los ejercicios {sorted(faltantes)} y el gpkg no los trae. "
                f"Trae: {sorted(encontradas)}"
            )
        return {e: encontradas[e] for e in ejercicios_pedidos}
    return encontradas


@dataclass
class LecturaDeArcos:
    arcos: list[Arco]
    total_filas: int
    arcos_de_limite: int  # sin TIPO o sin NOMBRE: no son via, son borde de manzana/sector
    arcos_de_tipo_no_mapeado: int
    tipos_no_mapeados: set[str]


def leer_arcos(conexion: sqlite3.Connection, tabla: str, columnas_valor: dict[int, str]) -> LecturaDeArcos:
    columnas_sql = ", ".join(f'"{c}"' for c in columnas_valor.values())
    cursor = conexion.execute(f'SELECT fid, TIPO, NOMBRE, {columnas_sql} FROM "{tabla}"')
    arcos = []
    total_filas = 0
    arcos_de_limite = 0
    arcos_de_tipo_no_mapeado = 0
    tipos_no_mapeados: set[str] = set()
    for fila in cursor:
        total_filas += 1
        fid, tipo_raw, nombre = fila[0], fila[1], fila[2]
        valores_raw = fila[3:]
        if not tipo_raw or not nombre:
            arcos_de_limite += 1
            continue  # arco de limite de manzana/sector, no una via (ver docstring)
        clave = tipo_raw.strip().lower()
        if clave not in MAPA_TIPO_VIA:
            tipos_no_mapeados.add(tipo_raw)
            arcos_de_tipo_no_mapeado += 1
            continue
        valores = {
            ejercicio: int(v) if v is not None else 0
            for ejercicio, v in zip(columnas_valor.keys(), valores_raw)
        }
        arcos.append(Arco(fid=fid, tipo_raw=tipo_raw.strip(), nombre=nombre.strip(), valores=valores))
    return LecturaDeArcos(
        arcos, total_filas, arcos_de_limite, arcos_de_tipo_no_mapeado, tipos_no_mapeados
    )


def agrupar_vias(arcos: list[Arco], ubigeo: str) -> tuple[dict[tuple[str, str], Via], list[Arco]]:
    """Une los arcos en vias por (tipo, nombre). Descarta vias sin ningun valor > 0 en ningun
    ejercicio: cargar una via sin ningun arancel no aporta nada a esta importacion (el
    catalogo vial completo, con o sin arancel, es responsabilidad de ImportarVias/#121)."""
    claves = sorted({(MAPA_TIPO_VIA[a.tipo_raw.lower()], a.nombre) for a in arcos})
    vias: dict[tuple[str, str], Via] = {}
    sin_valor: list[Arco] = []
    contador = 0
    arcos_por_clave: dict[tuple[str, str], list[Arco]] = defaultdict(list)
    for arco in arcos:
        arcos_por_clave[(MAPA_TIPO_VIA[arco.tipo_raw.lower()], arco.nombre)].append(arco)

    for clave in claves:
        tipo, nombre = clave
        segmentos = arcos_por_clave[clave]
        tiene_valor = any(v > 0 for arco in segmentos for v in arco.valores.values())
        if not tiene_valor:
            sin_valor.extend(segmentos)
            continue
        contador += 1
        codigo = f"{ubigeo}-{contador:04d}"
        if len(codigo) > CODIGO_VIA_MAXIMO:
            raise SystemExit(f"Codigo de via demasiado largo: {codigo}")
        vias[clave] = Via(codigo=codigo, tipo=tipo, nombre=nombre)
    return vias, sin_valor


def construir_filas_de_arancel(
    arcos: list[Arco],
    vias: dict[tuple[str, str], Via],
    ejercicio: int,
    norma: str,
    s3_uri: str | None,
    nombre_archivo: str,
) -> tuple[list[tuple[str, str, str, str]], list[tuple[str, str, int, str]], list[Via]]:
    fuente_gpkg = s3_uri or nombre_archivo
    por_via: dict[tuple[str, str], list[Arco]] = defaultdict(list)
    for arco in arcos:
        clave = (MAPA_TIPO_VIA.get(arco.tipo_raw.lower()), arco.nombre)
        if clave in vias:
            por_via[clave].append(arco)

    filas = []
    detalle = []
    vias_sin_valor_este_ejercicio = []
    for clave, via in vias.items():
        segmentos = [(a.fid, a.valores[ejercicio]) for a in por_via[clave] if a.valores[ejercicio] > 0]
        if not segmentos:
            vias_sin_valor_este_ejercicio.append(via)
            continue
        distintos = sorted({v for _, v in segmentos}, reverse=True)
        if len(distintos) == 1:
            documento = f"{norma} — {fuente_gpkg}"
            _validar_longitud(documento, DOCUMENTO_FUENTE_MAXIMO, "documentoFuente")
            filas.append((via.codigo, "", str(distintos[0]), documento))
            for fid, valor in segmentos:
                detalle.append((via.codigo, "", fid, str(valor)))
        else:
            total = len(distintos)
            for n, valor in enumerate(distintos, start=1):
                tramo = f"grupo {n} de {total}"
                _validar_longitud(tramo, TRAMO_MAXIMO, "tramo")
                documento = f"{norma} — {fuente_gpkg}"
                _validar_longitud(documento, DOCUMENTO_FUENTE_MAXIMO, "documentoFuente")
                filas.append((via.codigo, tramo, str(valor), documento))
            for fid, valor in segmentos:
                n = distintos.index(valor) + 1
                detalle.append((via.codigo, f"grupo {n} de {total}", fid, str(valor)))

    return filas, detalle, vias_sin_valor_este_ejercicio


def _validar_longitud(texto: str, maximo: int, campo: str) -> None:
    if len(texto) > maximo:
        raise SystemExit(f"«{texto}» supera los {maximo} caracteres permitidos para {campo}")


def escribir_vias_csv(ruta: Path, vias: dict[tuple[str, str], Via]) -> None:
    with ruta.open("w", newline="", encoding="utf-8") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(["codigo", "tipo", "nombre", "ubigeo"])
        for via in sorted(vias.values(), key=lambda v: v.codigo):
            escritor.writerow([via.codigo, via.tipo, via.nombre, ""])


def escribir_arancel_csv(ruta: Path, filas: list[tuple[str, str, str, str]]) -> None:
    with ruta.open("w", newline="", encoding="utf-8") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(["viaCodigo", "tramo", "valorM2", "documentoFuente"])
        for fila in sorted(filas, key=lambda f: (f[0], f[1])):
            escritor.writerow(fila)


def escribir_detalle_csv(ruta: Path, detalle: list[tuple[str, str, int, str]]) -> None:
    with ruta.open("w", newline="", encoding="utf-8") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(["viaCodigo", "tramo", "arcoGpkgFid", "valorM2"])
        for fila in sorted(detalle, key=lambda f: (f[0], f[1], f[2])):
            escritor.writerow(fila)


def escribir_resumen(
    ruta: Path,
    *,
    gpkg: Path,
    tabla: str,
    ubigeo: str,
    lectura: LecturaDeArcos,
    vias: dict[tuple[str, str], Via],
    arcos_sin_valor_en_ningun_ejercicio: int,
    resumen_por_ejercicio: dict[int, tuple[int, int]],
) -> None:
    with ruta.open("w", encoding="utf-8") as archivo:
        archivo.write(f"Fuente: {gpkg}\n")
        archivo.write(f"Capa: {tabla}  UBIGEO: {ubigeo}\n")
        archivo.write(f"Filas totales en el gpkg: {lectura.total_filas}\n")
        archivo.write(
            f"  - arcos de limite de manzana/sector (sin TIPO o sin NOMBRE, no son via): "
            f"{lectura.arcos_de_limite}\n"
        )
        archivo.write(
            f"  - arcos con TIPO sin mapeo a TipoVia (excluidos, ver aviso abajo): "
            f"{lectura.arcos_de_tipo_no_mapeado}\n"
        )
        archivo.write(f"  - arcos de via reconocidos: {len(lectura.arcos)}\n")
        archivo.write(
            f"      de los cuales, sin ningun arancel > 0 en ningun ejercicio (excluidos): "
            f"{arcos_sin_valor_en_ningun_ejercicio}\n"
        )
        archivo.write(f"Vias con al menos un arancel > 0 en algun ejercicio: {len(vias)}\n")
        if lectura.tipos_no_mapeados:
            archivo.write(
                "\nATENCION — abreviaturas de TIPO sin mapeo a TipoVia, sus arcos NO se "
                f"importaron: {sorted(lectura.tipos_no_mapeados)}\n"
                "Agregar el mapeo en MAPA_TIPO_VIA y volver a correr el script.\n"
            )
        archivo.write("\nPor ejercicio:\n")
        for ejercicio, (filas, vias_sin_valor) in sorted(resumen_por_ejercicio.items()):
            archivo.write(
                f"  {ejercicio}: {filas} fila(s) de arancel; {vias_sin_valor} via(s) sin "
                "valor asignado ese ejercicio (existen otros anios)\n"
            )
        archivo.write(
            "\nEsto es una TRANSCRIPCION AUTOMATICA, no una carga. Antes de usarla:\n"
            "  1. Un segundo revisor (no quien corrio este script) confirma que la cita de la\n"
            "     norma y el archivo fuente son correctos (ADR-0007: dos firmas).\n"
            "  2. El gpkg fuente se archiva en S3 (archivar_fuente_normativa.sh) y ese URI\n"
            "     reemplaza al nombre de archivo local en documentoFuente antes de cargar.\n"
            "  3. Alguien abre un conjunto de parametros (AdministrarParametros.abrirVersion)\n"
            "     y solo entonces se cargan estas filas contra ese conjunto — nunca contra uno\n"
            "     ya sellado (V18 lo rechaza).\n"
        )


if __name__ == "__main__":
    sys.exit(main())
