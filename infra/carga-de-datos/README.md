# Carga de datos

Los procesos que meten datos en una instalación ya desplegada, y los archivos de ejemplo con que
se prueban. Todos corren el **mismo artefacto** que la aplicación, en el perfil `batch`, como un
Job de un solo uso (ADR-0003): no hay un binario de carga aparte que pueda divergir del que
atiende peticiones.

Hay dos familias, y la diferencia no es de forma sino de **qué se puede afirmar del dato**:

| Familia | Qué escribe | Guarda |
|---|---|---|
| **Valores normativos** — `publicar-parametros.sh`, `publicar-cuadros.sh`, `abrir-conjunto-parametros.sh`, `cargar-arancel-vial.sh` | Cifras que la ley o la ordenanza fijan | Doble firma del corpus (ADR-0007), rol `rol_carga_parametros`, conjunto sellado |
| **Municipalidad de demostración** — `sembrar-demostracion.sh` y los nueve `cargar-*` que orquesta | Personas, predios, vehículos y saldos **inventados** | `municipalidad.es_demostracion = true`, comprobado contra la base antes de leer una fila |

**Ninguna cifra normativa entra por la segunda familia**, y es lo único que no se negocia en este
directorio. Un arancel, un valor unitario o un tramo del predial inventados se distinguen de los
reales solo por quien los puso; una vez en la base, producen deuda mal calculada en todo un padrón.
Por eso la siembra de demostración no pone ni una: las pantallas que necesitan valores sellados
tienen que seguir diciendo «sin conjunto sellado» mientras D-02a esté abierta.

## La municipalidad de demostración

```bash
./sembrar-demostracion.sh --ambiente stg --municipalidad-id 4
```

Nueve pasos, en el único orden en que se pueden dar. No es documentación: cada archivo nombra por
código algo que otro tuvo que escribir antes, y la fila que nombre algo inexistente **se rechaza**
—no revienta la carga, se rechaza sola y la siguiente entra—. Ejecutados en desorden el resultado
no es un error ruidoso, es un «0 nuevas, N rechazadas» que se puede leer por encima.

| # | Guión | Archivo | Depende de |
|---|---|---|---|
| 1 | `cargar-catalogo-vial.sh` | `ejemplos/vias.csv` | — |
| 2 | `cargar-sectores.sh` | `ejemplos/sectores.csv` | — |
| 3 | `cargar-manzanas.sh` | `ejemplos/manzanas.csv` | el sector |
| 4 | `cargar-contribuyentes-demo.sh` | `ejemplos/contribuyentes.csv` | — |
| 5 | `cargar-fichas-demo.sh` | `ejemplos/fichas.csv` | sector, manzana, vía y contribuyente |
| 6 | `cargar-detalle-fichas-demo.sh` | `ejemplos/detalle-de-fichas.csv` | la ficha del predio, que **versiona** |
| 7 | `cargar-vehiculos-demo.sh` | `ejemplos/vehiculos.csv` | el contribuyente |
| 8 | `cargar-transferencias-demo.sh` | `ejemplos/transferencias.csv` | el predio y el vehículo |
| 9 | `cargar-deuda-demo.sh` | `ejemplos/deuda.csv` | contribuyente, predio y vehículo |

Los pasos 4 a 9 **exigen `municipalidad.es_demostracion = true`**, comprobado contra la base por
cada proceso —no por el guión— antes de leer una sola fila. Un `--municipalidad-id` equivocado en
un dígito no siembra ocho personas que no existen en el padrón de una municipalidad que ya opera, y
aquí no se borra nada (RNF-051). Los pasos 1 a 3 no la exigen: un catálogo vial es estructura real,
y ese mismo mecanismo es por el que un día entrará el catálogo de verdad.

Repetir un paso **no duplica**: las filas ya cargadas se rechazan una a una por violar su unicidad.
`--desde N` retoma una siembra interrumpida.

### Qué escenario cubre el juego de datos

16 contribuyentes, 23 predios con sus 45 versiones de ficha, 8 vehículos, 7 transferencias y 54
obligaciones en el libro. No es un volumen de prueba de carga: es una **cobertura de casos**, elegida para que cada pantalla que
lee datos tenga delante el caso que existe para tratar.

**Catastro y titularidad**

- Contribuyentes con **uno, dos, tres y cuatro predios** (`C-000002`, `C-000013`, `C-000007`,
  `C-000014`). El de cuatro es el de mayor base del padrón, y existe porque la base del predial es
  **por contribuyente y no por predio** (NEG-05 §1): con un predio por persona esa distinción no se
  puede ni mirar.
- Las **cuatro clases de ficha** —única, económica, bienes comunes y rural— y las dos clases de
  predio, urbano y rústico.
- Titularidad en sus seis condiciones: propietario único, copropietario, cónyuge, poseedor,
  sucesión y —tras una transferencia— copropiedad producida.
- Un **predio sin titular** (`Calle Tacna 82`). No es un descuido: en un levantamiento catastral es
  lo normal fichar antes de identificar al propietario, y es el único modo de que la conciliación
  catastro↔rentas (ADR-0015) y la detección de omisos tengan delante su caso.
- Dos departamentos del **mismo edificio**, con sus tramos de edificación, entrada, piso y unidad
  distintos del resto.

**El predio por dentro**

Un predio con ficha pero sin nada dentro es media pantalla vacía, así que `detalle-de-fichas.csv`
llena las cuatro clases de ficha con lo suyo: **22 construcciones** por piso —con su año, material,
estado de conservación, las siete categorías constructivas del manual y su % construido, incluida
una obra al 60 %—, **5 obras complementarias** (cerco, horno, piscina, patios), **5 actividades
económicas** con su CIIU, **3 bienes comunes** con el **reparto entre los dos departamentos**, y
**5 grupos de tierra** rural con su calidad agrológica, su riego y **7 colindantes** por
orientación.

Dos cosas de ese archivo no son detalle sino diseño:

- **La unidad de carga es el predio, no la fila.** Una versión de ficha es atómica —todas las filas
  de un mismo código predial entran en una sola llamada— porque `siguienteVersion` copia de la
  anterior lo que no se le mande, y media versión es una ficha que miente. De ahí que el informe
  cuente *fichas versionadas* y no filas.
- **Versiona, no sobrescribe.** Cada predio acaba con **dos** versiones de ficha: la que inscribió
  `fichas.csv` y ésta. No es un efecto colateral que disculpar, es la invariante del catastro
  ejercitada de verdad, y de paso deja historial que mirar en la pantalla que lo lee.

Un predio se queda fuera a propósito: `Jirón Cusco 900` es un **terreno sin construir**, así que su
ficha conserva cero construcciones. La pantalla tiene que saber dibujar eso, y sin este caso nunca
se le pediría.

**Transferencias y % de un predio**

`fichas.csv` inscribe cada predio con **un** titular, y una segunda fila del mismo predio se
rechazaría —ya tiene ficha vigente—. La copropiedad no se declara: se **produce**, con una
transferencia parcial, que es como ocurre en la realidad. De ahí que el archivo 7 sea el que trae
los casos que más se piden:

| Caso | Dónde |
|---|---|
| Venta **parcial del 40 %** → dos cuotas vivas, 40 % y 60 % | `Calle Grau 133`, `C-000014` → `C-000010` |
| **Cadena de dos ventas** sobre el mismo predio → el titular depende de la fecha por la que se pregunte | `Calle Ayacucho 512`: `C-000013` → `C-000009` (feb) → `C-000010` (jun) |
| Copropiedad **al 50 %** | `Jirón Cusco 900`, `C-000015` → `C-000009` |
| **Anticipo de legítima** del 25 % sobre predio rústico en sucesión | `Fundo Simbila Chico`, `C-000008` → `C-000004` |
| Transferencia de **vehículo** | `ZTR-101` y `ZKS-916` |

La cadena es la que da algo que mirar a la regla 9: preguntar por marzo tiene que devolver a
`C-000009` y no al último dueño.

**Padrón vehicular**

Ocho vehículos, con los años de inscripción repartidos a propósito: `ZTR-101` y `ZQU-880` quedan
**fuera** de los tres ejercicios de afectación en 2026 y los demás dentro. La afectación no es una
columna —se deduce de `Vehiculo.afectoEn`—, así que sin esa mezcla no se puede ver funcionando.

**Deuda**

54 obligaciones: predial por contribuyente en cuatro cuotas, arbitrios por predio, vehicular por
vehículo, y un contribuyente con deuda en **dos ejercicios**. Con eso tienen datos la caja, el
estado de cuenta, la consulta unificada, la ficha 360°, el portal del contribuyente y el panel de
recaudación.

### Qué NO siembra, y por qué

Lo que falta no es una lista de pendientes: cada línea es una decisión.

| No se siembra | Por qué |
|---|---|
| Aranceles, valores unitarios de edificación, tablas de depreciación, valores referenciales de vehículos, tramos y alícuotas del predial | Son **valores normativos**. Entran por `publicar-parametros.sh` / `publicar-cuadros.sh` desde el corpus verificado a doble firma, o no entran (D-02a, D-02b, D-13) |
| Determinaciones —predial, arbitrios, vehicular, alcabala— | Determinar es aplicar reglas, y las reglas siguen bloqueadas por **D-11**: cuatro factores que NEG-05 §0.1 marca sin fuente identificada. Un tramo equivocado produce deuda mal calculada en todo el padrón |
| Deuda de ejercicios **anteriores a 2026** | `cuenta_corriente_asiento` está particionado por ejercicio y solo tiene declaradas 2026 y 2027: una fila de 2024 se rechaza con «no partition of relation found». Es también lo que impide sembrar hoy una cartera coactiva realista |
| Años de construcción **anteriores a 1990** | `Construccion.anioConstruccion` es un `Ejercicio`, y `Ejercicio` admite de 1990 a 2100 —el mismo rango que el dominio `ejercicio` de PostgreSQL—, porque es el tipo del *ejercicio tributario* reutilizado como «año de construcción». Una casa de adobe de 1979, corriente en el distrito, hoy **no se puede fichar** |
| Cajas, turnos y recibos | **Nada crea un `area` ni una `caja`**: no hay caso de uso ni endpoint que las dé de alta, solo las fixtures de prueba. Sin una caja no se puede abrir turno, y sin turno no se puede cobrar |
| Papeletas, licencias, anuncios, expedientes coactivos | Sus importes salen del catálogo de infracciones, del arancel de costas y de los derechos de trámite, que son **ordenanza local** (D-02b) |

El monto de `deuda.csv` **no cae en ninguna de esas casillas**, y conviene decir por qué: no lo
calcula nadie, entra como dato, igual que entraría el saldo de la base anterior el día que se cierre
D-04. Es el mismo acto que la pantalla «Alta de deuda» publica (RF-043), donde el importe lo teclea
quien atiende y el sistema no lo discute. Lo que esas filas **no** hacen es emitir ninguna
resolución de determinación ni escribir en `determinacion`: la deuda se cobra y se lee, pero el
sistema no reclama haber aplicado ninguna regla para llegar a ella. La alternativa —inventar los
tramos para que «cuadre»— produce cifras indistinguibles de las de una determinación real.

## Valores normativos

La secuencia de un ejercicio, en cuatro pasos y en este orden:

```bash
# 1. abrir el conjunto del ejercicio -> anotar el CONJUNTO_ID que imprime
./abrir-conjunto-parametros.sh --ambiente stg --municipalidad-id 4 --ejercicio 2026

# 2. publicar los valores (corre como rol_carga_parametros, con la doble firma del corpus)
./publicar-parametros.sh --ambiente stg \
  --archivo ../../docs/10-negocio/valores-normativos/publicacion/parametros-2026.csv
./publicar-cuadros.sh --ambiente stg \
  --archivo ../../docs/10-negocio/valores-normativos/publicacion/cuadros-2026.csv

# 3. el arancel vial de la municipalidad, contra ese conjunto
./cargar-arancel-vial.sh --ambiente stg --municipalidad-id 4 --conjunto-id N --archivo arancel_2026.csv

# 4. sellar. Irreversible: un conjunto sellado no se modifica (V9)
./abrir-conjunto-parametros.sh --ambiente stg --municipalidad-id 4 --conjunto-id N \
  --archivo ../../docs/10-negocio/valores-normativos/publicacion/parametros-2026.csv --sellar
```

Los pasos 2 y 4 llevan **el mismo archivo**, y no es comodidad: con dos, el día que alguien añade
una fila a uno y se olvida del otro, el conjunto se sella sin ese valor y nadie lo nota hasta que
una regla lo pide. Y ese archivo **no se escribe a mano**: es el derivado del corpus, y
`docs/10-negocio/verificar-publicacion.mjs` comprueba en cada PR que cada cifra esté letra por letra
en el archivo verificado que la fila nombra.

## Probarlo sin clúster

Todos los guiones de este directorio hablan con Kubernetes. Para recorrer las pantallas en local, la instalación entera
—motor, migración y aplicación, ya **marcada como de demostración**— la levanta el `compose` de
[`despliegue/`](../../despliegue/README.md), y la siembra es el **mismo artefacto** con el perfil
`batch` y una variable por paso:

```bash
cd ../../backend && ./gradlew :sgtm-aplicacion:bootJar

export SPRING_PROFILES_ACTIVE=batch
export SGTM_DB_URL=jdbc:postgresql://localhost:5432/sgtm
export SGTM_DB_USUARIO=sgtm_app SGTM_DB_CLAVE=…

E=../infra/carga-de-datos/ejemplos
J=sgtm-aplicacion/build/libs/sgtm.jar
SGTM_CARGAVIAL_MUNICIPALIDADID=1            SGTM_CARGAVIAL_ARCHIVO=$E/vias.csv            java -jar $J
SGTM_CARGASECTORES_MUNICIPALIDADID=1        SGTM_CARGASECTORES_ARCHIVO=$E/sectores.csv    java -jar $J
SGTM_CARGAMANZANAS_MUNICIPALIDADID=1        SGTM_CARGAMANZANAS_ARCHIVO=$E/manzanas.csv    java -jar $J
SGTM_CARGACONTRIBUYENTESDEMO_MUNICIPALIDADID=1 SGTM_CARGACONTRIBUYENTESDEMO_ARCHIVO=$E/contribuyentes.csv java -jar $J
SGTM_CARGAFICHASDEMO_MUNICIPALIDADID=1      SGTM_CARGAFICHASDEMO_ARCHIVO=$E/fichas.csv    java -jar $J
SGTM_CARGADETALLEFICHASDEMO_MUNICIPALIDADID=1 SGTM_CARGADETALLEFICHASDEMO_ARCHIVO=$E/detalle-de-fichas.csv java -jar $J
SGTM_CARGAVEHICULOSDEMO_MUNICIPALIDADID=1   SGTM_CARGAVEHICULOSDEMO_ARCHIVO=$E/vehiculos.csv java -jar $J
SGTM_CARGATRANSFERENCIASDEMO_MUNICIPALIDADID=1 SGTM_CARGATRANSFERENCIASDEMO_ARCHIVO=$E/transferencias.csv java -jar $J
SGTM_CARGADEUDADEMO_MUNICIPALIDADID=1       SGTM_CARGADEUDADEMO_ARCHIVO=$E/deuda.csv      java -jar $J
```

Cada proceso se enciende **solo** si su propiedad `…_ARCHIVO` está puesta
(`@ConditionalOnProperty`), así que el mismo contenedor —o el mismo `jar`— sirve para los nueve y no
hace nada de más. El `--municipalidad-id` es el que imprimió la implantación, y tiene que ser el de
una municipalidad marcada como de demostración: si no, los pasos 4 a 9 se paran sin escribir nada.
