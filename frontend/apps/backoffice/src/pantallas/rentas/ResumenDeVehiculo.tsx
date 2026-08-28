import { Esqueleto } from '@sgtm/design-system';
import type { ValorDeCampo } from '@sgtm/api-client';
import type { ResumenDePantallaProps } from '../composicion';
import { SIN_DATO } from '../seguridad/listado';

/**
 * La cabecera-resumen de la ficha de vehiculo (#330).
 *
 * Seis pestanas y 54 campos, de los que `VehiculoResource` llena ocho: sin esto,
 * saber que vehiculo se esta mirando exige leer la pestana 1 —y el titular, la
 * 2, que ademas sale vacia porque el recurso solo trae `contribuyenteId`—.
 *
 * **No pide nada nuevo**: los cinco datos salen de los campos que ya compone
 * `rentas/index.ts`. Los que el recurso no publica —titular, estado de
 * afectacion— salen con «—», que es lo que distingue «no llego» de «vale cero».
 */
export function ResumenDeVehiculo({ codigo, datos, cargando }: ResumenDePantallaProps) {
  if (codigo === undefined || codigo === '') return null;
  if (cargando) return <Esqueleto alto={92} />;

  const campos = datos?.campos ?? {};

  return (
    <section className="sgtm-resumen" aria-label="Resumen del vehículo">
      <div className="sgtm-resumen__identidad">
        <p className="sgtm-resumen__codigo">{texto(campos['placa2'], codigo)}</p>
        <p className="sgtm-resumen__vigencia">
          <span>
            {texto(campos['marca'])} {texto(campos['modelo'])} · {texto(campos['anoDeFabricacion'])}
          </span>
        </p>
      </div>
      <dl className="sgtm-resumen__datos">
        <Dato etiqueta="Categoría" valor={texto(campos['categoria'])} />
        <Dato etiqueta="Nro. de motor" valor={texto(campos['nroDeMotor'])} />
        <Dato etiqueta="Nro. de serie" valor={texto(campos['nroDeSerie'])} />
        {/* `VehiculoResource` trae `contribuyenteId`, que es un identificador
            interno: ensenarlo no dice de quien es el vehiculo, y cruzarlo con el
            padron seria unir dos respuestas y llamarlo dato. */}
        <Dato etiqueta="Titular" valor={SIN_DATO} />
      </dl>
      <p className="sgtm-resumen__pendiente">
        <strong>Deuda a hoy: {SIN_DATO}</strong> · el padrón no la publica todavía. El impuesto al
        patrimonio vehicular y su base imponible dependen de la tabla referencial del MEF, que es un
        valor normativo todavía sin cerrar.
      </p>
    </section>
  );
}

function Dato({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: string }) {
  return (
    <div className="sgtm-resumen__dato">
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

const texto = (valor: ValorDeCampo | undefined, porOmision = SIN_DATO): string =>
  typeof valor === 'string' && valor !== '' && valor !== SIN_DATO ? valor : porOmision;
