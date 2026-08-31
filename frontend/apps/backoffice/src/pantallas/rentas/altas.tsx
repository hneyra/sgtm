import { Aviso } from '@sgtm/design-system';
import type { AltaEnPanelProps } from '../composicion';
import { CampoDeAlta, FormularioDeAlta, useAlta } from '../bloques/FormularioDeAlta';

/**
 * **El alta de un contribuyente** (#503 F7, `POST /rentas/contribuyentes`).
 *
 * Es el acto con el que se empieza a trabajar en Rentas —lo que el rediseño pone
 * como accion primaria del modulo— y hasta hoy no existia: el «Nuevo» de la
 * barra estaba dibujado y muerto, y desde #442 ni siquiera se dibujaba, porque
 * `VOCABULARIO_UNIFORME` retira las acciones que no pueden hacer lo que
 * prometen. Declarar este formulario es lo que lo devuelve.
 *
 * **Seis campos y no cincuenta y seis**, y eso no es un recorte de la ficha: el
 * `POST` acepta ocho campos —`ContribuyenteController.PeticionDeContribuyente`—
 * y el resto del expediente se escribe por sus **propias** operaciones (`PUT
 * /contribuyentes/{id}`, `POST .../domicilios`, `.../contactos`,
 * `.../responsables`). Dar de alta es crear la fila; completarla es abrirla, y
 * eso se dice en el panel en vez de dejar que quien atiende lo descubra al no
 * encontrar el domicilio.
 *
 * Los rotulos de este panel **no son los del manual y no tienen por que serlo**
 * (RNF-080 protege los del catalogo): este formulario no es la seccion
 * «Identificación» de la ficha, igual que `AltaDeSector` no es la pantalla de
 * sectores. Lo que si sale del vocabulario del manual son las opciones de «Tipo
 * de persona», traducidas al enumerado en `escrituras.ts`.
 */

/** Los seis tipos de documento, tal como los enumera `TipoDocumento` en el backend. */
const TIPOS_DE_DOCUMENTO = ['DNI', 'RUC', 'CE', 'PASAPORTE', 'PARTIDA', 'OTRO'];

/** Las cuatro del manual. La traduccion al enumerado vive en `escrituras.ts`. */
const TIPOS_DE_PERSONA = ['NATURAL', 'JURÍDICA', 'SUCESIÓN INDIVISA', 'SOCIEDAD CONYUGAL'];

/** Las tres que `CondicionEspecial` declara. Opcional: la mayoria no tiene ninguna. */
const CONDICIONES = ['PENSIONISTA', 'ADULTO_MAYOR', 'DISCAPACIDAD'];

export function AltaDeContribuyente({ onCerrar }: AltaEnPanelProps) {
  const escritura = useAlta('registrar_contribuyente', {}, (borrador) =>
    vacio(borrador['codigo'])
      ? 'Falta el código del contribuyente: es el que enlaza sus predios, sus vehículos y su cuenta corriente.'
      : vacio(borrador['tipoDocumento'])
        ? 'Falta el tipo de documento: se elige del catálogo, no se teclea.'
        : vacio(borrador['numeroDocumento'])
          ? 'Falta el número de documento.'
          : vacio(borrador['tipoPersona'])
            ? 'Falta el tipo de persona.'
            : vacio(borrador['nombreRazonSocial'])
              ? 'Falta el nombre o la razón social.'
              : undefined,
  );

  return (
    <FormularioDeAlta escritura={escritura} accion="Registrar contribuyente" onCerrar={onCerrar}>
      {/* El codigo lo teclea quien atiende y no lo asigna el servidor: es el que
          enlaza predios, vehiculos, licencias, papeletas y cuenta corriente, y
          `PeticionDeContribuyente` lo exige. */}
      <CampoDeAlta
        escritura={escritura}
        campo="codigo"
        etiqueta="Código del contribuyente"
        ph="00000025673"
      />
      {/* El tipo es un enum y no texto libre por lo mismo que el de via: con
          texto libre el mismo documento entra como DNI, D.N.I. y Dni. */}
      <CampoDeAlta
        escritura={escritura}
        campo="tipoDocumento"
        etiqueta="Tipo de documento"
        tipo="sel"
        opciones={TIPOS_DE_DOCUMENTO}
      />
      <CampoDeAlta
        escritura={escritura}
        campo="numeroDocumento"
        etiqueta="Número de documento"
        ph="03593174"
      />
      <CampoDeAlta
        escritura={escritura}
        campo="tipoPersona"
        etiqueta="Tipo de persona"
        tipo="sel"
        opciones={TIPOS_DE_PERSONA}
      />
      {/* Un solo campo para el nombre, y el manual dibuja cuatro —apellido
          paterno, materno, nombres y razon social—. El que manda es el backend:
          `nombreRazonSocial` es **uno**, y partirlo aqui obligaria a decidir con
          que separador se recompone, que es inventar un dato. */}
      <CampoDeAlta
        escritura={escritura}
        campo="nombreRazonSocial"
        etiqueta="Nombre o razón social"
        ph="MEDINA MEDINA, RUFINA"
      />
      <CampoDeAlta
        escritura={escritura}
        campo="condicionEspecial"
        etiqueta="Condición especial"
        tipo="sel"
        opciones={CONDICIONES}
      />

      {/* Se dice antes de teclear, no despues de guardar. */}
      <Aviso
        titulo="Aquí se crea la fila, no el expediente entero"
        detalle="El domicilio fiscal, los contactos, los gestores y los beneficios se registran después, desde el expediente del contribuyente. Cada uno tiene su propio acto y su propia observación."
      />
    </FormularioDeAlta>
  );
}

const vacio = (valor: string | undefined): boolean => valor === undefined || valor.trim() === '';
