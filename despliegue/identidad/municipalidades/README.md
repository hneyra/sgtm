# Usuarios y grupos por municipalidad

> Los **funcionarios**. Su hermano para la otra población —los ciudadanos que esa municipalidad
> enroló en ventanilla, en el realm `sgtm-ciudadano`— es
> [`../ciudadanos/<ubigeo>.json`](../ciudadanos/README.md) (ADR-0020 §5).

Un archivo `<ubigeo>.json` por municipalidad. Es la **fuente versionada** de las personas y el
grupo de esa municipalidad en Keycloak, igual que [`../realm-sgtm.json`](../realm-sgtm.json) lo es
de la estructura del realm. Lo aplica [`../reconciliar-identidades.sh`](../reconciliar-identidades.sh)
—en el compose a mano, en el clúster desde un Job (ver
[`infra/componentes/Identidad.ts`](../../../infra/componentes/Identidad.ts))—.

**Ni una clave.** Un archivo versionado con contraseñas es la forma más cómoda de que una
contraseña acabe en producción (ADR-0012, ADR-0005). El usuario nuevo recibe un correo de Keycloak
con un enlace de un solo uso y **fija su clave en el primer acceso** (`UPDATE_PASSWORD`). Sin SMTP
configurado no llega el correo; el fallback está en [`../README.md`](../README.md).

## Forma

```json
{
  "ubigeo": "200101",
  "municipalidadId": 1,
  "grupo": "200101 - Municipalidad Provincial de Sullana",
  "usuarios": [
    { "cuenta": "jperez", "nombre": "Jorge", "apellido": "Perez",
      "correo": "jperez@sullana.gob.pe", "administrador": true }
  ]
}
```

| Campo | Qué es |
|---|---|
| `ubigeo` | Seis dígitos. Tiene que ser el mismo que el nombre del archivo y el que implanta `ImplantarMunicipalidad`. |
| `municipalidadId` | El **id numérico** que `ImplantarMunicipalidad` asignó a la fila de `municipalidad`. Sale de su log: `Municipalidad 200101 lista ... id 1`. Es lo que va al atributo `municipalidad_id` de cada usuario, de donde sale el claim (`::bigint` en RLS). La escalera de `despliegue.yml` cruza que coincida con la fila de la base y con el atributo en Keycloak. |
| `grupo` | Nombre del grupo de Keycloak (`/<grupo>`). Contenedor organizativo; lleva el atributo `municipalidad_id` de forma documental. **El claim sigue saliendo del atributo por usuario**, no del grupo. |
| `usuarios[].cuenta` | El `username` de Keycloak. **Tiene que ser el mismo `preferred_username`** con el que se crea la fila de `usuario` (ADR-0005). |
| `usuarios[].nombre` / `apellido` | `firstName` / `lastName`. Keycloak los exige para dar el perfil por completo; sin ellos el usuario existe y no puede entrar. Letras y espacios: nada de paréntesis (`person-name-prohibited-characters`). |
| `usuarios[].correo` | A esta dirección llega el enlace de `UPDATE_PASSWORD`. |
| `usuarios[].administrador` | `true` en **exactamente uno**. Es el que `ImplantarMunicipalidad` toma como primer administrador; `datos-de-implantacion.sh` lo deriva de aquí para que la cuenta no pueda divergir entre Keycloak y la fila de la base. |

## Idempotente

`reconciliar-identidades.sh` crea lo que falta y actualiza atributos, correo y nombre de lo que ya
existe. **Nunca borra**, y **nunca toca la clave ni las acciones pendientes de un usuario que ya
existía**: quitar a alguien de aquí no lo borra de Keycloak (se deshabilita a mano), y volver a
correr el guion no reenvía el correo de clave.
