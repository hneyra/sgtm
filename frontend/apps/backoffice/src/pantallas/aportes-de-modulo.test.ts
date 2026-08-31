import { describe, expect, it } from 'vitest';
import { OPERACIONES } from '@sgtm/api-client';
import { MODULOS, opcionPorId } from '../catalogo';
import {
  MODULOS_CON_APORTE,
  aporteDelModulo,
  cargarConexionesDeLaOpcion,
  cargarTodosLosAportes,
} from './aportes-de-modulo';
import { conexionDe, opcionesConectadas } from './conexiones';

/**
 * **Lo que cada modulo aporta llega con su trozo, y eso no puede fallar
 * callando** (#433).
 *
 * Desde este issue las conexiones y las composiciones no viajan en el arranque:
 * se registran al entrar en el modulo. El defecto que eso podria introducir no
 * es ruidoso —es el de #363—: una opcion sin registrar no revienta, cae al
 * camino comun de las 134, recibe la forma que no es y dibuja **una tabla vacia
 * sin un solo error**. Tres cosas lo impiden, y las tres se comprueban aqui:
 *
 *   1. los doce modulos del catalogo tienen cargador, ni uno mas ni uno menos;
 *   2. lo que un cargador entrega es de **su** modulo segun el catalogo;
 *   3. pedir el aporte de un modulo que no existe **falla nombrandolo**, en vez
 *      de devolver un registro vacio que se confundiria con «no conectada».
 *
 * Lo que estas tres no cubren —que `Pantalla` de verdad espere al cargador— lo
 * cubren las pruebas de cada modulo, que montan sus pantallas conectadas y
 * comparan celda por celda: sin la espera, ninguna de ellas encuentra su tabla.
 */
describe('el aporte de cada modulo', () => {
  it('los doce modulos del catalogo declaran cargador, y ninguno mas', () => {
    expect([...MODULOS_CON_APORTE].sort()).toEqual([...MODULOS.map((m) => m.id)].sort());
  });

  /**
   * **Y desde #524 una clave puede no ser una opcion**, con una condicion: que sea
   * una operacion del contrato **que este modulo sirve**.
   *
   * El caso es `vehiculos_del_contribuyente`. Es una lectura que ninguna pantalla
   * del manual dibuja —la coleccion de vehiculos de una persona—, y existe para
   * que el expediente del contribuyente la tome prestada bajo el permiso de
   * «Ficha de vehiculo». Inventarle una opcion del catalogo para poder
   * registrarla seria estrenar una pantalla que no existe, que es justo lo que
   * ADR-0014 §5 impide.
   *
   * Lo que la guarda sigue impidiendo, que es lo que vino a impedir: que un
   * modulo registre la conexion de **otro**. Una clave que no sea ni opcion suya
   * ni operacion del contrato se sigue poniendo roja.
   */
  it.each(MODULOS.map((modulo) => modulo.id))(
    'lo que aporta «%s» son opciones de ese modulo, o operaciones que sirve',
    async (moduloId) => {
      const aporte = await aporteDelModulo(moduloId);
      const suyas = [
        ...Object.keys(aporte.conexiones),
        ...Object.keys(aporte.adaptaciones ?? {}),
        ...Object.keys(aporte.composiciones ?? {}),
      ];
      for (const opcion of suyas) {
        if (opcionPorId(opcion) === undefined) {
          expect(
            Object.hasOwn(OPERACIONES, opcion),
            `«${opcion}» no es opcion de «${moduloId}» ni operacion del contrato`,
          ).toBe(true);
          continue;
        }
        expect(opcionPorId(opcion)?.modulo.id, `«${opcion}» no es de «${moduloId}»`).toBe(moduloId);
      }
    },
  );

  it('un modulo sin cargador falla nombrandolo, no devuelve un registro vacio', async () => {
    await expect(cargarConexionesDeLaOpcion('esta_opcion_no_existe')).rejects.toThrow(
      /no esta en el catalogo/,
    );
  });

  it('la opcion de una pestana de la ficha 360° registra su modulo al pedirla', async () => {
    /* La ficha vive en `/atencion/:codigo`, fuera de todo modulo, y compone
       opciones de cuatro. Es el unico sitio del sistema que necesita la conexion
       de una opcion sin haber entrado en su modulo, y por eso `FichaDeAtencion`
       llama a `cargarConexionesDeLaOpcion` antes de preguntar por ella. */
    await cargarConexionesDeLaOpcion('coactiva_expedientes');
    expect(conexionDe('coactiva_expedientes')).toBeDefined();
  });

  it('cargados los doce, el censo de conectadas cubre los modulos con conexion', async () => {
    await cargarTodosLosAportes();
    const conectadas = opcionesConectadas();
    /* Una por modulo con conexion, para que quitar un cargador se vea aqui y no
       solo en las pruebas de ese modulo. `inicio` entra: su unico aporte es el
       panel de recaudacion, y dejarlo fuera «por ser uno» lo habria convertido en
       el unico adaptador que sigue viajando en el arranque. */
    for (const opcion of [
      'inicio',
      'consulta_fichas',
      'contribuyentes',
      'fisc_omisos',
      'papeletas',
      'adm_estado_cuenta',
      'caja_tributaria',
      'consulta_deuda',
      'valores_busqueda',
      'coactiva_expedientes',
      'licencia_funcionamiento',
      'usuarios',
    ]) {
      expect(conectadas, opcion).toContain(opcion);
    }
  });
});
