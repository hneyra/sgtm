# REQ-03 — Actores y permisos

El manual (cap. 4) describe un modelo de autorización propio, y bastante fino. **Se conserva
íntegro**: es el que los usuarios conocen y el que la interfaz refleja.

## 1. El modelo del manual

```
Módulo  ── sistema controlado por el módulo de seguridad
   │
   ├── Acceso ─────── opción de menú  |  política
   │
   ├── Grupo ──────── conjunto de usuarios con el mismo nivel de privilegios
   │      │
   │      └── Miembro ── usuario que pertenece al grupo
   │
   └── Permiso ────── (grupo | usuario) × acceso × privilegios
                       ejecución · lectura · registro · modificación
                       eliminación · impresión · especial
```

Cinco reglas del manual que no son negociables:

1. **El permiso se otorga preferentemente al grupo**, no al usuario. El manual lo recomienda
   expresamente; el sistema admite ambos.
2. **Un acceso puede ser una opción de menú o una política.** La política no abre una pantalla:
   habilita una capacidad («cambiar el año de trabajo», «anular recibo de otro cajero»).
3. **Al aparecer una opción de menú nueva, el sistema la reconoce y la ofrece para configurar.**
   Nunca queda una opción sin registrar y, por tanto, sin controlar.
4. **La autorización tiene fecha de inicio y de fin**, y usuarios y grupos pueden inhabilitarse
   sin borrarse.
5. **Restringir opciones reduce errores**, voluntarios e involuntarios. La autorización es de
   negación por omisión: sin permiso explícito, no hay acceso.

## 2. Qué cambia respecto del original

El manual describe seguridad integrada con el dominio Windows: el usuario de red inicia sesión,
el sistema le pide una clave la primera vez, la cifra y la guarda.

Aquí la **autenticación** pasa a OpenID Connect ([ADR-0005](../30-arquitectura/adr/ADR-0005-identidad-y-acceso.md))
y la **autorización** sigue siendo la del manual, en la base de datos. Motivo: los permisos del
manual son de grano fino y cambian a diario —un cajero nuevo, una campaña, un área que asume un
trámite—; ponerlos en el proveedor de identidad convertiría cada alta en un ticket de operación.

Del proveedor de identidad viene **quién eres** y **en qué municipalidad estás**. Del sistema,
**qué puedes hacer**.

## 3. Roles funcionales

Los grupos del manual, tal como aparecen en las capturas y en los perfiles de uso. Cada
instalación crea los suyos; estos son la plantilla inicial.

| Grupo | Alcance típico |
|---|---|
| **Administrador del sistema** | El catálogo completo, los siete privilegios: administra la municipalidad entera (como el superadministrador de un ERP). La implantación (`ImplantarMunicipalidad`) crea con este alcance al primer administrador; las reglas de separación de funciones (§4) siguen verificándose en el servidor al margen de los permisos |
| **Seguridad** | Solo el módulo de seguridad: administra el acceso de los usuarios —grupos, usuarios, permisos, miembros— sin tocar el resto. Es el alcance que tuvo «Administrador del sistema» antes de recibir el catálogo completo. La implantación lo crea **sin miembros**, como plantilla |
| **Jefe de Rentas** | Todo el módulo de rentas, valores y consultas. Autoriza altas y bajas de deuda |
| **Registrador de catastro** | Fichas catastrales, catálogos catastrales. Sin acceso a caja |
| **Fiscalizador** | Módulo de fiscalización y consultas. No modifica el padrón de rentas directamente: solo por transferencia |
| **Cajero** | Caja tributaria y de tasas, duplicado de recibo, cierre de su caja. **No** anula recibos de otro cajero ni ve coactiva |
| **Tesorero** | Cierre de caja, anulación de recibos, recaudación por área, convenios |
| **Ejecutor coactivo** | Expedientes, actos, REC, notificaciones, fraccionamiento coactivo |
| **Auxiliar coactivo** | Registro dentro de los expedientes asignados; no emite REC |
| **Operador de tránsito** | Papeletas, descargos, internamiento, reportes de tránsito |
| **Operador de licencias** | Licencias de funcionamiento y edificación, anuncios, CIIU |
| **Consulta** | Solo lectura de consultas y reportes. Sin registro ni modificación |

## 4. Reglas de separación de funciones

Independientes de cómo se configuren los grupos; se verifican en el servidor:

| # | Regla | Motivo |
|---|---|---|
| SoD-1 | Quien **carga** un parámetro tributario no puede **aprobarlo** | Un error de tipeo en una alícuota afecta a todo el padrón (RNF-092, restricción en la tabla) |
| SoD-2 | Quien **cobra** no puede **dar de baja** la deuda que cobra | Evita el cobro sin registro |
| SoD-3 | Un cajero solo anula recibos **de su propia caja y del mismo día** | Es lo que el manual describe; la anulación posterior exige otro rol |
| SoD-4 | Quien **fiscaliza** no **transfiere** su propio resultado a rentas sin aprobación | La transferencia sobrescribe el padrón |
| SoD-5 | Los permisos los configura solo el administrador del sistema, y **la configuración también se audita** | Sin esto, el auditor puede alterar su propia pista |

## 5. Cómo se lleva esto al código

- El catálogo de accesos se **siembra desde el catálogo de opciones**
  ([NEG-03](../10-negocio/catalogo-de-opciones.md)): las 134 opciones son 134 accesos de tipo
  `OPCION_MENU`. Las políticas se declaran aparte.
- La comprobación es del **servidor**. Que la interfaz oculte una opción es comodidad, no
  seguridad.
- Los permisos efectivos de un usuario son la unión de los de sus grupos y los suyos propios,
  restringidos por la vigencia de la autorización y por el estado de habilitación.
- **El aislamiento entre municipalidades no depende de este modelo.** Lo garantiza RLS en la base
  de datos. Un fallo de permisos deja ver algo de más *dentro* de la municipalidad; nunca de otra.
