# Identidad

## Por qué el realm está aquí y no configurado a mano

Un realm ajustado en la pantalla de administración no es reproducible: el día que
haya que levantar la instalación otra vez, nadie recordará qué casillas estaban
marcadas. [`realm-sgtm.json`](realm-sgtm.json) se importa al arrancar Keycloak y
fija tres cosas:

- **El atributo `municipalidad_id` del perfil de usuario, y el mapeador que lo
  pone en el token.** Es el claim de ADR-0005, del que sale el `SET LOCAL` y con
  él la separación entre municipalidades. Asignar a alguien a otra municipalidad
  es cambiar ese atributo, no tocar código.

  Declararlo en el perfil no es trámite. Dos motivos, y el segundo importa más:

  1. **Keycloak descarta en silencio los atributos que el perfil no declara.** El
     usuario se crea sin protestar, `kcadm` no dice nada, y el token sale sin el
     claim. Lo diagnosticó la escalera del despliegue: el último peldaño devolvió
     `SIN_MUNICIPALIDAD` donde esperaba `SIN_PRIVILEGIO`, que es exactamente para
     lo que sirve comparar códigos del catálogo en vez de solo códigos HTTP.
  2. **`edit: [admin]`** impide que un usuario se cambie a sí mismo de
     municipalidad desde la pantalla de su cuenta. Con ese atributo se decide qué
     padrón ve: si fuera editable por su dueño, el aislamiento entre
     municipalidades se configuraría desde el navegador del contribuyente.
- **`sgtm-backoffice`**, el cliente público de la interfaz, con PKCE `S256`
  obligatorio y sin secreto: una aplicación de navegador no tiene dónde guardar
  uno.
- **`sgtm-verificacion`**, con `direct access grants`, que es como CI consigue un
  token sin abrir un navegador. No sirve para personas: no tiene redirección.

**El archivo no lleva comentarios**, y no por estilo: Keycloak analiza el realm
con `RealmRepresentation` y **rechaza cualquier campo que no conozca**, así que un
`_comentario` al principio hace que la importación falle y el contenedor no
arranque. La explicación vive en este README, que es donde se puede leer sin
romper nada.

## Ni un usuario, ni una clave

El realm fija la **estructura**; las personas las crea quien provisiona:

```bash
cd despliegue
./identidad/crear-usuario.sh jperez 'su-clave' 1
```

El tercer argumento es la municipalidad. Omitirlo crea un usuario **sin** el
claim, que sirve para una sola cosa: comprobar que un token válido pero sin
municipalidad recibe 403 y no llega a ningún controlador.

Un realm versionado que trae usuarios con contraseña es la forma más cómoda de
que esa contraseña acabe en producción. Por eso se separan, aunque cueste un paso
más al instalar.

## El emisor es una identidad, no una dirección de red

Es lo que más cuesta si se descubre por las malas. El navegador llega a Keycloak
por su nombre público —`http://localhost:8180` en la marcha blanca, un nombre con
TLS en una instalación real— y el backend lo alcanza por el nombre interno de la
red del compose, `identidad:8080`.

Por eso son dos ajustes distintos y no uno:

| Ajuste | Valor | Para qué |
|---|---|---|
| `issuer-uri` | el **público** | Se compara con el `iss` del token. Es lo que hace que un token de otro realm no valga |
| `jwk-set-uri` | el **interno** | De dónde se traen las claves para verificar la firma |

Con el público para las dos cosas, el backend pediría el JWKS a una dirección que
dentro de su contenedor es él mismo, y **todo** token sería inválido por un motivo
que no se parece en nada a su causa.

## Lo que esto no es

`start-dev`, sin TLS y con la base de Keycloak dentro del propio contenedor. Es lo
correcto para una marcha blanca detrás de un proxy y lo incorrecto para
producción, donde va `start` con su base y sus certificados. Una instalación real
además no usaría este realm: usaría el directorio de la municipalidad.
