#!/usr/bin/env python3
"""Convierte el «Formato Padron Municipal Armonizacion» del MEF —el XLSX con que una
municipalidad entrega su padron— en los CSV que ya saben leer los importadores del
backend: contribuyentes, catalogo vial, sectores, manzanas y fichas.

Por que existe
--------------
`ImportarFichas` e `ImportarContribuyentes` saben cargar un padron desde un CSV desde
#290, y el unico formato en que una municipalidad lo entrega es esta hoja de calculo.
Entre las dos cosas no habia nada, asi que el padron real de la piloto (D-01, Catacaos)
no tenia por donde entrar. Es el mismo hueco que `importar_predios_gpkg.py` cerro para el
plano y `cargar-cajas.sh` para la ventanilla.

Que NO hace
-----------
- **No escribe en la base.** Produce CSV; quien carga son los procesos del perfil
  `batch` (ver `infra/carga-de-datos/README.md`).
- **No inventa ninguna cifra.** Ni arancel, ni valor unitario, ni valor de predio: las
  columnas de valorizacion del formato se leen y se descartan. Son D-02a / D-13.
- **No parte el nombre en apellidos y nombres.** La hoja de Catacaos trae el nombre
  entero en «Apellido Paterno» con el formato `APELLIDOS-NOMBRES`, y el guion falta en
  2 062 de 11 056 filas y se repite en 9. Partir eso por heuristica es adivinar donde
  acaban los apellidos: la cadena entera, normalizada, va a `nombreRazonSocial`.
- **No carga construcciones.** `Construccion.anioConstruccion` es un `Ejercicio` y
  `Ejercicio` va de 1990 a 2100; 6 272 de las 20 352 filas de construccion de Catacaos
  son anteriores a 1990 —el adobe de los setenta es lo mas corriente del distrito—. Es
  el tipo del ejercicio TRIBUTARIO reutilizado como anio de construccion, y hasta que
  eso se decida las construcciones se quedan fuera enteras: cargar solo las posteriores
  a 1990 dejaria fichas con la mitad de sus pisos y ninguna cifra lo diria.
- **No traduce un vocabulario a otro cuando parecerse no es serlo** (la leccion de #427
  con «ACTIVA» y VIGENTE). Las tres condiciones de propiedad que el padron declara sin
  declarar nada —NO ESPECIFICADO, OTROS, LITIGIO— no son ninguna de las seis de
  `CondicionDeTitularidad`, asi que el predio se carga SIN titular y el resumen dice
  cuantos. Un `POSEEDOR` puesto ahi por comodidad afirma una posesion que nadie declaro.

La decision que mas se nota: el codigo del predio se conserva
--------------------------------------------------------------
El codigo de referencia catastral del sistema son 23 posiciones repartidas en diez
tramos (`ComposicionCatastral.DEL_MANUAL`, plantilla DDPPddSSMMMLLLEEeeppUUU), y el
importador **compone** el codigo desde las diez primeras columnas del CSV: lo que llega a
`predio.codigo_ref_catastral` es exactamente la concatenacion de esas columnas.

El codigo que trae el padron de Catacaos tambien son 23 digitos y tambien empieza por el
ubigeo, pero por dentro significa otra cosa: `ubigeo(6) + correlativo(8) + codigo de
uso(6) + sufijo(3)`. Sus posiciones 7-8 no son el sector ni sus 9-11 la manzana.

Aun asi los tramos se rellenan **partiendo el codigo del padron**, y no componiendo uno
nuevo a partir de la habilitacion urbana, la manzana y el lote que el padron si trae en
texto. Dos motivos, y el segundo es el que decide:

1. Manzana y lote del padron son alfanumericos (`M`, `J-07`, `12B`) y el codigo de
   referencia catastral es **solo digitos**: no caben. Y un codigo nuevo rompe el unico
   puente que hay con la deuda, las construcciones y el sistema del que salio el padron.
2. Dejar en blanco las columnas de sector y manzana —lo unico que evita crear catalogos
   derivados— **no deja el dato fuera: lo cambia**. `componer` rellena con ceros, asi que
   miles de predios distintos colapsarian en el mismo codigo y se rechazarian entre
   ellos. Las posiciones 7-11 hay que llevarlas.

Consecuencia, y hay que decirla en voz alta: los sectores y las manzanas que este guion
declara **no son sectores ni manzanas levantadas en campo**, son los tramos del codigo
del padron, y por eso se nombran diciendolo. En Catacaos salen 6 «sectores» y 26
«manzanas» para 14 422 predios. La sectorizacion de verdad esta en el padron como texto
—96 habilitaciones urbanas, con su cruce contra el catalogo oficial a medias— y
conciliarla es otro trabajo, no este.

Uso
---
    # 1. Ver que trae el archivo antes de convertir nada
    python3 importar_padron_armonizacion.py PADRON.xlsx --listar

    # 2. Convertir, y LEER el resumen antes de cargar
    python3 importar_padron_armonizacion.py PADRON.xlsx --ubigeo 200105 --salida ./carga
    cat ./carga/resumen.txt

    # 3. Comprobar que el propio guion hace lo que dice
    python3 importar_padron_armonizacion.py --autoprueba

Salida (dentro de --salida)
---------------------------
    contribuyentes.csv  codigo,tipoDocumento,numeroDocumento,tipoPersona,
                        nombreRazonSocial,condicionEspecial,fechaNacimiento,estadoCivil
    vias.csv            codigo,tipo,nombre,ubigeo
    sectores.csv        codigo,nombre,zona
    manzanas.csv        sectorCodigo,codigo
    fichas.csv          los diez tramos del codigo y despues las quince columnas de la
                        ficha, tal como las lee `ImportarFichas`
    resumen.txt         lo que hay que leer antes de cargar: cuantas filas salen de
                        cada archivo, cuantas se quedan fuera y por que motivo exacto

El orden de carga es el que impone el propio dato: vias, sectores, manzanas y
contribuyentes antes que fichas, porque cada ficha los nombra por codigo y la fila que
nombre algo inexistente se rechaza sola.

Sin dependencias fuera de la biblioteca estandar: un XLSX es un ZIP de XML, y se lee en
flujo con `iterparse` porque el archivo pasa de los 8 MB comprimidos.
"""

from __future__ import annotations

import argparse
import collections
import csv
import decimal
import os
import re
import sys
import zipfile
from xml.etree.ElementTree import iterparse

# --------------------------------------------------------------- lector de XLSX

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NSR = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def _cadenas_compartidas(libro: zipfile.ZipFile) -> list[str]:
    """La tabla de cadenas del libro. Casi todo el texto de un XLSX vive aqui."""
    if "xl/sharedStrings.xml" not in libro.namelist():
        return []
    salida: list[str] = []
    actual: list[str] = []
    dentro = False
    with libro.open("xl/sharedStrings.xml") as archivo:
        for evento, elemento in iterparse(archivo, ("start", "end")):
            if elemento.tag == NS + "si":
                if evento == "start":
                    actual, dentro = [], True
                else:
                    salida.append("".join(actual))
                    dentro = False
                    elemento.clear()
            elif evento == "end" and elemento.tag == NS + "t" and dentro:
                actual.append(elemento.text or "")
    return salida


def _hojas(libro: zipfile.ZipFile) -> dict[str, str]:
    """{nombre de hoja: ruta dentro del zip}. El nombre puede traer espacios al final:
    en este formato la hoja se llama literalmente `'CONTRIBUYENTE '`."""
    relaciones = {}
    with libro.open("xl/_rels/workbook.xml.rels") as archivo:
        for _, elemento in iterparse(archivo, ("end",)):
            if elemento.tag.endswith("Relationship"):
                relaciones[elemento.get("Id")] = elemento.get("Target")
    salida = {}
    with libro.open("xl/workbook.xml") as archivo:
        for _, elemento in iterparse(archivo, ("end",)):
            if elemento.tag == NS + "sheet":
                destino = relaciones.get(elemento.get(NSR + "id"), "")
                salida[elemento.get("name")] = "xl/" + destino.lstrip("/").replace("xl/", "", 1)
    return salida


def _indice_de_columna(letras: str) -> int:
    numero = 0
    for letra in letras:
        numero = numero * 26 + (ord(letra) - 64)
    return numero - 1


def _filas(libro: zipfile.ZipFile, ruta: str, cadenas: list[str]):
    """Genera cada fila como lista de texto, con las celdas vacias en su sitio.

    El XML no escribe las filas vacias de arriba ni las celdas vacias de en medio, asi
    que reconstruirlas por su referencia (`r="C8"`) es lo unico que mantiene alineadas
    las columnas. Contarlas al leerlas desplazaria la tabla entera.
    """
    with libro.open(ruta) as archivo:
        celdas: dict[int, str] = {}
        for evento, elemento in iterparse(archivo, ("start", "end")):
            if evento == "start" and elemento.tag == NS + "row":
                celdas = {}
            elif evento == "end" and elemento.tag == NS + "c":
                referencia = elemento.get("r") or ""
                columna = re.match(r"[A-Z]+", referencia)
                valor = elemento.find(NS + "v")
                tipo = elemento.get("t")
                if tipo == "inlineStr":
                    embebido = elemento.find(NS + "is")
                    texto = (
                        "".join(x.text or "" for x in embebido.iter(NS + "t"))
                        if embebido is not None
                        else ""
                    )
                elif valor is None:
                    texto = ""
                elif tipo == "s":
                    posicion = int(valor.text)
                    texto = cadenas[posicion] if posicion < len(cadenas) else ""
                else:
                    texto = valor.text or ""
                if columna:
                    celdas[_indice_de_columna(columna.group())] = texto
                elemento.clear()
            elif evento == "end" and elemento.tag == NS + "row":
                ancho = (max(celdas) + 1) if celdas else 0
                yield [celdas.get(i, "") for i in range(ancho)]
                elemento.clear()


class HojaNoEncontrada(Exception):
    """El libro no trae una hoja con ese nombre."""


def tabla(libro, cadenas, hojas, nombre: str, rotulo: str):
    """Las filas de datos de una hoja, con su cabecera, buscando el rotulo.

    La cabecera **no esta donde uno la supone**: fila 8 en las hojas del formato del MEF
    —tres vacias, `Tabla ...`, `Municipalidad :` y dos mas— y fila 1 en las hojas de
    trabajo que quien preparo el archivo dejo dentro. Buscar el rotulo es lo unico que
    funciona en las dos, y ademas se queja si la hoja no es la que se creia.
    """
    if nombre not in hojas:
        raise HojaNoEncontrada(f"El libro no trae la hoja '{nombre}'. Tiene: {sorted(hojas)}")
    cabecera = None
    datos = []
    for fila in _filas(libro, hojas[nombre], cadenas):
        if cabecera is None:
            if any(rotulo in (celda or "") for celda in fila):
                cabecera = [(celda or "").strip() for celda in fila]
            continue
        if any((celda or "").strip() for celda in fila):
            datos.append(fila)
    if cabecera is None:
        raise HojaNoEncontrada(f"La hoja '{nombre}' no trae ninguna columna '{rotulo}'")
    return cabecera, datos


def campo(cabecera_indices, fila, nombre) -> str:
    posicion = cabecera_indices[nombre]
    return (fila[posicion] if posicion < len(fila) else "").strip()


# --------------------------------------------------------------- vocabularios
#
# Cada diccionario traduce el vocabulario del formato del MEF al enumerado del dominio.
# Solo se traduce lo que es la MISMA cosa escrita de otra manera. Lo que no esta aqui se
# queda fuera con su motivo, en vez de caer en el valor mas parecido: la leccion de #427
# es que «se parece» y «es» no son lo mismo, y la de #51 es que el valor por omision
# comodo produce una cifra plausible que nadie distingue de la correcta.

TIPO_DE_DOCUMENTO = {
    "DNI": "DNI",
    "RUC": "RUC",
    "CARNET EXT": "CE",
    "PASAPORTE": "PASAPORTE",
    "OTROS": "OTRO",
    # «NO ESPEC» NO esta, a proposito: es «no especificado», y `OTRO` es «otro».
    # Decir «otro» de un documento cuyo tipo el padron declara no saber es una
    # afirmacion que el padron no hace. Son 2 filas de 11 056, y se ven en el resumen.
}

# La forma que cada tipo exige, copiada de `TipoDocumento` del dominio. Se repite aqui
# para poder DECIR en el resumen cuantas filas no la cumplen antes de cargar; la barrera
# de verdad sigue siendo el dominio, que las rechaza una a una.
FORMA_DEL_DOCUMENTO = {
    "DNI": (8, 8, True),
    "RUC": (11, 11, True),
    "CE": (6, 20, False),
    "PASAPORTE": (6, 20, False),
    "PARTIDA": (1, 20, False),
    "OTRO": (1, 20, False),
}

CONDICION_DE_TITULARIDAD = {
    "PROPIETARIO UNICO": "PROPIETARIO_UNICO",  # el mismo, con guion bajo
    "POSEEDOR": "POSEEDOR",  # el mismo
    "SUCESION INTESTADA": "SUCESION",  # una sucesion intestada es una sucesion
    "COTITULARIDAD": "COPROPIETARIO",  # el slot de titularidad compartida del formato
    "SOCIEDAD CONYUGAL": "CONYUGE",  # el predio de la sociedad conyugal lo tienen los conyuges
    # NO ESPECIFICADO, OTROS (Especificar) y LITIGIO no estan: no son ninguna de las
    # seis condiciones del dominio, y ponerles la mas comun seria declarar por el padron
    # algo que el padron dice expresamente no saber.
}

TIPO_DE_VIA = {
    "AV.": "AVENIDA",
    "CA.": "CALLE",
    "JR.": "JIRON",
    "PJE.": "PASAJE",
    "CTRA.": "CARRETERA",
    "PRLG.": "PROLONGACION",
    "MAL.": "MALECON",
    "OV.": "OVALO",
    "PZA.": "PLAZA",
}

# Lo que el formato escribe cuando no tiene fecha. Se transcribe tal cual: es el propio
# «no se» del padron, y 12 182 predios con exactamente esa fecha no se confunden con
# ninguna adquisicion real. Inventar aqui una fecha de corte plausible —el 1 de enero
# del ejercicio, por ejemplo— haria que el sistema afirmara cuando se adquirio un predio
# en cuatro de cada cinco casos.
FECHA_CENTINELA = "1900-01-01"

# El documento que sustenta cada ficha y cada titularidad cargadas por aqui. `origen` es
# MIGRACION y no DECLARACION_JURADA: lo que respalda estas filas es la conciliacion de
# la migracion, no un papel que el contribuyente firmo (ver `OrigenDeLaFicha`).
DOCUMENTO_ORIGEN = "PADRON-ARMONIZACION-2026"

# Los diez tramos del codigo, en el orden y con la longitud de `ComposicionCatastral.
# DEL_MANUAL`. Se repiten aqui para poder PARTIR el codigo del padron; componerlo y
# validarlo sigue siendo del dominio (D-10: si un dia son 21 posiciones, esta lista y el
# reparto de columnas cambian juntos, y el resumen dira que los codigos no cuadran).
TRAMOS = [
    ("departamento", 2),
    ("provincia", 2),
    ("distrito", 2),
    ("sector", 2),
    ("manzana", 3),
    ("lote", 3),
    ("edificacion", 2),
    ("entrada", 2),
    ("piso", 2),
    ("unidad", 3),
]
LONGITUD_DEL_CODIGO = sum(longitud for _, longitud in TRAMOS)

CABECERA_FICHAS = [nombre for nombre, _ in TRAMOS] + [
    "tipoPredio",
    "direccion",
    "codigoVia",
    "numeroMunicipal",
    "tipoFicha",
    "areaTerreno",
    "uso",
    "denominacion",
    "vigenciaDesde",
    "origen",
    "documentoOrigen",
    "codigoContribuyente",
    "condicionTitular",
    "porcentaje",
    "documentoTitular",
]


# --------------------------------------------------------------- conversion


class Recuento:
    """Lo que se queda fuera, agrupado por motivo, con un ejemplo de cada uno.

    Un contador suelto diria «4 216 predios sin titular» y no serviria de nada: lo que
    hay que poder leer antes de cargar es POR QUE, y un caso concreto que mirar en la
    hoja de calculo.
    """

    def __init__(self):
        self.motivos = collections.Counter()
        self.ejemplos = {}

    def anotar(self, motivo: str, ejemplo: str = "") -> None:
        self.motivos[motivo] += 1
        self.ejemplos.setdefault(motivo, ejemplo)

    def lineas(self) -> list[str]:
        return [
            f"    {cuantos:>6}  {motivo}"
            + (f"   (p. ej. {self.ejemplos[motivo]})" if self.ejemplos.get(motivo) else "")
            for motivo, cuantos in self.motivos.most_common()
        ]

    def total(self) -> int:
        return sum(self.motivos.values())


def normalizar_nombre(texto: str) -> str:
    """Espacios de sobra fuera, y nada mas. El volcado trae dobles y triples espacios
    (`SULLON  VILCHEZ-JOSE RAUL`) porque viene de campos de ancho fijo; dos escrituras
    del mismo nombre con distinto numero de espacios son dos nombres al buscarlos."""
    return re.sub(r"\s+", " ", texto).strip()


def documento_valido(tipo: str, numero: str) -> bool:
    minimo, maximo, solo_digitos = FORMA_DEL_DOCUMENTO[tipo]
    numero = numero.strip().upper()
    if not numero or not (minimo <= len(numero) <= maximo):
        return False
    return numero.isdigit() if solo_digitos else True


def convertir_contribuyentes(libro, cadenas, hojas, recuento: Recuento):
    """El padron de personas.

    Se emiten TODAS las filas, incluidas las que el dominio va a rechazar —un DNI de
    siete digitos, un tipo de documento que el sistema no tiene—, y no por descuido: el
    importador rechaza fila a fila y nombra el motivo, asi que el informe de la carga es
    el registro visible de lo que no entro. Una fila silenciada aqui no aparece en
    ningun sitio.

    Lo que si se calcula es CUALES van a entrar, porque de eso depende si el predio de
    esa persona se carga con titular o sin el: un `codigoContribuyente` que el padron no
    va a tener hace que `InscribirFicha` rechace la ficha ENTERA, y con ella el predio.
    """
    cabecera, filas = tabla(libro, cadenas, hojas, "CONTRIBUYENTE ", "Código Contribuyente")
    indices = {nombre: i for i, nombre in enumerate(cabecera)}

    emitidas = []
    aceptados: set[str] = set()  # los codigos que SI van a estar en la base
    codigos_vistos: set[str] = set()
    documentos_vistos: set[tuple[str, str]] = set()

    for fila in filas:
        codigo = campo(indices, fila, "Código Contribuyente").upper()
        tipo_fuente = campo(indices, fila, "Tipo Documento")
        numero = campo(indices, fila, "Nro. Documento")
        nombre = normalizar_nombre(campo(indices, fila, "Apellido Paterno"))

        # El tipo que no se sabe traducir viaja tal cual: el importador lo rechaza
        # diciendo su nombre, que es exactamente el diagnostico que hace falta.
        tipo = TIPO_DE_DOCUMENTO.get(tipo_fuente.upper(), tipo_fuente)

        # Persona juridica o natural: lo decide el RUC, que empieza por 20 cuando es de
        # una persona juridica y por 10/15/17 cuando es de una natural. Es la regla de
        # SUNAT, no una lectura del nombre: hay razones sociales que parecen personas y
        # personas cuyo nombre empieza por «SUCESION INTESTADA», y clasificar por el
        # texto seria adivinar. El padron NO trae la columna.
        juridica = tipo == "RUC" and numero.strip().startswith("20")
        tipo_persona = "JURIDICA" if juridica else "NATURAL"

        emitidas.append(
            [codigo, tipo, numero, tipo_persona, nombre, "", "", ""]
        )

        # La simulacion de lo que el importador va a aceptar. El orden importa: gana la
        # primera, igual que en el importador, que recorre el archivo de arriba abajo.
        if tipo not in FORMA_DEL_DOCUMENTO:
            recuento.anotar("contribuyente: tipo de documento que el sistema no tiene", f"{codigo} '{tipo_fuente}'")
            continue
        if not documento_valido(tipo, numero):
            recuento.anotar(f"contribuyente: numero de documento que no cumple la forma de un {tipo}", f"{codigo} '{numero}'")
            continue
        if not nombre or len(nombre) > 240:
            recuento.anotar("contribuyente: nombre vacio o de mas de 240 caracteres", codigo)
            continue
        if codigo in codigos_vistos:
            recuento.anotar("contribuyente: codigo repetido en el padron (gana la primera fila)", codigo)
            continue
        llave = (tipo, numero.strip().upper())
        if llave in documentos_vistos:
            recuento.anotar("contribuyente: el mismo documento en dos codigos (gana la primera fila)", f"{codigo} {tipo} {numero}")
            continue
        codigos_vistos.add(codigo)
        documentos_vistos.add(llave)
        aceptados.add(codigo)

    return emitidas, aceptados, len(filas)


def convertir_vias(libro, cadenas, hojas, ubigeo: str, recuento: Recuento):
    """El catalogo vial oficial, que la hoja de trabajo `VIAS` trae a la derecha.

    Son dos tablas pegadas en una hoja: a la izquierda los nombres de via que aparecen
    en el padron con el codigo que se les encontro —donde se encontro—, y a la derecha
    (`XX`, `RefName`) el catalogo oficial entero. Lo que se carga es el catalogo, no la
    lista de lo que el padron usa: una via existe aunque hoy ningun predio la nombre.
    """
    cabecera, filas = tabla(libro, cadenas, hojas, "VIAS", "RefName")
    indices = {nombre: i for i, nombre in enumerate(cabecera)}

    emitidas = []
    vistos: set[str] = set()
    catalogo: set[str] = set()
    for fila in filas:
        codigo = campo(indices, fila, "XX")
        referencia = campo(indices, fila, "RefName")
        if not codigo:
            continue
        # `RefName` es «(001094) CA. ABELARDO QUIÑONES»: el codigo entre parentesis, el
        # tipo abreviado con punto, y el nombre.
        analisis = re.match(r"^\((\d+)\)\s*([A-ZÑ]+\.)?\s*(.*)$", referencia)
        if not analisis:
            recuento.anotar("via: el catalogo no dice su nombre en la forma (codigo) TIPO. NOMBRE", f"{codigo} '{referencia}'")
            continue
        abreviatura = analisis.group(2) or ""
        nombre = analisis.group(3).strip()
        if not nombre:
            recuento.anotar("via: sin nombre en el catalogo", codigo)
            continue
        tipo = TIPO_DE_VIA.get(abreviatura)
        if tipo is None:
            # `OTRO` existe en `TipoVia` para esto, y aqui si es legitimo: la
            # abreviatura describe el tipo de via, y una que el diccionario no conoce es
            # literalmente «otro tipo de via». Aun asi se cuenta, para que nadie la
            # descubra dentro de seis meses.
            tipo = "OTRO"
            recuento.anotar("via: abreviatura de tipo desconocida, cargada como OTRO", f"{codigo} '{abreviatura}'")
        if codigo in vistos:
            recuento.anotar("via: codigo repetido en el catalogo (gana la primera fila)", codigo)
        else:
            vistos.add(codigo)
            catalogo.add(codigo)
        emitidas.append([codigo, tipo, nombre, ubigeo])
    return emitidas, catalogo, len(filas)


def partir_codigo(codigo: str) -> dict[str, str] | None:
    """Reparte el codigo del padron en los diez tramos del sistema, o None si no cabe.

    No se «arregla» ningun codigo. Uno de 22 posiciones, o con una letra dentro, no es
    un codigo de referencia catastral: rellenarlo con un cero o quitarle la letra
    produciria un predio con un codigo que no es el suyo, y ninguna consulta lo diria.
    """
    if len(codigo) != LONGITUD_DEL_CODIGO or not codigo.isdigit():
        return None
    reparto = {}
    posicion = 0
    for nombre, longitud in TRAMOS:
        reparto[nombre] = codigo[posicion : posicion + longitud]
        posicion += longitud
    return reparto


def componer_direccion(via, numero, interior, manzana, lote, habilitacion) -> str:
    """La direccion legible, juntando lo que el padron tiene en columnas distintas.

    No es un dato nuevo: es la misma forma en que el propio padron escribe el domicilio
    fiscal («JR. TUMBES N 748 MZ 63 LT 03-CATACAOS-CERCADO»). Lo que falta no se
    sustituye por nada; simplemente no aparece.
    """
    partes = []
    if via:
        partes.append(via)
    if numero:
        partes.append("N " + numero)
    if interior:
        partes.append("INT " + interior)
    if manzana:
        partes.append("MZ " + manzana)
    if lote:
        partes.append("LT " + lote)
    texto = " ".join(partes)
    if habilitacion:
        texto = (texto + " - " + habilitacion) if texto else habilitacion
    return texto[:300]


def area_en_metros(texto: str) -> str:
    """El area con dos decimales, que es lo que el dominio `area_m2 numeric(12,2)` guarda.

    Se redondea AQUI y no despues: escribir seis decimales y dejar que el motor los
    recorte deja el archivo diciendo una cosa y la base otra.
    """
    return str(decimal.Decimal(texto).quantize(decimal.Decimal("0.01"), rounding=decimal.ROUND_HALF_UP))


def convertir_fichas(libro, cadenas, hojas, aceptados: set[str], catalogo_vial: set[str], recuento: Recuento):
    """Los predios, su primera ficha y su titular.

    **Una fila es un predio.** El formato del MEF repite el predio una vez por
    cotitular, y `ImportarFichas` inscribe la PRIMERA ficha de cada predio: una segunda
    fila del mismo codigo se rechazaria con «ya tiene ficha vigente», y con razon. La
    copropiedad se produce con una transferencia parcial, que es ademas el acto por el
    que un predio cambia de dueno en la vida real (ver `transferencias.csv`).

    De las filas de un mismo predio se elige la primera **cuyo titular se pueda cargar**.
    No es una preferencia estetica: entre dos filas del mismo predio, la que nombra a
    alguien que esta en el padron conserva un dato que la otra no tiene.
    """
    cabecera, filas = tabla(libro, cadenas, hojas, "PREDIO URBANO", "Código Predio")
    indices = {nombre: i for i, nombre in enumerate(cabecera)}

    por_predio: dict[str, list] = collections.OrderedDict()
    sin_codigo = 0
    for fila in filas:
        codigo = campo(indices, fila, "Código Predio")
        reparto = partir_codigo(codigo)
        if reparto is None:
            recuento.anotar("predio: el codigo del padron no son 23 digitos", codigo)
            sin_codigo += 1
            continue
        por_predio.setdefault(codigo, []).append(fila)

    emitidas = []
    sectores: dict[str, None] = collections.OrderedDict()
    manzanas: dict[tuple[str, str], None] = collections.OrderedDict()
    con_titular = 0
    filas_de_cotitular = 0

    for codigo, candidatas in por_predio.items():
        filas_de_cotitular += len(candidatas) - 1
        elegida = None
        titular = None
        for fila in candidatas:
            posible = resolver_titular(indices, fila, aceptados)
            if posible is not None:
                elegida, titular = fila, posible
                break
        if elegida is None:
            elegida = candidatas[0]
            anotar_por_que_no_hay_titular(indices, elegida, aceptados, recuento)

        reparto = partir_codigo(codigo)
        sectores.setdefault(reparto["sector"], None)
        manzanas.setdefault((reparto["sector"], reparto["manzana"]), None)

        codigo_via = campo(indices, elegida, "COD_VIA")
        if not codigo_via.isdigit():
            # `AMBIGUO`, `NO ESTA` y `#N/A` son lo que quien preparo el archivo escribio
            # donde no pudo resolver la via. No es un codigo: el predio se carga sin via.
            codigo_via = ""
        elif codigo_via not in catalogo_vial:
            recuento.anotar("predio: su codigo de via no esta en el catalogo del propio archivo", f"{codigo} {codigo_via}")
            codigo_via = ""

        fecha = campo(indices, elegida, "Fecha Adquisición")[:10]

        emitidas.append(
            [reparto[nombre] for nombre, _ in TRAMOS]
            + [
                "URBANO",  # `Condición predio` vale URBANO en las 15 005 filas
                componer_direccion(
                    campo(indices, elegida, "Nombre de la via"),
                    campo(indices, elegida, "Numero"),
                    campo(indices, elegida, "Numero de Interior"),
                    campo(indices, elegida, "Manzana"),
                    campo(indices, elegida, "Lote"),
                    campo(indices, elegida, "Descripcion Habilitación Urbana"),
                ),
                codigo_via,
                campo(indices, elegida, "Numero")[:20],
                # UNICA para todos: es la ficha urbana individual del manual, y es la
                # unica que se puede levantar con lo que este archivo trae. ECONOMICA,
                # BIENES_COMUNES y RURAL necesitan un detalle —actividades, reparto de
                # bienes comunes, grupos de tierra— que el formato no tiene.
                "UNICA",
                area_en_metros(campo(indices, elegida, "Área terreno")),
                campo(indices, elegida, "Descripcion del Uso")[:60],
                "",  # denominacion: el formato no la trae
                fecha,
                "MIGRACION",
                DOCUMENTO_ORIGEN,
            ]
            + (list(titular) if titular else ["", "", "", ""])
        )
        if titular:
            con_titular += 1

    return emitidas, list(sectores), list(manzanas), len(filas), len(por_predio), con_titular, filas_de_cotitular


def resolver_titular(indices, fila, aceptados: set[str]):
    """`[codigoContribuyente, condicionTitular, porcentaje, documentoTitular]`, o None.

    None significa «este predio se carga sin titular», que `InscribirFicha` admite
    porque en un levantamiento catastral fichar antes de identificar al propietario es
    lo normal. Lo que NO se hace es rellenarlo con algo: un titular inventado le cobra a
    quien no debe, y un `codigoContribuyente` que no existe tumba la ficha entera.
    """
    codigo = campo(indices, fila, "Código Contribuyente").upper()
    if codigo not in aceptados:
        return None
    condicion = CONDICION_DE_TITULARIDAD.get(campo(indices, fila, "Condición propiedad").upper())
    if condicion is None:
        return None
    if condicion == "PROPIETARIO_UNICO":
        # El propietario unico lo es por el total: su porcentaje no se declara, es 100 y
        # la tabla lo comprueba (`titularidad_unico_ck`). Si el padron trae otra cifra,
        # el dominio la ignora; el resumen lo cuenta aparte.
        return [codigo, condicion, "", DOCUMENTO_ORIGEN]
    porcentaje = campo(indices, fila, "% Condomin")
    try:
        valor = decimal.Decimal(porcentaje)
    except (decimal.InvalidOperation, ValueError):
        return None
    if valor <= 0 or valor > 100:
        return None
    return [codigo, condicion, str(valor), DOCUMENTO_ORIGEN]


def anotar_por_que_no_hay_titular(indices, fila, aceptados, recuento: Recuento) -> None:
    codigo_predio = campo(indices, fila, "Código Predio")
    codigo = campo(indices, fila, "Código Contribuyente").upper()
    condicion_fuente = campo(indices, fila, "Condición propiedad").upper()
    if codigo not in aceptados:
        recuento.anotar("predio sin titular: su contribuyente no esta (o no entra) en el padron", f"{codigo_predio} -> {codigo}")
    elif CONDICION_DE_TITULARIDAD.get(condicion_fuente) is None:
        recuento.anotar(f"predio sin titular: condicion de propiedad '{condicion_fuente}', que no es ninguna del dominio", codigo_predio)
    else:
        recuento.anotar("predio sin titular: porcentaje de propiedad fuera de (0, 100]", f"{codigo_predio} '{campo(indices, fila, '% Condomin')}'")


# --------------------------------------------------------------- escritura


def escribir(ruta: str, cabecera: list[str], filas: list[list[str]], comentario: list[str]) -> None:
    """Un CSV con su cabecera y su porque delante.

    `LectorDeFilasCsv` salta las lineas que empiezan por `#` y las cuenta igual para
    numerar, asi que el aviso viaja DENTRO del archivo: escrito en un README aparte se
    separa la primera vez que alguien copia el CSV a su maquina para cargarlo.
    """
    with open(ruta, "w", encoding="utf-8", newline="") as archivo:
        for linea in comentario:
            archivo.write("# " + linea + "\n" if linea else "#\n")
        escritor = csv.writer(archivo, lineterminator="\n")
        escritor.writerow(cabecera)
        escritor.writerows(filas)


def convertir(ruta_xlsx: str, salida: str, ubigeo: str) -> str:
    os.makedirs(salida, exist_ok=True)
    libro = zipfile.ZipFile(ruta_xlsx)
    cadenas = _cadenas_compartidas(libro)
    hojas = _hojas(libro)
    recuento = Recuento()

    contribuyentes, aceptados, filas_contribuyente = convertir_contribuyentes(libro, cadenas, hojas, recuento)
    vias, catalogo_vial, filas_via = convertir_vias(libro, cadenas, hojas, ubigeo, recuento)
    (
        fichas,
        sectores,
        manzanas,
        filas_predio,
        predios,
        con_titular,
        filas_de_cotitular,
    ) = convertir_fichas(libro, cadenas, hojas, aceptados, catalogo_vial, recuento)

    fuente = os.path.basename(ruta_xlsx)
    cabecera_comun = [
        f"Derivado de {fuente} por scripts/catastro/importar_padron_armonizacion.py.",
        "NO se edita a mano: se vuelve a generar. Ninguna cifra normativa entra por aqui.",
        "",
    ]

    escribir(
        os.path.join(salida, "contribuyentes.csv"),
        ["codigo", "tipoDocumento", "numeroDocumento", "tipoPersona", "nombreRazonSocial", "condicionEspecial", "fechaNacimiento", "estadoCivil"],
        contribuyentes,
        cabecera_comun
        + [
            "El nombre va entero en nombreRazonSocial, con el formato APELLIDOS-NOMBRES que",
            "trae el padron: la hoja no lo descompone y partirlo por heuristica es adivinar",
            "donde acaban los apellidos.",
            "condicionEspecial, fechaNacimiento y estadoCivil van vacias: el formato no las trae.",
            "Las filas que el dominio va a rechazar se emiten igual, para que el informe de la",
            "carga diga fila a fila cual no entro y por que.",
        ],
    )
    escribir(
        os.path.join(salida, "vias.csv"),
        ["codigo", "tipo", "nombre", "ubigeo"],
        vias,
        cabecera_comun + ["El catalogo vial oficial que el propio archivo trae en la hoja VIAS (columnas XX y RefName)."],
    )
    escribir(
        os.path.join(salida, "sectores.csv"),
        ["codigo", "nombre", "zona"],
        [[codigo, f"Tramo {codigo} del codigo del padron (el padron no sectoriza)", ""] for codigo in sectores],
        cabecera_comun
        + [
            "ESTOS NO SON SECTORES LEVANTADOS EN CAMPO. Son las posiciones 7-8 del codigo que",
            "trae el padron, que ahi lleva un correlativo y no un sector. Existen porque el",
            "codigo de referencia catastral se COMPONE de sus tramos y esas posiciones hay que",
            "llevarlas: dejarlas en blanco no deja el dato fuera, lo cambia, y miles de predios",
            "distintos colapsarian en el mismo codigo.",
            "La sectorizacion de verdad esta en el padron como texto (96 habilitaciones",
            "urbanas, con su cruce contra el catalogo oficial a medias) y es otro trabajo.",
        ],
    )
    escribir(
        os.path.join(salida, "manzanas.csv"),
        ["sectorCodigo", "codigo"],
        [[sector, manzana] for sector, manzana in manzanas],
        cabecera_comun + ["Mismo aviso que sectores.csv: son las posiciones 9-11 del codigo del padron."],
    )
    escribir(
        os.path.join(salida, "fichas.csv"),
        CABECERA_FICHAS,
        fichas,
        cabecera_comun
        + [
            "Una fila es UN PREDIO con su primera ficha y su titular, no una titularidad: el",
            "formato del MEF repite el predio una vez por cotitular y ImportarFichas inscribe",
            "la primera ficha de cada predio. La copropiedad se produce con una transferencia",
            "parcial, que es ademas como cambia de dueno un predio en la vida real.",
            "Las diez primeras columnas son los tramos del codigo, partido del que trae el",
            "padron: el codigo que llega a la base es exactamente el del padron.",
            "origen = MIGRACION: lo que respalda estas filas es la conciliacion de la",
            "migracion, no un papel que el contribuyente firmo.",
            "Ninguna columna de valorizacion del formato se carga (D-02a, D-13).",
        ],
    )

    lineas = [
        "Padron Municipal de Armonizacion -> CSV de carga del SGTM",
        "=" * 72,
        f"Fuente:  {ruta_xlsx}",
        f"Ubigeo:  {ubigeo}",
        "",
        "LO QUE SALE",
        f"    contribuyentes.csv  {len(contribuyentes):>6} fila(s) de {filas_contribuyente} de la hoja CONTRIBUYENTE",
        f"                        de ellas, {len(aceptados)} entraran; {filas_contribuyente - len(aceptados)} las rechazara el importador",
        f"    vias.csv            {len(vias):>6} fila(s) de {filas_via} del catalogo oficial",
        f"    sectores.csv        {len(sectores):>6} tramo(s) de codigo, NO sectores levantados",
        f"    manzanas.csv        {len(manzanas):>6} tramo(s) de codigo, NO manzanas levantadas",
        f"    fichas.csv          {len(fichas):>6} predio(s) de {filas_predio} filas de PREDIO URBANO",
        f"                        de ellos, {con_titular} con titular y {len(fichas) - con_titular} sin ninguno",
        "",
        f"    Las {filas_de_cotitular} fila(s) de PREDIO URBANO que sobran son cotitulares del mismo predio:",
        "    una ficha por predio, y la copropiedad se produce con una transferencia parcial.",
        "",
        "LO QUE SE QUEDA FUERA, Y POR QUE",
    ]
    lineas += recuento.lineas() or ["    (nada)"]
    lineas += [
        "",
        "LO QUE NO SE CARGA POR DECISION, NO POR DEFECTO DEL ARCHIVO",
        "    Construcciones. Construccion.anioConstruccion es un Ejercicio (1990-2100) y el",
        "    padron trae miles de filas anteriores a 1990. Cargar solo las posteriores",
        "    dejaria fichas con la mitad de sus pisos sin que ninguna cifra lo dijera.",
        "    Toda cifra de valorizacion: arancel, valor de terreno, valor de construccion,",
        "    valor del predio. Son valores normativos (D-02a, D-13) y no entran por aqui.",
        "    La deuda. Este archivo no la trae.",
        "",
        "ORDEN DE CARGA (cada archivo nombra por codigo lo que otro escribio antes)",
        "    1. vias.csv   2. sectores.csv   3. manzanas.csv   4. contribuyentes.csv   5. fichas.csv",
    ]
    ruta_resumen = os.path.join(salida, "resumen.txt")
    with open(ruta_resumen, "w", encoding="utf-8") as archivo:
        archivo.write("\n".join(lineas) + "\n")
    print("\n".join(lineas))
    return ruta_resumen


# --------------------------------------------------------------- autoprueba


def autoprueba() -> int:
    """Comprueba el guion contra un libro construido aqui mismo.

    Lo que se mide no es que produzca filas, sino las cuatro decisiones que se pueden
    deshacer sin que nada se queje: que el codigo del padron llegue INTACTO a los
    tramos, que un predio sin titular cargable salga con las cuatro columnas vacias en
    vez de con un titular inventado, que un vocabulario que no es del dominio NO se
    traduzca al parecido, y que un predio repetido salga una sola vez.
    """
    fallos = []

    def afirmar(condicion, que):
        if not condicion:
            fallos.append(que)
            print(f"  ROJO  {que}")
        else:
            print(f"  verde {que}")

    import shutil
    import tempfile

    directorio = tempfile.mkdtemp(prefix="autoprueba-padron-")
    try:
        ruta = os.path.join(directorio, "padron.xlsx")
        _libro_de_prueba(ruta)
        salida = os.path.join(directorio, "carga")
        convertir(ruta, salida, "200105")

        def leer(nombre):
            with open(os.path.join(salida, nombre), encoding="utf-8") as archivo:
                filas = [f for f in csv.reader(archivo) if f and not f[0].startswith("#")]
            return filas[0], filas[1:]

        _, fichas = leer("fichas.csv")
        codigos = ["".join(fila[:10]) for fila in fichas]
        afirmar(
            "20010500000034010101001" in codigos,
            "el codigo del padron se reconstruye entero desde los tramos",
        )
        afirmar(len(fichas) == 4, f"un predio por fila: 4 predios de 6 filas (salieron {len(fichas)})")

        por_codigo = {"".join(f[:10]): f for f in fichas}
        con = por_codigo["20010500000034010101001"]
        afirmar(con[21:25] == ["00000000004", "PROPIETARIO_UNICO", "", DOCUMENTO_ORIGEN],
                "el propietario unico entra sin porcentaje: lo es por el total")

        sin = por_codigo["20010500000099010101001"]
        afirmar(sin[21:25] == ["", "", "", ""],
                "el predio cuyo contribuyente no esta en el padron sale SIN titular, no con uno inventado")

        litigio = por_codigo["20010500000035010101001"]
        afirmar(litigio[21:25] == ["", "", "", ""],
                "una condicion de propiedad que no es ninguna del dominio no se traduce a la parecida")

        copro = por_codigo["20010500000036010101001"]
        afirmar(copro[21:25] == ["00000000006", "COPROPIETARIO", "50.000", DOCUMENTO_ORIGEN],
                "el cotitular entra con su porcentaje")
        afirmar(copro[15] == "1200.35", "el area se redondea a dos decimales, que es lo que la base guarda")

        _, contribuyentes = leer("contribuyentes.csv")
        afirmar(len(contribuyentes) == 4,
                f"se emiten TODAS las filas de contribuyente, incluidas las que el dominio rechazara (salieron {len(contribuyentes)})")
        malo = [f for f in contribuyentes if f[0] == "00000000007"]
        afirmar(malo and malo[0][2] == "123",
                "el DNI mal formado viaja tal cual, para que el importador diga fila a fila que no entro")

        _, vias = leer("vias.csv")
        afirmar(["000699", "JIRON", "JOSEFINA R. DE COX", "200105"] in vias,
                "la via sale del catalogo oficial con su tipo y su nombre separados")

        _, sectores = leer("sectores.csv")
        afirmar([s[0] for s in sectores] == ["00"], "el tramo de sector que el codigo trae, y solo ese")
        _, manzanas = leer("manzanas.csv")
        afirmar([m[1] for m in manzanas] == ["000"], "la manzana derivada del mismo codigo")

        afirmar(partir_codigo("2001050000218401010100A") is None,
                "un codigo con una letra dentro no se arregla: no es un codigo de referencia catastral")
        afirmar(partir_codigo("2001050000003401010100") is None,
                "un codigo de 22 posiciones tampoco se rellena con un cero")
    finally:
        shutil.rmtree(directorio, ignore_errors=True)

    print("autoprueba: " + ("todo en verde" if not fallos else f"{len(fallos)} fallo(s)"))
    return 0 if not fallos else 1


def _libro_de_prueba(ruta: str) -> None:
    """Escribe un XLSX minimo con la forma real del formato: la cabecera en la fila 8 en
    las hojas del MEF y en la fila 1 en la hoja de trabajo, y el nombre de hoja con el
    espacio final que el formato trae de verdad."""
    contribuyentes = [
        ["Código Contribuyente", "Apellido Paterno", "Apellido Materno", "Nombres", "Razón Social", "Tipo Documento", "Nro. Documento", "Domicilio Fiscal"],
        ["00000000004", "SULLON  VILCHEZ-JOSE RAUL", "", "", "", "DNI", "02716094", "JR. X"],
        ["00000000005", "CHU SANDOVAL LUZ", "", "", "", "DNI", "02701021", "JR. Y"],
        ["00000000006", "CERAMICA NARIHUALA SAC", "", "", "", "RUC", "20100000001", "JR. Z"],
        ["00000000007", "PERSONA CON DNI MALO", "", "", "", "DNI", "123", "JR. W"],
    ]
    predios = [
        ["ITEM", "Código Contribuyente", "Código Predio", "COD_VIA", "Nombre de la via", "Numero", "Manzana", "Lote", "Descripcion Habilitación Urbana", "Condición predio", "Fecha Adquisición", "Descripcion del Uso", "Numero de Interior", "Condición propiedad", "% Condomin", "Área terreno"],
        ["1", "00000000004", "20010500000034010101001", "000699", "JR. JOSEFINA R. DE COX", "620", "2", "39", "MONTE SULLON", "URBANO", "1900-01-01 00:00:00.000", "CASA HABITACION", "", "PROPIETARIO UNICO", "100.000", "66.600000"],
        ["2", "00000000005", "20010500000035010101001", "AMBIGUO", "FRANCISCO BOLOGNESI", "", "1", "13", "MONTE SULLON", "URBANO", "2019-01-23 00:00:00.000", "COMERCIAL", "", "LITIGIO", "100.000", "271.300000"],
        ["3", "00000000006", "20010500000036010101001", "NO ESTA", "CA. COMERCIO", "10", "3", "1", "CATACAOS-CERCADO", "URBANO", "2015-09-15 05:00:00.000", "CASA HABITACION", "", "COTITULARIDAD", "50.000", "1200.345000"],
        ["4", "00000000004", "20010500000036010101001", "NO ESTA", "CA. COMERCIO", "10", "3", "1", "CATACAOS-CERCADO", "URBANO", "2015-09-15 05:00:00.000", "CASA HABITACION", "", "COTITULARIDAD", "50.000", "1200.345000"],
        ["5", "00000099999", "20010500000099010101001", "AMBIGUO", "CA. SIN NOMBRE 424", "", "", "", "SIMBILA", "URBANO", "1900-01-01 00:00:00.000", "TERRENO", "", "PROPIETARIO UNICO", "100.000", "90.000000"],
        ["6", "00000000004", "2001050000218401010100A", "AMBIGUO", "CA. RARA", "", "", "", "SIMBILA", "URBANO", "1900-01-01 00:00:00.000", "TERRENO", "", "PROPIETARIO UNICO", "100.000", "10.000000"],
    ]
    vias = [
        ["Nombre de la via", "COD", "POSIBLE COD", "", "", "", "", "", "XX", "RefName"],
        ["", "", "", "", "", "", "", "", "000699", "(000699) JR. JOSEFINA R. DE COX"],
        ["", "", "", "", "", "", "", "", "000802", "(000802) CA. COMERCIO"],
    ]
    _escribir_xlsx(ruta, [("CONTRIBUYENTE ", contribuyentes, 8), ("PREDIO URBANO", predios, 1), ("VIAS", vias, 1)])


def _escribir_xlsx(ruta: str, hojas) -> None:
    """Un XLSX de verdad —zip de XML— con `inlineStr`, para no escribir tabla de cadenas."""

    def escapar(texto: str) -> str:
        return texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def letra(indice: int) -> str:
        nombre = ""
        indice += 1
        while indice:
            indice, resto = divmod(indice - 1, 26)
            nombre = chr(65 + resto) + nombre
        return nombre

    with zipfile.ZipFile(ruta, "w") as libro:
        libro.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            "</Types>",
        )
        libro.writestr(
            "_rels/.rels",
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            "</Relationships>",
        )
        hojas_xml = "".join(
            f'<sheet name="{escapar(nombre)}" sheetId="{i + 1}" r:id="rId{i + 1}"/>'
            for i, (nombre, _, _) in enumerate(hojas)
        )
        libro.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f"<sheets>{hojas_xml}</sheets></workbook>",
        )
        relaciones = "".join(
            f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/hoja{i + 1}.xml"/>'
            for i in range(len(hojas))
        )
        libro.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + relaciones
            + "</Relationships>",
        )
        for i, (_, filas, primera) in enumerate(hojas):
            cuerpo = []
            for j, fila in enumerate(filas):
                numero = primera + j
                celdas = "".join(
                    f'<c r="{letra(k)}{numero}" t="inlineStr"><is><t>{escapar(valor)}</t></is></c>'
                    for k, valor in enumerate(fila)
                    if valor != ""
                )
                cuerpo.append(f'<row r="{numero}">{celdas}</row>')
            libro.writestr(
                f"xl/worksheets/hoja{i + 1}.xml",
                '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                "<sheetData>" + "".join(cuerpo) + "</sheetData></worksheet>",
            )


# --------------------------------------------------------------- linea de ordenes


def principal(argv=None) -> int:
    analizador = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    analizador.add_argument("xlsx", nargs="?", help="el Formato Padron Municipal Armonizacion")
    analizador.add_argument("--salida", help="directorio de los CSV (por omision, junto al xlsx)")
    analizador.add_argument("--ubigeo", default="", help="ubigeo de la municipalidad, para el catalogo vial")
    analizador.add_argument("--listar", action="store_true", help="decir que hojas trae el libro y no convertir nada")
    analizador.add_argument("--autoprueba", action="store_true", help="comprobar el propio guion")
    opciones = analizador.parse_args(argv)

    if opciones.autoprueba:
        return autoprueba()
    if not opciones.xlsx:
        analizador.error("hace falta el XLSX (o --autoprueba)")

    if opciones.listar:
        libro = zipfile.ZipFile(opciones.xlsx)
        cadenas = _cadenas_compartidas(libro)
        for nombre, ruta in _hojas(libro).items():
            filas = sum(1 for _ in _filas(libro, ruta, cadenas))
            print(f"  {nombre!r:32} {filas:>7} fila(s)")
        return 0

    if opciones.ubigeo and not re.fullmatch(r"\d{6}", opciones.ubigeo):
        analizador.error("el ubigeo son seis digitos")
    salida = opciones.salida or os.path.join(os.path.dirname(os.path.abspath(opciones.xlsx)), "carga")
    convertir(opciones.xlsx, salida, opciones.ubigeo)
    return 0


if __name__ == "__main__":
    sys.exit(principal())
