# ARQ-01 — Contextos acotados

## 1. Por qué doce y no doce módulos de menú

El menú del sistema tiene 12 módulos, pero el menú organiza **el trabajo del usuario**, no el
modelo. Dos ejemplos del propio manual:

- «Tránsito» e «Infracciones administrativas» son dos módulos del menú con el **mismo modelo**:
  acta, catálogo de infracciones, cálculo de multa, resolución, pase a coactiva. Son **un solo
  contexto** (`sanciones`) con dos catálogos y dos bases legales.
- «Consultas» es un módulo del menú entero, pero no tiene modelo propio: consulta la **cuenta
  corriente**, que sí lo es.

De ahí salen doce contextos. La correspondencia con el menú está en
[NEG-03](../10-negocio/catalogo-de-opciones.md).

## 2. Mapa

```
                    ┌─────────────────┐
                    │  parametros     │  UIT, alicuotas, aranceles, valores
                    │  (sellado por   │  unitarios, depreciacion, CUIS...
                    │   ejercicio)    │
                    └────────┬────────┘
                             │ lee (nunca escribe)
   ┌──────────────┐   ┌──────┴───────┐   ┌───────────────┐
   │  catastro    │──►│   rentas     │◄──│ fiscalizacion │
   │ fichas,      │   │ determinacion│   │ actas, omisos │
   │ predios,     │   │ DJ, benefic. │   └───────────────┘
   │ valuacion    │   └──────┬───────┘
   └──────┬───────┘          │ asienta cargos
          │                  ▼
   ┌──────┴───────┐   ┌──────────────────┐   ┌────────────┐
   │contribuyentes│──►│ cuentacorriente  │◄──│ sanciones  │
   │ codigo unico │   │ libro inmutable  │   │ papeletas  │
   └──────────────┘   └───┬────────┬─────┘   └────────────┘
                          │        │
              asienta     │        │  formaliza
              abonos      ▼        ▼
                   ┌───────────┐  ┌──────────┐   ┌───────────┐
                   │ tesoreria │  │ valores  │──►│ coactiva  │
                   │ caja,     │  │ OP RD RM │   │ expedient.│
                   │ convenios │  └──────────┘   └───────────┘
                   └───────────┘
                   ┌───────────┐   ┌────────────────────────┐
                   │ licencias │──►│ (deuda por tasa)       │
                   └───────────┘   └────────────────────────┘

   seguridad ── transversal: accesos, permisos, auditoria, sesiones
```

## 3. Los contextos

### 3.1 `contribuyentes`
El **código único** del contribuyente y sus datos: identificación, domicilios con vigencia,
documentos, contactos, gestores, observaciones. Todos los demás contextos lo referencian; él no
referencia a ninguno.
*Módulo Gradle:* `sgtm-contribuyentes`.

### 3.2 `catastro`
Predios y sus fichas —única, económica, bienes comunes, rural—, titularidad, construcciones por
piso, otras instalaciones, inquilinos, y los catálogos de vías, sectores y manzanas. Incluye las
**tablas de valuación** (aranceles, valores unitarios, depreciación) porque describen el predio,
no la obligación.
**Invariante:** una ficha nunca se sobrescribe; se versiona.
*Módulo Gradle:* `sgtm-catastro`.

### 3.3 `rentas`
La **determinación**: predial, arbitrios, patrimonio vehicular, alcabala, espectáculos. Vehículos,
declaraciones juradas, transferencias y beneficios. Es el único contexto que decide **cuánto se
debe**.
**Regla:** toda determinación guarda el conjunto de parámetros con que se calculó y las reglas
aplicadas. Sin eso no es reproducible.
*Módulo Gradle:* `sgtm-rentas`.

### 3.4 `parametros`
Los valores normativos versionados y su sellado por ejercicio. **Solo se lee** desde los demás
contextos. Escribir aquí es un acto administrativo con doble verificación, no una operación de
negocio.
*Módulo Gradle:* `sgtm-parametros`.

### 3.5 `fiscalizacion`
Programación, actas prediales y vehiculares, resultados, omisos y subvaluadores, liquidación y
reliquidación. Trabaja sobre **copias** de las fichas: hasta la transferencia, nada de lo que
registra es el dato oficial.
**Frontera delicada:** la transferencia a rentas. Es el único camino de escritura hacia
`catastro` y `rentas`, y va con sustento y versión.
*Módulo Gradle:* `sgtm-fiscalizacion`.

### 3.6 `sanciones`
Papeletas de tránsito y administrativas, catálogos de infracciones (tránsito y CUIS),
notificaciones previas, descargos, internamiento y resoluciones de gerencia. Un solo modelo, dos
familias.
*Módulo Gradle:* `sgtm-sanciones`.

### 3.7 `cuentacorriente`
El **libro de asientos**: cargos y abonos por contribuyente, tributo, periodo y unidad. Altas
(nota de abono) y bajas (nota de cargo). Saldo proyectado como caché reconstruible.
**Invariante:** inmutable. Sin `UPDATE`, sin `DELETE`; se reversa con otro asiento.
**No existe «la deuda»**: existe `deudaActualizadaA(fecha)`.
*Módulo Gradle:* `sgtm-cuentacorriente`.

### 3.8 `tesoreria`
Caja tributaria y de tasas, recibos, anulación del día, convenios de fraccionamiento con su
preconvenio y su quiebre, cierre de caja y recaudación por área y partida presupuestal.
Asienta **abonos**; nunca determina.
*Módulo Gradle:* `sgtm-tesoreria`.

### 3.9 `valores`
Orden de pago, resolución de determinación y resolución de multa: la deuda formalizada en un
documento notificable, con su base legal, su numeración correlativa y su notificación.
*Módulo Gradle:* `sgtm-valores`.

### 3.10 `coactiva`
Expedientes, importación de valores, REC-1 y REC-2, actos coactivos, notificaciones, costas
procesales y fraccionamiento coactivo.
*Módulo Gradle:* `sgtm-coactiva`.

### 3.11 `licencias`
Licencias de funcionamiento (con giros CIIU, duplicados, cancelación), licencias de edificación
(FUE) y autorizaciones de anuncios. Genera deuda por la tasa correspondiente **pidiéndoselo a
`cuentacorriente`**; no asienta por su cuenta.
*Módulo Gradle:* `sgtm-licencias`.

### 3.12 `seguridad`
Módulos, accesos y políticas, grupos, usuarios, miembros, permisos, sesiones y **auditoría**.
Transversal: todos dependen de él y él de ninguno.
*Módulo Gradle:* `sgtm-seguridad`.

## 4. Reglas de dependencia

1. **Un contexto se importa solo por su API pública.** En Java, el paquete raíz del contexto;
   nunca `…​.dominio.…` ni `…​.infraestructura.…` de otro. Lo verifica Spring Modulith.
2. **`cuentacorriente` no conoce a nadie.** Recibe asientos; no sabe si vienen de un predial, de
   una papeleta o de una licencia. Si tuviera que saberlo, el modelo estaría mal.
3. **`parametros` es de solo lectura** para todos los demás.
4. **Nadie escribe en `catastro` salvo `catastro` y la transferencia de `fiscalizacion`.**
5. **Ningún método público de un contexto recibe `municipalidadId`.** Sale del token.
   Lo verifica ArchUnit.
6. Lo compartido entre contextos —`MunicipalidadId`, `Ejercicio`, `Dinero`, `TenantContext`— vive
   en `sgtm-dominio-compartido`, y ese módulo **no depende de ninguno**.

## 5. Estado actual

Los doce módulos Gradle existen; **todos vacíos**, con solo su `package-info.java`. Es
deliberado: la estructura fija los límites antes de que haya código que los cruce. La primera
funcionalidad de negocio está bloqueada por D-01 y D-02
([GOB-02](../00-gobierno/decisiones-abiertas.md)).
