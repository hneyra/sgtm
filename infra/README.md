# `infra/` — la infraestructura del SGTM, como código

Pulumi en TypeScript con yarn, dos stacks —`stg` y `prod`— del mismo `index.ts`, sobre
un k3s de un solo nodo en un VPS propio. La decisión, con sus alternativas y sus costos,
está en [`ADR-0011`](../docs/30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md);
la topología, en [`INF-01`](../docs/80-infraestructura/arquitectura-de-infraestructura.md);
los ambientes, en [`INF-03`](../docs/80-infraestructura/ambientes.md).

**Hoy esto es el andamio.** Compila, se valida y se puede previsualizar, y **no crea ni
un recurso**: `componentes/` está vacía a propósito ([por qué, y qué entra ahí](componentes/README.md)).

```bash
cd infra
yarn install
yarn verificar        # lint, tipos y pruebas. Lo que hay que pasar antes de un PR
```

`yarn verificar` **no necesita Pulumi, ni token, ni clúster.** Es deliberado: la parte
que puede equivocarse a diario —un valor que falta, un plazo que degrada el RPO, una
etiqueta que se cuela en el estado— se detecta en la máquina de quien lo escribe.

## Las piezas

| Archivo | Qué es |
|---|---|
| `Pulumi.yaml` | El proyecto. Fija `packagemanager: yarn` |
| `Pulumi.prod.yaml` · `Pulumi.stg.yaml` | La configuración **en claro** de cada ambiente. Los secretos no están aquí |
| `config.ts` | **Toda** la configuración: se lee, se le ponen valores por omisión y se valida |
| `config.test.ts` | Un caso que viola cada invariante |
| `index.ts` | La composición. Una sola, para los dos ambientes |
| `componentes/` | Vacía. Entra con #149 a #153 |
| `verificaciones/` | Que las reglas de ESLint muerden, y que los stacks versionados cumplen |

## La regla que sostiene todo lo demás

**La configuración se lee en `config.ts` y se valida ahí.** No hay `new pulumi.Config()`
ni `process.env` en ningún otro archivo, y una regla de ESLint lo impide con su muestra
que la viola.

El motivo no es de estilo. Un `config.require("domain")` dentro de un componente
convierte «falta el dominio» en un fallo **a mitad del despliegue**, con el clúster ya a
medio cambiar, en vez de un fallo del arranque que dice qué valor falta y para qué sirve:

```
Falta el valor obligatorio «sgtm:domain» en la configuración del stack.
Sirve para: el nombre público por el que llega el navegador.
Ponlo con `pulumi config set domain <valor>`.
```

## Las invariantes, y de dónde sale cada una

`checkInvariants` no comprueba tipos —de eso se encarga TypeScript—: comprueba que la
configuración **no contradiga lo que el proyecto ya decidió por escrito**.

| Invariante | De dónde sale |
|---|---|
| El stack es `stg` o `prod`. Local no es un stack | `ADR-0011` §4 |
| `acmeEmail` tiene forma de correo; en `prod` no se admite el certificado de pruebas de Let's Encrypt | RNF-074 |
| No se publica ningún puerto del nodo además de 80 y 443 | RNF-074, `INF-01` §1.4 |
| El destino de respaldo **no** resuelve dentro del nodo | `INF-01` §1.3 |
| El contenedor de respaldo nombra su ambiente | `INF-03` §4 |
| `walArchiveTimeoutSeconds` ≤ 300 | RNF-076: **este valor es el RPO** |
| `restoreSourceBucket` solo en `stg`, y distinto de su propio contenedor | `INF-03` §2 |
| `stg` va marcada como instalación de demostración | `INF-03` §3.2, #122 |
| Keycloak nunca en `start-dev`; usuarios de prueba nunca en `prod` | `INF-01` §1, `INF-03` §4 |
| Las claves de los roles no se generan en el estado de Pulumi | `ADR-0011` §3 |
| `applicationImageRepository` **sin etiqueta** | `ADR-0011` §5 |
| Las imágenes fijan versión; nada de `latest` | `INF-01` §5 |
| El `server` del kubeconfig apunta al bucle local | `INF-01` §1.4 — la cicatriz de `../iaac` |

> **Una nota sobre la última fila de `ADR-0011` §5.** El ADR anotaba como costo aceptado
> que la frontera de la versión de la imagen «no tiene verificación automática todavía;
> es una revisión de PR». Ahora sí la tiene: `applicationImageRepository` con etiqueta
> pone rojo el stack. El ADR no se edita —así es como se registran las decisiones—, pero
> conviene saber que en este punto el código llegó más lejos que el documento.

## Cómo se demuestra que las verificaciones pueden fallar

Las cuatro se ejercen editando archivos reales y viendo el rojo:

| Rotura | Qué se pone rojo |
|---|---|
| Quitar `sgtm:domain` de `Pulumi.prod.yaml` | `yarn test`, nombrando el valor que falta |
| Subir `walArchiveTimeoutSeconds` a 3600 | `yarn test`, citando RNF-076 |
| Ponerle etiqueta a `applicationImageRepository` | `yarn test`, citando `ADR-0011` §5 |
| Copiar la lectura de configuración a un componente | `yarn lint` |

## Cómo llegar a un VPS real

`.github/workflows/infra.yml` ya tiene los cinco trabajos de `ADR-0011` §6 —`verificar`,
`previsualizar`, `aplicar-stg`, `aplicar-prod` y la detección de deriva diaria—, con el
túnel SSH de `INF-01` §1.4 en los tres que hablan con el clúster. **Ninguno puede correr
de verdad todavía**, porque el VPS no existe: los cuatro trabajos que lo necesitan se
**omiten con un aviso** en el resumen, no con un rojo, mientras falte cualquiera de sus
credenciales. Esto es lo que falta, en orden:

### 1. El VPS y k3s

Aprovisionar el VPS y correr el instalador de k3s en él es trabajo fuera de este
repositorio —no hay nada que un PR pueda automatizar sin la cuenta del proveedor—. El
resultado que este flujo necesita es **el kubeconfig del nodo**, con el `server` cambiado
a `https://localhost:6443` (`INF-01` §1.4):

```bash
# En el VPS, una vez que k3s está instalado:
sudo cat /etc/rancher/k3s/k3s.yaml | sed 's#server: https://127.0.0.1:6443#server: https://localhost:6443#'
```

### 2. Los dos stacks de Pulumi

```bash
cd infra
pulumi stack init sgtm/stg
pulumi stack init sgtm/prod

# Los secretos, uno por ambiente y sin reutilizar ninguno entre ambientes (INF-03 §4).
pulumi config set --secret kubeconfig "$(cat k3s.yaml)"      --stack prod
pulumi config set --secret keycloakAdminPassword <valor>     --stack prod
pulumi config set --secret backupAccessKeyId <valor>         --stack prod
pulumi config set --secret backupSecretAccessKey <valor>     --stack prod
# Y lo mismo con --stack stg, con sus propios valores.
```

**Los dominios y los destinos de los stacks versionados son de ejemplo** —`example.pe`,
`s3.example.net`— porque el proveedor del VPS y el del almacenamiento de objetos siguen
sin decidirse ([`INF-01` §7](../docs/80-infraestructura/arquitectura-de-infraestructura.md)).
Se reemplazan cuando se decidan; las invariantes ya valen igual.

### 3. La clave SSH de despliegue, y solo de despliegue

**No la de una persona.** Un par de claves nuevo, cuya única función es abrir el túnel
que este flujo necesita:

```bash
ssh-keygen -t ed25519 -f despliegue-sgtm -C "github-actions@sgtm" -N ""
# La pública, en su propia línea de authorized_keys del VPS —para poder revocarla sola,
# sin tocar la de nadie más—. Si el VPS lo permite, restringida a NO abrir una shell:
#   command="echo 'solo tunel'",no-pty,no-X11-forwarding,no-agent-forwarding <clave-publica>
```

### 4. Los cuatro secretos de GitHub Actions

`Settings → Secrets and variables → Actions`, en este repositorio:

| Secreto | Valor |
|---|---|
| `PULUMI_ACCESS_TOKEN` | Token de Pulumi Cloud |
| `SSH_PRIVATE_KEY` | La **privada** de `despliegue-sgtm`, completa |
| `VPS_USER` | El usuario con el que se conecta esa clave |
| `VPS_HOST` | La IP o el nombre del VPS |

Con los cuatro puestos, `previsualizar` y `aplicar-stg` corren solos. `aplicar-prod`
necesita además el paso 5.

### 5. El *environment* `prod`, con aprobación requerida

**Este es el paso que ningún YAML de este repositorio puede hacer por sí mismo.** El
criterio de este issue —«`prod` no se aplica hasta que alguien aprueba, y queda
registrado quién»— no lo cumple el archivo del flujo: lo cumple GitHub, y solo si el
*environment* existe con esa regla puesta.

`Settings → Environments → New environment` → nombre **`prod`** (tiene que ser exacto:
es el nombre que `environment: prod` del job `aplicar-prod` referencia) → **Required
reviewers** → añadir a quien tenga que aprobar. Sin este paso, GitHub trata `prod` como
un nombre libre sin protección y el trabajo corre sin que nadie lo mire — que es
exactamente el estado que esta separación existe para impedir. Quién aprueba es una
decisión de las personas del proyecto, no una que este repositorio pueda tomar.

## Lo que no está aquí, y dónde está

| Cosa | Dónde |
|---|---|
| El entorno local | [`despliegue/compose.yaml`](../despliegue/README.md). **No se retira** |
| El destino real de las alertas de deriva (hoy: el trabajo se pone rojo, y nada más) | #156 |
| La huella SSH del VPS fijada de antemano, en vez de confiada la primera vez | #157 |
| La etiqueta de las tres imágenes | El flujo de liberación, #148 |
| De dónde salen los secretos de la aplicación | #154 |
| Los runbooks de restauración | #158 |
