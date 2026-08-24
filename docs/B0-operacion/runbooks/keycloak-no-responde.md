# Runbook — Keycloak no responde

| Campo | Valor |
|---|---|
| Cuándo | Nadie nuevo puede iniciar sesión; quien ya entró sigue funcionando hasta que expire su token |
| Por qué la aplicación no se cae con Keycloak | Con `jwk-set-uri` configurado, el validador de tokens se construye **sin descubrimiento**: las claves se piden la primera vez que llega un token y se cachean (`despliegue/README.md` §«La identidad») |
| Estado del ensayo | Verificado que la aplicación **arranca** sin esperar a Keycloak, en CI. No ensayado el escenario de Keycloak cayendo con sesiones **ya activas** contra un clúster real |

## Síntoma

Los funcionarios reportan que no pueden entrar, o el navegador se queda esperando en la
pantalla de acceso de Keycloak. **Quien ya tenía sesión sigue trabajando** — si nadie
puede hacer nada en absoluto, incluida gente que entró hace cinco minutos, el problema no
es Keycloak: es la aplicación o la red, y este no es el runbook.

## Precondiciones

1. Acceso `kubectl` al ambiente.
2. Distinguir **antes de actuar** entre dos causas, porque los pasos son distintos:
   - El pod de Keycloak está caído o reiniciando → §1.
   - El pod responde pero el realm quedó inconsistente (tras un cambio manual, o una
     reconciliación fallida) → §2.

```bash
kubectl -n sgtm-<amb> get pods -l app=sgtm-<amb>-identidad
```

## Pasos

### 1. El pod está caído

k3s lo reprograma solo, igual que cualquier otro pod sin estado
([`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §5). Si no
vuelve en unos minutos:

```bash
kubectl -n sgtm-<amb> describe pod -l app=sgtm-<amb>-identidad
kubectl -n sgtm-<amb> logs -l app=sgtm-<amb>-identidad --previous
```

Las causas más probables con un solo nodo, en orden: presión de recursos (ir a
[Mantenimiento del VPS](mantenimiento-del-vps.md) §diagnóstico), o su base de datos
—`30-base-de-keycloak.sh` no corrió y la base propia no existe—:

```bash
kubectl -n sgtm-<amb> exec deployment/sgtm-<amb>-postgres -c postgres -- \
  psql -U postgres -c "\l" | grep keycloak
```

Si no aparece, el `Job` de inicialización de la base de Keycloak no se completó —
reaplicar el manifiesto correspondiente del stack (`pulumi up`, o el `ConfigMap`
específico si el resto del clúster está sano).

### 2. El realm quedó inconsistente

El realm se reconcilia con un `Job` —no un guion que se corre a mano contra Keycloak—,
generado por [`Identidad.ts`](../../../infra/componentes/Identidad.ts) desde
[`despliegue/identidad/realm-sgtm.json`](../../../despliegue/identidad/realm-sgtm.json),
versionado y nunca editado a mano en la consola. Su nombre lleva una huella del contenido
que aplica (`sgtm-<amb>-realm-<huella>`), así que si el realm en el repositorio **no**
cambió, el Job ya existe y `pulumi up` no lo vuelve a correr — que es exactamente el
problema cuando la deriva fue manual, contra la consola, y no contra el archivo. Forzar
la reconciliación es borrar ese Job y reaplicarlo:

```bash
kubectl -n sgtm-<amb> get jobs -l componente=identidad
kubectl -n sgtm-<amb> delete job sgtm-<amb>-realm-<huella>
cd infra && yarn manifiestos --ambiente <amb> --componente identidad | kubectl apply -f -
kubectl -n sgtm-<amb> wait --for=condition=complete job/sgtm-<amb>-realm-<huella> --timeout=300s
```

El Job reintenta durante cinco minutos si Keycloak todavía no acepta la sesión de
administración (`reconciliar-realm.sh`, comentario de cabecera), y **se niega en rojo**
si el mapeador de `municipalidad_id` no queda puesto al terminar — es la comprobación 5
del propio guion, no algo que este runbook tenga que verificar aparte.

**Nunca** corregir el realm a mano en la consola de administración — la próxima
reconciliación (o el próximo `pulumi up`) lo revertiría sin avisar, y es exactamente el
tipo de deriva que `ADR-0011` §6 ya advierte para `kubectl apply` manual.

## Cómo se comprueba que terminó bien

**No** «Keycloak responde en `/health`». La comprobación tiene que llegar hasta donde el
síntoma importaba — alguien nuevo pudiendo entrar y llegar a sus datos:

1. **Un token nuevo se emite y valida contra el emisor correcto**, la escalera completa
   de `despliegue/README.md`:

   ```bash
   # obtener un token nuevo del realm
   curl -s -X POST https://<dominio>/keycloak/realms/sgtm/protocol/openid-connect/token \
     -d grant_type=password -d client_id=sgtm-backoffice \
     -d username=<usuario> -d password=<clave> | jq -r .access_token
   ```

2. **Ese token, contra la API, llega hasta filas filtradas por RLS** — no solo un `200`:

   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://<dominio>/api/v1/cuentacorriente/deuda/<contribuyente-conocido>
   # tiene que devolver la deuda de la municipalidad del usuario, con su fecha —
   # confirma que el claim de municipalidad_id sigue llegando desde el token
   ```

3. **Una sesión que ya estaba abierta durante la falla siguió funcionando** — es la
   propiedad que justifica que este runbook no sea una emergencia de indisponibilidad
   total: confirmarla con quien reportó el síntoma, no solo asumirla.

## Si no sale bien

| Síntoma | Qué hacer |
|---|---|
| El pod vuelve pero el paso 1 de la comprobación falla con `iss` inválido | El emisor público (`issuer-uri`) no coincide con el dominio que el navegador usa. Revisar `SGTM_OIDC_EMISOR` de la aplicación contra `sgtm:domain` del stack |
| La comprobación 2 devuelve `403 SIN_MUNICIPALIDAD` | El mapeador `municipalidad-id` no está en el realm reconciliado — repetir §2 |
| El pod reinicia en bucle tras reconciliar el realm | El `realm-sgtm.json` del repositorio no es el que se está aplicando — confirmar que `reconciliar-realm.sh` apunta al archivo correcto y no a una copia vieja |
| Nadie con sesión activa sigue funcionando | El síntoma no es «Keycloak no responde», es algo que invalidó los tokens ya emitidos (rotación de la clave de firma, por ejemplo). Es un incidente distinto — no seguir con este runbook, escalar |

## Estado del ensayo

**Verificado en CI:** que la aplicación arranca y sirve `/actuator/health` sin esperar a
Keycloak (`despliegue/README.md`, paso 3 del orden de arranque), y la cadena completa
—token firmado → `SeguridadWeb` → claim → `SET LOCAL` → filas que RLS deja ver— contra un
emisor OIDC real (`CadenaDeIdentidadTest`, 11 pruebas).

**No ensayado:** el escenario de este runbook en sí —Keycloak cayendo con sesiones **ya
activas** contra un clúster real, y confirmando que esas sesiones sobreviven mientras el
pod se repone—. Requiere un clúster real con tráfico en curso.

## Documentos relacionados

[`ADR-0005`](../../30-arquitectura/adr/ADR-0005-identidad-y-acceso.md) ·
[`despliegue/README.md`](../../../despliegue/README.md) §«La identidad» ·
[`infra/componentes/identidad/reconciliar-realm.sh`](../../../infra/componentes/identidad/reconciliar-realm.sh) ·
[Mantenimiento del VPS](mantenimiento-del-vps.md)
