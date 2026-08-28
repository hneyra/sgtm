# gob-docs — fuentes oficiales en tránsito hacia S3

Documentos oficiales descargados por el dueño del repositorio el 2026-08-28 para cerrar los
factores de **D-11** (#188), la reserva de identidad de `valores-unitarios-2026.md` y la
referencia del SRTM del MEF. **Esta rama es tránsito, no destino**: los PDF no se versionan en
`main` (el precedente es la fuente vehicular: se archivan en S3 con
`scripts/valores-normativos/archivar_fuente_normativa.sh` y la rama se borra después). Este
README identifica cada archivo **por su contenido**, no por su nombre, con su huella y su
destino en S3.

Convención del guion de archivado:
`s3://sgtm-fuentes-normativas/fuentes-normativas/<tipo>/<ubigeo>/<sello>__<archivo>` — el
guion exige un UBIGEO; para norma nacional el precedente (la R.M. vehicular) usó el del
piloto, `200105` (Catacaos), y aquí se sigue igual.

## 1. R.M. N.° 277-2025-VIVIENDA — valores unitarios de edificación, ejercicio 2026

**Tipo S3: `valores-unitarios`.** Una sola norma en diez archivos; se archivan juntos.

```bash
for f in gob-docs/rm-277-2025-vivienda/*.pdf; do
  scripts/valores-normativos/archivar_fuente_normativa.sh \
    --bucket sgtm-fuentes-normativas --ubigeo 200105 --tipo valores-unitarios "$f"
done
```

| Archivo | Qué es (leído del contenido) | Cierra | sha256 |
|---|---|---|---|
| `rm-277-2025-vivienda-valores-arancelarios-2026-escudo.pdf` | **La parte resolutiva de la R.M. N.° 277-2025-VIVIENDA** (Lima, 29-10-2025). ⚠️ El nombre del archivo dice «valores-arancelarios» y es un error de descarga: los aranceles son la R.M. 514-2025-EF/15 del MEF, ya trabajada en `aranceles-2026.md`; este PDF es el resolutivo de valores **unitarios** | La norma que aprueba los Anexos; su art. de remisión al RNT | `9df028d5…cfa155d` |
| `i-1-f-lima-callao-2026.pdf` | Anexo I / I.1 — Cuadro de Valores Unitarios, Lima y Callao, ejercicio fiscal 2026 | Referencia (el piloto es Costa) | `81eaf3a6…cddaf74` |
| `i-2-f-costa-2025.pdf` | **Anexo I.2 — Cuadro para la Costa «al 31 de octubre de 2025»**. ⚠️ El «2025» del nombre confunde: los cuadros del ejercicio 2026 se aprueban con valores al 31-10-2025 (art. 11 TUO LTM); **este es el cuadro del ejercicio 2026 que rige al piloto** | **La reserva `‹NO CONFIRMADO›` de `valores-unitarios-2026.md` §1**: la identidad palabra por palabra del cuadro 9×7 de la Costa | `0df8ac02…5da711b37` |
| `i-3-f-sierra-2025.pdf` / `i-4-f-selva-2025.pdf` | Anexos I.3 y I.4 — Sierra y Selva, ídem | Referencia multi-municipal | `95102206…`, `eedb539b…` |
| `anexo_ii.pdf` | **Anexo II — «Instructivo para la determinación de la base imponible de las obras complementarias, instalaciones fijas y permanentes…»** (2 páginas) | **El factor de oficialización (D-11 factor 4, RT-005)** y la clasificación de la fila 10 de NEG-02 §2.3 | `9f8334a6…4e9be5` |
| `iii-1..4-obras-complem-*.pdf` | Anexos III.1–III.4 — Valores unitarios **a costo directo** de obras complementarias e instalaciones fijas y permanentes, por región, ejercicio 2026 | La base sobre la que el factor de oficialización actúa (RT-005) | `94ac5d58…`, `62d0b3bf…`, `1edd4ce8…`, `947bdaa9…` |

Origen oficial: El Peruano (`busquedas.elperuano.pe/dispositivo/NL/2453433-1`) y
`gob.pe/institucion/vivienda/normas-legales/7347403-277-2025-vivienda`.

## 2. Reglamento Nacional de Tasaciones

**Tipo S3: `tasaciones`.**

| Archivo | Qué es | Cierra | sha256 |
|---|---|---|---|
| `rm-172-2016-vivienda/RM_172-2016-VIVIENDA.pdf` | R.M. N.° 172-2016-VIVIENDA, Reglamento Nacional de Tasaciones, 77 páginas (escaneado: la primera página no trae capa de texto — puede necesitar OCR al transcribir) | La **metodología** del factor de oficialización; segunda fuente de la tabla de depreciación (`depreciacion.md` ya lo cita) | `0dab13bd…adce0f5` |

Origen: `cdn.www.gob.pe/uploads/document/file/22026/RM_172-2016-VIVIENDA.pdf`.

## 3. Régimen de la Amazonía

**Tipo S3: `amazonia`.**

| Archivo | Qué es | Cierra | sha256 |
|---|---|---|---|
| `ley-27037/5136617-ley-n-27037.pdf` | Ley N.° 27037, Ley de Promoción de la Inversión en la Amazonía — versión con concordancias (cita la RTF 05516-A-2022) | **D-11 factor 1** (RT-011): el art. 18 (deducción del autovalúo) y el **art. 3.1 (el ámbito, a transcribir completo** — es lo que permite decidir por ubigeo; Catacaos queda fuera) | `aeb0eea9…4861e2` |
| `ds-103-99-ef/ds-103-99-ef.pdf` | D.S. N.° 103-99-EF — Reglamento de las disposiciones tributarias de la Ley 27037 (texto SPIJ, con concordancias) | La mecánica del porcentaje anual de la deducción | `aa3ca187…6a15b0` |

**Pendiente de conseguir: el D.S. N.° 031-99-EF — y ya se sabe que es EL que manda.** La
ambigüedad 103 vs 031 quedó resuelta leyendo los dos documentos de esta carpeta: el texto del
D.S. 103-99-EF no menciona el predial ni una vez (reglamenta IGV, Renta e importación
exonerada), y la propia Ley 27037 trae bajo su art. 18 la concordancia explícita
«CONCORDANCIA: D.S. Nº 031-99-EF». El 103 se queda archivado como contexto del régimen; la
regla del porcentaje anual de la deducción predial hay que leerla en el 031.

## 4. Documentación del SRTM del MEF y guías

**Tipo S3: `srtm-manuales`** (los manuales del sistema) y **`mef-guias`** (la doctrina).
No son normas: son la referencia del sistema que se reimplementa — sirven para el factor 2
(`% actualización`), para la campaña de D-03c de las municipalidades que migren historia, y
como contexto de CAL-02.

| Archivo | Qué es | Releva para | sha256 |
|---|---|---|---|
| `mef-manuales-registro-determinacion/MC_modulo_registro_determinacion_v0315040_a_0316030.pdf` | **Manual de Cambios del Módulo de Registro y Determinación, v03.15.04.00 → v03.16.03.00 (30-09-2016)**: «Registro de Área de Terreno, Valorización de las Áreas Construidas Comunes…» — el documento que la investigación de D-11 identificó como el que explica el incremento del 5 % en el propio SRTM | **D-11 factores 3 y 2** | `16edae4b…ee290e` |
| `…/MC_v03.15.03.00.pdf` | Manual de Cambios v03.15.03.00 (30-06-2015): mejoras a **deducciones por exoneración e inafectación** del predial y arbitrios | Deducciones (contexto de RT-010/RT-011) | `fa66e7e1…bd42b18` |
| `…/v2.0.0_Manual_Usuario_Modulo_Rentas.pdf` … `v6.1.0_Clasificadores_de_Ingreso.pdf` (10 archivos) | La serie de manuales de usuario y de cambios del módulo de Rentas del SRTM: v2.0.0 (manual base), v2.1–2.3 (mejoras), v3.0.0 (arbitrios), v3.1.0 (proceso masivo), v4.0.0 (manual), v5.0.0 (beneficios tributarios y notificaciones), v6.0.0 (multas tributarias y fiscalización), v6.1.0 (clasificadores de ingreso) | Referencia del sistema; **v3.1.0 (proceso masivo) y v5.0.0 (beneficios)** son los primeros a mirar para el `% actualización` y las campañas | ver `sha256sum` abajo |
| `guia-registro-determinacion-ip/Guia_para_el_registro_y_determinacion_IP.pdf` | «Guía para el Registro y Determinación del Impuesto Predial» (MEF, 116 páginas) | Doctrina del MEF; posible segunda fuente del factor 2 | `9f743df4…97c7ed` |

## 5. Legislación tributaria general — prescripción, valores y cobranza coactiva (#192)

Las dos normas que el corpus de #192 transcribe: `prescripcion-y-plazos.md` (ya `VERIFICADO`) y
los dos archivos nuevos del punto 2 (`valores-plazos-de-reclamacion.md` y
`prescripcion-inicio-del-computo.md`) citan estos PDF como fuente consultada.

**Tipo S3: `codigo-tributario`** y **`ejecucion-coactiva`.**

```bash
scripts/valores-normativos/archivar_fuente_normativa.sh \
  --bucket sgtm-fuentes-normativas --ubigeo 200105 --tipo codigo-tributario \
  gob-docs/tuo-codigo-tributario/textoCompleto-TUO-CT.pdf
scripts/valores-normativos/archivar_fuente_normativa.sh \
  --bucket sgtm-fuentes-normativas --ubigeo 200105 --tipo ejecucion-coactiva \
  gob-docs/ds-018-2008-jus/DS-018-2008-JUS.pdf
```

| Archivo | Qué es (leído del contenido) | Cierra | sha256 |
|---|---|---|---|
| `tuo-codigo-tributario/textoCompleto-TUO-CT.pdf` | **El TUO del Código Tributario (D.S. 133-2013-EF) en la edición de SUNAT con modificaciones incorporadas** — 253 páginas; trae los textos vigentes y los anteriores lado a lado, con la nota de qué decreto legislativo tocó cada parte (la más reciente vista: D. Leg. 1540). ⚠️ Su art. 44 termina en el numeral 7: el D. Leg. 1421 **no** le añadió párrafo alguno —trató la prescripción en una disposición complementaria transitoria— | Los arts. 43–46 de `prescripcion-y-plazos.md`; los arts. 44, 78, 136 y 137 del punto 2 de #192 | `d27a0cab…d4023f333` |
| `ds-018-2008-jus/DS-018-2008-JUS.pdf` | **El TUO de la Ley 26979, Ley de Procedimiento de Ejecución Coactiva (D.S. 018-2008-JUS)** — 19 páginas. El capítulo III (arts. 24–33) es el exclusivo de obligaciones tributarias de gobiernos locales: el art. 25 (deuda exigible), el art. 29 (los siete días hábiles de la REC, artículo propio además del art. 14 general) y el art. 31.2 (la OP reclamada sin pago previo) | El art. 14 de `prescripcion-y-plazos.md`; los arts. 25, 29 y 31.2 del punto 2 de #192 | `b662a3eb…934ec4f1` |

**Pendiente de conseguir en PDF: el TUO de la Ley de Tributación Municipal (D.S. 156-2004-EF).**
Su art. 34 (la DJ anual del vehicular) ya está transcrito en `prescripcion-inicio-del-computo.md`
desde el PDF de `muniate.gob.pe` alcanzado en sesión; cuando se descargue, va en
`gob-docs/ds-156-2004-ef/` con **tipo S3 `tributacion-municipal`**, y su huella se añade aquí.

## Huellas completas

```
aeb0eea9d0d2f0f3e3e54b12f651bed8c01a36e3c5d8d29069ca54643f4861e2  ley-27037/5136617-ley-n-27037.pdf
9f743df4139b99d53839034c7785ac3d1210c0c08e07bd758d340d3fef97c7ed  guia-registro-determinacion-ip/Guia_para_el_registro_y_determinacion_IP.pdf
16edae4b1d9880f746991f1d65b8aecd56f6293e1a5ab7675a8d131270ee290e  mef-manuales-registro-determinacion/MC_modulo_registro_determinacion_v0315040_a_0316030.pdf
fa66e7e13e0a9f1c4b7b3a8411a71f0ad41042ecc75d00829dec7e038bd42b18  mef-manuales-registro-determinacion/MC_v03.15.03.00.pdf
0dab13bdad3837fbd50d325e5871e9f3dc2957116d7447ac3dcb44a92adce0f5  rm-172-2016-vivienda/RM_172-2016-VIVIENDA.pdf
9f8334a613177e043949ebc69d0b6745d7d19c0fc985886dc2aa12d01b4e9be5  rm-277-2025-vivienda/anexo_ii.pdf
aa3ca1872d35e3bde7bcf8911dfc99c13ff562ad302efaa1873b9016116a15b0  ds-103-99-ef/ds-103-99-ef.pdf
81eaf3a6014bb44a73cabe477523ecf9db605f1e36fc91c2918d6432acddaf74  rm-277-2025-vivienda/i-1-f-lima-callao-2026.pdf
0df8ac02089aa627ea857213136c9b01b213dfc0049ff7ccb37a10a5da711b37  rm-277-2025-vivienda/i-2-f-costa-2025.pdf
951022064676db0af7aa5619849f6b1dc09192a169ffe6ac7d3d425c3ecd495d  rm-277-2025-vivienda/i-3-f-sierra-2025.pdf
eedb539b760342b01d6282ddecd470b083051282440d25cbdc1ba99998035086  rm-277-2025-vivienda/i-4-f-selva-2025.pdf
94ac5d58dc4f814eb4376b6e4705964495ec65b3648e1fd4569e29883e809e15  rm-277-2025-vivienda/iii-1-obras-complem-lima-callao-2026.pdf
62d0b3bfc9760a0c4668d9ab117abbb825bf311b104414068bc3161c5efcc105  rm-277-2025-vivienda/iii-2-obras-complem-costa-2026.pdf
1edd4ce80c3699fa32118fd343e2e82bfc8adae57779c5543cd2b37d4ce96bd5  rm-277-2025-vivienda/iii-3-obras-complem-sierra-2026.pdf
947bdaa9a6fe0f9310bd1f9b154d7c0c5416fdde61225eb60f8eab88cc2079e4  rm-277-2025-vivienda/iii-4-obras-complem-selva-2026.pdf
9df028d51e7da15425d97dd6792d2bdf2fab6604cd9194d1aba5e9204cfa155d  rm-277-2025-vivienda/rm-277-2025-vivienda-valores-arancelarios-2026-escudo.pdf
918aff84f89382d402d712fa8232def37b18e7951d42f6de291ae4af43d636c8  mef-manuales-registro-determinacion/v2.0.0_Manual_Usuario_Modulo_Rentas.pdf
fd7492aef0b8b3bfc58457cc25084f2dc8e4f6cb2643856942da0447c8d40da5  mef-manuales-registro-determinacion/v2.1.0_Mejoras.pdf
74acc5312665575b5e1bdcbe22c6b7202f750991434774a76d326fd0ea07dc1d  mef-manuales-registro-determinacion/v2.2.0_Mejoras.pdf
2001b4407de22f86e6ae6659b656349d02c8f672aa4ad2c800c6fd87eed13b54  mef-manuales-registro-determinacion/v2.3.0_Mejoras.pdf
278c532c6426b403d53662c4992ded2ca91c6c1c812ee760ee47143723557eec  mef-manuales-registro-determinacion/v3.0.0_Arbitrios_Municipales.pdf
65a380af5e25c78150d971539e4571f54e86dc5fc3fc6aa6b262f1f11abdc90d  mef-manuales-registro-determinacion/v3.1.0_Proceso_Masivo.pdf
8973edd043319473683615802bbed68bfdaf1b79ff8a4eac61f39d9eb3d69995  mef-manuales-registro-determinacion/v4.0.0_Manual_Usuario.pdf
c41076c851c479a494d6aac1b08500f41ba0fabd859c1e7dbce45f1b70e869be  mef-manuales-registro-determinacion/v5.0.0_Beneficios_Tributarios_Notificaciones.pdf
f3338530af946f605c1bcd0a1e82fe06b255167513fc892df1af7efb49207759  mef-manuales-registro-determinacion/v6.0.0_Multas_Tributarias_Fiscalizacion.pdf
2a91371e0971946f7b232d1f1c74ea8f9788ccfd2acb3ee3f94a38ac597424cb  mef-manuales-registro-determinacion/v6.1.0_Clasificadores_de_Ingreso.pdf
d27a0caba13cb4a9b99304f12f4c6bba7f830c482ca625950235051d4023f333  tuo-codigo-tributario/textoCompleto-TUO-CT.pdf
b662a3eba4663c59543bd6ccd3dc1cbb892a692e529305ec04cec4f6934ec4f1  ds-018-2008-jus/DS-018-2008-JUS.pdf
```

## Qué sigue después del archivado

1. Correr los cuatro bloques de `archivar_fuente_normativa.sh` de arriba (tipos:
   `valores-unitarios`, `tasaciones`, `amazonia`, `srtm-manuales`, `mef-guias`) y guardar las
   URIs que imprime.
2. Con las URIs, la transcripción al corpus (`docs/10-negocio/valores-normativos/`) referencia
   el original archivado como `documentoFuente`, igual que la fuente vehicular.
3. Borrar esta rama: su contenido vive en S3 y su identidad en estas huellas.
