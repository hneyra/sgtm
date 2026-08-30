#!/usr/bin/env python3
"""Convierte el GeoPackage del plano catastral de una municipalidad en el CSV de lotes
que carga `pe.gob.sgtm.catastro.aplicacion.ImportarPrediosDelPlano` (ADR-0021, #400).

Por que existe
---------------
El alta de predios de una municipalidad real es una importacion cartografica: el lote
existe en el plano antes que en el padron. Hasta ADR-0021 la base no modelaba geometria y
el guion hermano de aranceles (`scripts/valores-normativos/importar_arancel_via_gpkg.py`)
lo decia de si mismo -- «no se carga en la base (la base no modela geometria)»: leia el
gpkg, sacaba los atributos y tiraba el poligono. Aqui el poligono es el dato.

Que NO hace
-----------
- No inserta nada en la base. Produce un CSV que lee un cargador del backend
  (`CargarPredios`, perfil batch), igual que el de aranceles.
- No calcula areas ni las propone como area imponible. El area del poligono NO es el
  area de la ficha: derivarla cambiaria el autovaluo de todo el padron sin que nadie lo
  decidiera (ADR-0021). El resumen la imprime como referencia, y ahi se queda.
- No inventa el codigo de referencia catastral. Los tramos salen de columnas del gpkg,
  en el orden que se le declare; componerlos y validarlos es del dominio.
- No decide el tipo de predio si el plano no lo trae: hay que declararlo.

Sin dependencias fuera de la biblioteca estandar: un GeoPackage es SQLite, y la geometria
es una cabecera «GP» corta seguida de WKB estandar, que se convierte a WKT aqui mismo. No
hace falta GDAL ni Fiona.

Uso
---
    # 1. Ver que trae el archivo, que es lo primero que hay que saber
    python3 importar_predios_gpkg.py PLANO.gpkg --listar

    # 2. Convertir, declarando que columna es cada cosa
    python3 importar_predios_gpkg.py PLANO.gpkg \
        --capa lotes \
        --tramos UBIGEO,SECTOR,MANZANA,LOTE,EDIF,ENTRADA,PISO,UNIDAD \
        --direccion DIRECCION --tipo-fijo URBANO \
        --sector SECTOR --manzana MANZANA --lote LOTE \
        --salida ./carga

    # 3. Comprobar que el propio guion hace lo que dice
    python3 importar_predios_gpkg.py --autoprueba

Salida
------
Dentro de --salida (por omision, un directorio junto al gpkg):

    predios.csv   los tramos del codigo, y despues tipoPredio, direccion, codigoVia,
                  numeroMunicipal, codigoSector, codigoManzana, lote, geometria(WKT).
                  Es el formato exacto que `ImportarPrediosDelPlano` lee.
    resumen.txt   lo que un revisor humano necesita leer antes de cargar nada: cuantos
                  lotes salieron, cuales se excluyeron y por que, y el rectangulo que
                  ocupan -- si ese rectangulo no cae sobre el distrito, el plano no es
                  el que se creia y conviene enterarse antes y no despues.
"""

from __future__ import annotations

import argparse
import csv
import os
import sqlite3
import struct
import sys
import tempfile

# ---------------------------------------------------------------- geometria

WKB_POLYGON = 3
WKB_MULTIPOLYGON = 6


class GeometriaNoAdmitida(Exception):
    """El blob no es un poligono: un punto o una linea no describen un lote."""


def wkt_de_blob_gpkg(blob: bytes) -> str:
    """El poligono del lote en WKT, siempre como MULTIPOLYGON.

    La columna de la base es `geography(MultiPolygon, 4326)`, asi que un POLYGON simple se
    promueve en vez de rechazarse: son la misma figura y partir la carga por eso seria
    exigirle al GIS de la municipalidad una convencion que no tiene por que tener.
    """
    if len(blob) < 8 or blob[0:2] != b"GP":
        raise GeometriaNoAdmitida("el blob no empieza por la cabecera 'GP' de GeoPackage")

    banderas = blob[3]
    orden_cabecera = "<" if banderas & 0x01 else ">"
    indicador_envolvente = (banderas >> 1) & 0x07
    if banderas & 0x10:
        raise GeometriaNoAdmitida("la geometria esta marcada como vacia")

    dobles = {0: 0, 1: 4, 2: 6, 3: 6, 4: 8}.get(indicador_envolvente)
    if dobles is None:
        raise GeometriaNoAdmitida(f"indicador de envolvente desconocido: {indicador_envolvente}")

    srs_id = struct.unpack_from(orden_cabecera + "i", blob, 4)[0]
    inicio = 8 + dobles * 8
    wkt = _wkt_de_wkb(blob, inicio)
    return wkt, srs_id


def _wkt_de_wkb(datos: bytes, desplazamiento: int) -> str:
    orden, tipo, desplazamiento = _cabecera_wkb(datos, desplazamiento)

    if tipo == WKB_POLYGON:
        anillos, _ = _leer_poligono(datos, desplazamiento, orden)
        return "MULTIPOLYGON(" + _texto_poligono(anillos) + ")"

    if tipo == WKB_MULTIPOLYGON:
        cuantos = struct.unpack_from(orden + "I", datos, desplazamiento)[0]
        desplazamiento += 4
        partes = []
        for _ in range(cuantos):
            # Cada poligono de un multipoligono trae SU PROPIA cabecera WKB, con su orden
            # de bytes: no se hereda la de fuera.
            orden_parte, tipo_parte, desplazamiento = _cabecera_wkb(datos, desplazamiento)
            if tipo_parte != WKB_POLYGON:
                raise GeometriaNoAdmitida(
                    f"un multipoligono trae una parte de tipo {tipo_parte}, y solo admite poligonos"
                )
            anillos, desplazamiento = _leer_poligono(datos, desplazamiento, orden_parte)
            partes.append(_texto_poligono(anillos))
        return "MULTIPOLYGON(" + ",".join(partes) + ")"

    raise GeometriaNoAdmitida(
        f"tipo de geometria {tipo}: un lote es un poligono, y esto no lo es"
    )


def _cabecera_wkb(datos: bytes, desplazamiento: int):
    orden = "<" if datos[desplazamiento] == 1 else ">"
    tipo = struct.unpack_from(orden + "I", datos, desplazamiento + 1)[0]
    # ISO WKB marca Z, M y ZM sumando 1000, 2000 y 3000. Se conserva solo la figura: la
    # cota de un lote no la usa nadie aqui, y arrastrarla obligaria a la columna a ser 3D.
    return orden, tipo % 1000, desplazamiento + 5


def _leer_poligono(datos: bytes, desplazamiento: int, orden: str):
    cuantos_anillos = struct.unpack_from(orden + "I", datos, desplazamiento)[0]
    desplazamiento += 4
    anillos = []
    for _ in range(cuantos_anillos):
        cuantos_puntos = struct.unpack_from(orden + "I", datos, desplazamiento)[0]
        desplazamiento += 4
        puntos = []
        for _ in range(cuantos_puntos):
            x, y = struct.unpack_from(orden + "dd", datos, desplazamiento)
            desplazamiento += 16
            puntos.append((x, y))
        anillos.append(puntos)
    return anillos, desplazamiento


def _texto_poligono(anillos) -> str:
    return "((" + "),(".join(
        ",".join(f"{x:.8f} {y:.8f}" for x, y in anillo) for anillo in anillos
    ) + "))"


# ---------------------------------------------------------------- gpkg

def capas(conexion) -> list[str]:
    return [
        fila[0]
        for fila in conexion.execute(
            "SELECT table_name FROM gpkg_contents WHERE data_type = 'features' ORDER BY 1"
        )
    ]


def columnas(conexion, capa: str) -> list[str]:
    return [fila[1] for fila in conexion.execute(f'PRAGMA table_info("{capa}")')]


def columna_de_geometria(conexion, capa: str) -> str:
    fila = conexion.execute(
        "SELECT column_name FROM gpkg_geometry_columns WHERE table_name = ?", (capa,)
    ).fetchone()
    if fila is None:
        raise SystemExit(f"La capa '{capa}' no declara columna de geometria en el GeoPackage")
    return fila[0]


# ---------------------------------------------------------------- conversion

def convertir(conexion, opciones):
    capa = opciones.capa or (capas(conexion) or [None])[0]
    if capa is None:
        raise SystemExit("El GeoPackage no tiene ninguna capa de features")

    disponibles = columnas(conexion, capa)
    geom = columna_de_geometria(conexion, capa)
    tramos = [t.strip() for t in opciones.tramos.split(",") if t.strip()]

    pedidas = tramos + [
        c for c in (opciones.direccion, opciones.tipo, opciones.via, opciones.numero,
                    opciones.sector, opciones.manzana, opciones.lote) if c
    ]
    faltan = [c for c in pedidas if c not in disponibles]
    if faltan:
        raise SystemExit(
            f"La capa '{capa}' no tiene la(s) columna(s) {faltan}. Tiene: {disponibles}"
        )

    filas, excluidas = [], []
    limites = None
    seleccion = ", ".join(f'"{c}"' for c in pedidas + [geom])
    for numero, fila in enumerate(conexion.execute(f'SELECT {seleccion} FROM "{capa}"'), start=1):
        valores = dict(zip(pedidas + [geom], fila))
        blob = valores[geom]
        if blob is None:
            excluidas.append((numero, "sin geometria"))
            continue
        try:
            wkt, srs_id = wkt_de_blob_gpkg(blob)
        except GeometriaNoAdmitida as problema:
            excluidas.append((numero, str(problema)))
            continue
        if srs_id not in (0, 4326):
            excluidas.append(
                (numero, f"SRID {srs_id}: el destino es WGS84 (4326) y aqui no se reproyecta")
            )
            continue

        tipo = opciones.tipo_fijo or _texto(valores.get(opciones.tipo))
        if not tipo:
            excluidas.append((numero, "sin tipo de predio, y no se declaro --tipo-fijo"))
            continue
        direccion = _texto(valores.get(opciones.direccion))
        if not direccion:
            excluidas.append((numero, "sin direccion"))
            continue

        filas.append(
            [_texto(valores[t]) for t in tramos]
            + [
                tipo,
                direccion,
                _texto(valores.get(opciones.via)),
                _texto(valores.get(opciones.numero)),
                _texto(valores.get(opciones.sector)),
                _texto(valores.get(opciones.manzana)),
                _texto(valores.get(opciones.lote)),
                wkt,
            ]
        )
        limites = _ensanchar(limites, wkt)

    return capa, filas, excluidas, limites


def _texto(valor) -> str:
    return "" if valor is None else str(valor).strip()


def _ensanchar(limites, wkt: str):
    numeros = [
        float(p)
        for par in wkt[len("MULTIPOLYGON(((") : -3].replace("),(", ",").replace(")),((", ",").split(",")
        for p in par.split()
        if _es_numero(p)
    ]
    xs, ys = numeros[0::2], numeros[1::2]
    if not xs:
        return limites
    propio = (min(xs), min(ys), max(xs), max(ys))
    if limites is None:
        return propio
    return (
        min(limites[0], propio[0]),
        min(limites[1], propio[1]),
        max(limites[2], propio[2]),
        max(limites[3], propio[3]),
    )


def _es_numero(texto: str) -> bool:
    try:
        float(texto)
        return True
    except ValueError:
        return False


# ---------------------------------------------------------------- autoprueba

def autoprueba() -> int:
    """Comprueba que el guion hace lo que dice, con un GeoPackage minimo hecho aqui.

    Existe porque su hermano de aranceles no la tiene y nadie lo corre: una verificacion
    escrita que nunca se ejecuta no protege nada (#188). Esta corre en CI.
    """
    fallos = []

    def afirmar(condicion, que):
        if not condicion:
            fallos.append(que)

    class seccion:
        """Una excepcion inesperada es UN fallo con su nombre, no un traceback.

        Sin esto, la primera rotura mata la corrida y las demas comprobaciones no llegan
        a correr: se informa un problema donde puede haber cinco, y se informa como un
        volcado de pila en vez de como una frase.
        """

        def __init__(self, nombre):
            self.nombre = nombre

        def __enter__(self):
            return self

        def __exit__(self, tipo, valor, traza):
            if tipo is not None and tipo is not KeyboardInterrupt:
                fallos.append(f"{self.nombre}: reviento con {tipo.__name__}: {valor}")
                return True
            return False

    with seccion("poligono simple"):
        # Un poligono simple, little-endian, sin envolvente: se promueve a MULTIPOLYGON.
        anillo = [(-80.68, -5.27), (-80.67, -5.27), (-80.67, -5.28), (-80.68, -5.28), (-80.68, -5.27)]
        wkb = struct.pack("<BI", 1, WKB_POLYGON) + struct.pack("<I", 1) + struct.pack("<I", len(anillo))
        for x, y in anillo:
            wkb += struct.pack("<dd", x, y)
        blob = b"GP" + bytes([0, 0x01]) + struct.pack("<i", 4326) + wkb
        wkt, srid = wkt_de_blob_gpkg(blob)
        afirmar(wkt.startswith("MULTIPOLYGON((("), f"un POLYGON debe promoverse: {wkt[:40]}")
        afirmar(srid == 4326, f"el SRID debe leerse: {srid}")
        afirmar(wkt.count("-80.68000000") == 3, f"deben salir los tres vertices en -80.68: {wkt}")

    with seccion("envolvente declarada"):
        # Con envolvente declarada (4 dobles), el WKB empieza 32 bytes mas alla.
        blob_env = b"GP" + bytes([0, 0x03]) + struct.pack("<i", 4326) + struct.pack("<dddd", 0, 0, 0, 0) + wkb
        afirmar(wkt_de_blob_gpkg(blob_env)[0] == wkt, "la envolvente debe saltarse, no leerse")

    with seccion("un punto no es un lote"):
        # Un punto no es un lote.
        punto = b"GP" + bytes([0, 0x01]) + struct.pack("<i", 4326) + struct.pack("<BI", 1, 1) + struct.pack("<dd", 0, 0)
        try:
            wkt_de_blob_gpkg(punto)
            fallos.append("un POINT tenia que rechazarse")
        except GeometriaNoAdmitida:
            pass

    with seccion("big-endian"):
        # Big-endian: el orden lo dice cada geometria, no la maquina.
        wkb_be = struct.pack(">BI", 0, WKB_POLYGON) + struct.pack(">I", 1) + struct.pack(">I", len(anillo))
        for x, y in anillo:
            wkb_be += struct.pack(">dd", x, y)
        blob_be = b"GP" + bytes([0, 0x01]) + struct.pack("<i", 4326) + wkb_be
        afirmar(wkt_de_blob_gpkg(blob_be)[0] == wkt, "big-endian debe dar el mismo poligono")

    with seccion("multipoligono de dos partes"):
        # Un MULTIPOLYGON con DOS partes, la segunda en el orden contrario. Es el caso que
        # se rompe solo si se hereda la cabecera de fuera en vez de leer la de cada parte, y
        # sin el la regla se podria quitar sin que nada lo dijera.
        otro = [(-80.60, -5.20), (-80.59, -5.20), (-80.59, -5.21), (-80.60, -5.21), (-80.60, -5.20)]
        parte_le = struct.pack("<BI", 1, WKB_POLYGON) + struct.pack("<I", 1) + struct.pack("<I", len(anillo))
        for x, y in anillo:
            parte_le += struct.pack("<dd", x, y)
        parte_be = struct.pack(">BI", 0, WKB_POLYGON) + struct.pack(">I", 1) + struct.pack(">I", len(otro))
        for x, y in otro:
            parte_be += struct.pack(">dd", x, y)
        multi = struct.pack("<BI", 1, WKB_MULTIPOLYGON) + struct.pack("<I", 2) + parte_le + parte_be
        blob_multi = b"GP" + bytes([0, 0x01]) + struct.pack("<i", 4326) + multi
        wkt_multi = wkt_de_blob_gpkg(blob_multi)[0]
        afirmar(wkt_multi.count("((") == 2, f"deben salir dos partes: {wkt_multi[:60]}")
        afirmar("-80.60000000" in wkt_multi, f"la parte big-endian debe leerse bien: {wkt_multi[-60:]}")
        afirmar("-80.68000000" in wkt_multi, "la parte little-endian tambien")

    with seccion("recorrido entero"):
        # Y el recorrido entero contra un GeoPackage de verdad, hecho a mano.
        with tempfile.TemporaryDirectory() as temporal:
            ruta = os.path.join(temporal, "plano.gpkg")
            conexion = sqlite3.connect(ruta)
            conexion.execute("CREATE TABLE gpkg_contents (table_name TEXT, data_type TEXT)")
            conexion.execute("CREATE TABLE gpkg_geometry_columns (table_name TEXT, column_name TEXT)")
            conexion.execute("INSERT INTO gpkg_contents VALUES ('lotes','features')")
            conexion.execute("INSERT INTO gpkg_geometry_columns VALUES ('lotes','geom')")
            conexion.execute(
                "CREATE TABLE lotes (UBIGEO TEXT, SECTOR TEXT, MANZANA TEXT, LOTE TEXT,"
                " DIRECCION TEXT, geom BLOB)"
            )
            conexion.execute(
                "INSERT INTO lotes VALUES ('200105','01','001','01','AV. GRAU 100', ?)", (blob,)
            )
            conexion.execute(
                "INSERT INTO lotes VALUES ('200105','01','001','02','SIN GEOMETRIA', NULL)"
            )
            # Un lote en UTM 17S. Aqui no se reproyecta, asi que tiene que quedarse fuera:
            # aceptarlo pondria las coordenadas del distrito en mitad del Atlantico, y un
            # poligono valido en el sitio equivocado no lo delata ninguna consulta.
            blob_utm = b"GP" + bytes([0, 0x01]) + struct.pack("<i", 32717) + wkb
            conexion.execute(
                "INSERT INTO lotes VALUES ('200105','01','001','03','EN UTM', ?)", (blob_utm,)
            )
            conexion.commit()

            opciones = argparse.Namespace(
                capa="lotes", tramos="UBIGEO,SECTOR,MANZANA,LOTE", direccion="DIRECCION",
                tipo=None, tipo_fijo="URBANO", via=None, numero=None,
                sector="SECTOR", manzana="MANZANA", lote="LOTE",
            )
            capa, filas, excluidas, limites = convertir(conexion, opciones)
            afirmar(capa == "lotes", f"capa: {capa}")
            afirmar(len(filas) == 1, f"debe salir 1 lote y salieron {len(filas)}")
            afirmar(
                len(excluidas) == 2,
                f"deben excluirse el lote sin geometria y el que viene en UTM: {excluidas}",
            )
            afirmar(
                any("SRID 32717" in motivo for _, motivo in excluidas),
                f"y el motivo del segundo tiene que nombrar el SRID: {excluidas}",
            )
            afirmar(filas[0][:4] == ["200105", "01", "001", "01"], f"tramos: {filas[0][:4]}")
            afirmar(filas[0][4] == "URBANO", f"tipo: {filas[0][4]}")
            afirmar(filas[0][-1].startswith("MULTIPOLYGON"), "la ultima columna es la geometria")
            afirmar(
                len(filas[0]) == 4 + 8,
                f"la fila debe tener los tramos y ocho columnas mas, y tiene {len(filas[0])}",
            )
            afirmar(limites is not None and limites[0] < -80.6, f"limites: {limites}")
            conexion.close()

    with seccion("el CSV no parte la geometria"):
        # Un WKT lleva comas. Sin comillas, el CSV lo parte en columnas y la fila entera
        # pierde el sentido -- y no falla ruidosamente: llega al backend con el numero de
        # columnas cambiado y se rechaza por un motivo que no es el suyo. `csv.writer` las
        # pone; esto comprueba que se sigue usando y no un `",".join(...)`.
        import io

        buffer = io.StringIO()
        csv.writer(buffer).writerow(["200105", "URBANO", "AV. GRAU 100", wkt])
        vueltas = next(csv.reader(io.StringIO(buffer.getvalue())))
        afirmar(len(vueltas) == 4, f"la fila debe volver con 4 campos y volvio con {len(vueltas)}")
        afirmar(vueltas[3] == wkt, "la geometria debe volver entera")
        afirmar('"' in buffer.getvalue(), "y en el archivo tiene que ir entrecomillada")

    for fallo in fallos:
        print(f"FALLO: {fallo}", file=sys.stderr)
    print("autoprueba: " + ("todo en verde" if not fallos else f"{len(fallos)} fallo(s)"))
    return 1 if fallos else 0


# ---------------------------------------------------------------- principal

def principal(argv=None) -> int:
    analizador = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    analizador.add_argument("gpkg", nargs="?", help="el GeoPackage del plano")
    analizador.add_argument("--listar", action="store_true", help="solo listar capas y columnas")
    analizador.add_argument("--autoprueba", action="store_true", help="comprobar el propio guion")
    analizador.add_argument("--capa", help="capa de lotes; por omision, la primera de features")
    analizador.add_argument("--tramos", default="", help="columnas de los tramos del codigo, en orden y separadas por coma")
    analizador.add_argument("--direccion", help="columna con la direccion")
    analizador.add_argument("--tipo", help="columna con el tipo de predio (URBANO/RUSTICO)")
    analizador.add_argument("--tipo-fijo", dest="tipo_fijo", help="el tipo, si el plano no lo trae")
    analizador.add_argument("--via", help="columna con el codigo de via")
    analizador.add_argument("--numero", help="columna con el numero municipal")
    analizador.add_argument("--sector", help="columna con el codigo de sector")
    analizador.add_argument("--manzana", help="columna con el codigo de manzana")
    analizador.add_argument("--lote", help="columna con el lote")
    analizador.add_argument("--salida", help="directorio de salida")
    opciones = analizador.parse_args(argv)

    if opciones.autoprueba:
        return autoprueba()
    if not opciones.gpkg:
        analizador.error("hace falta el GeoPackage (o --autoprueba)")

    conexion = sqlite3.connect(f"file:{opciones.gpkg}?mode=ro", uri=True)
    try:
        if opciones.listar:
            for capa in capas(conexion):
                print(f"{capa}: {columnas(conexion, capa)}")
            return 0
        if not opciones.tramos:
            analizador.error("hace falta --tramos: sin el no se puede componer el codigo catastral")
        if not opciones.direccion:
            analizador.error("hace falta --direccion")

        capa, filas, excluidas, limites = convertir(conexion, opciones)
    finally:
        conexion.close()

    salida = opciones.salida or os.path.dirname(os.path.abspath(opciones.gpkg))
    os.makedirs(salida, exist_ok=True)
    destino = os.path.join(salida, "predios.csv")
    with open(destino, "w", newline="", encoding="utf-8") as archivo:
        csv.writer(archivo).writerows(filas)

    resumen = os.path.join(salida, "resumen.txt")
    with open(resumen, "w", encoding="utf-8") as archivo:
        archivo.write(f"Fuente:  {opciones.gpkg}\nCapa:    {capa}\n")
        archivo.write(f"Lotes:   {len(filas)}\nExcluidos: {len(excluidas)}\n")
        if limites:
            archivo.write(
                "Rectangulo que ocupan (lon/lat WGS84): "
                f"{limites[0]:.6f},{limites[1]:.6f} .. {limites[2]:.6f},{limites[3]:.6f}\n"
                "Si ese rectangulo no cae sobre el distrito, el plano no es el que se creia.\n"
            )
        archivo.write(
            "\nEl area de estos poligonos NO es el area imponible: esa es la de la ficha,\n"
            "la que midio el tecnico (ADR-0021).\n"
        )
        if excluidas:
            archivo.write("\nExcluidos:\n")
            for numero, motivo in excluidas:
                archivo.write(f"  fila {numero}: {motivo}\n")

    print(f"{len(filas)} lote(s) en {destino}; {len(excluidas)} excluido(s). Resumen: {resumen}")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
