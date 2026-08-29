import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES } from '../../catalogo';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * **El censo de capacidades de Rentas · Registro: la red que impide perder una.**
 *
 * Existe por una propiedad del renderizador que no se ve desde ningun sitio: en
 * cuanto una opcion entra en `COMPONENTES_PROPIOS` de `Pantalla.tsx`, **deja de
 * pasar por el camino generico**. Y con el se van, sin un solo error, sus
 * filtros, su tabla, sus secciones, su barra y su franja: todo lo que el
 * componente nuevo no vuelva a dibujar a mano.
 *
 * Es el defecto que #363 documento para las conexiones —«la tabla sale vacia,
 * en silencio, sin ningun error que lo diga»— llevado a la estructura entera de
 * la pantalla. Y es exactamente el riesgo que corren las tres superficies de
 * #442, que pliegan nueve de las quince opciones de este modulo en tres
 * componentes propios.
 *
 * Asi que esta prueba **monta las quince** y compara lo que sale en pantalla
 * contra la tabla de abajo, que es lo que dibujaban el dia que se midio. No lee
 * el catalogo ni la composicion: una funcion pura no ve lo que un componente
 * deja de pintar.
 *
 * **La tabla es literal a proposito.** Los rotulos van letra por letra —incluidos
 * los botones que cada seccion lleva dentro, que es como se leen concatenados al
 * titulo— porque un censo que se calcula con la misma formula que el codigo que
 * vigila no vigila nada: se movera con el. Si un cambio es deliberado, se mueve
 * **aqui**, y entonces se ve en el diff cual de las quince perdio que.
 *
 * Lo que la tabla NO fija, y por que: la cifra de cada celda. Eso ya lo miran
 * las pruebas de cada pantalla, y meterlo aqui haria que el censo se pusiera
 * rojo cada vez que el juego de datos simulado cambia un importe.
 */

interface Capacidades {
  readonly id: string;
  /** Los rotulos del bloque de busqueda, en su orden. */
  readonly filtros: readonly string[];
  /** Las cabeceras de seccion, con los botones que cada una lleva dentro. */
  readonly secciones: readonly string[];
  /** Las cabeceras de la tabla. Vacio cuando la pantalla no dibuja ninguna. */
  readonly columnas: readonly string[];
  /** La barra de acciones, tal como se dibuja (`accionesDeLaBarra`). */
  readonly acciones: readonly string[];
  /** El rotulo del boton navy de la barra, o `null` si no hay ninguno. */
  readonly primaria: string | null;
  /** La causa de la franja del acto, o `null` si esta pantalla no lleva. */
  readonly causa: string | null;
}

/**
 * Lo que cada pantalla necesita en la URL para dibujarse entera.
 *
 * Sin esto, seis de las quince se quedan en su aviso de «busca un
 * contribuyente» y el censo mediria el aviso en vez de la pantalla.
 */
const BUSQUEDA: Readonly<Record<string, string>> = {
  predial_individual: '?codContribuyente=00000025673&ano=2026',
  predios_rentas: '?codContribuyente=00000025673',
  baja_deuda: '?codContribuyente=00000006550',
  beneficios: '?contribuyente=00000025673',
  declaracion_jurada: '?codContribuyente=00000025673&ano=2026',
  vehicular_calculo: '?placa=V1H-882&codContribuyente=00000003541&ejercicio=2026',
};

const CENSO: readonly Capacidades[] = [
  {
    id: 'contribuyentes',
    filtros: [
        'Código',
        'Nombre / razón social',
        'D.N.I.',
        'R.U.C.',
      ],
    secciones: [
        'Identificación',
        'Domicilio fiscal',
        'Edificación',
        'Zona - Sector - Etapa',
        'Documentos del contribuyenteNuevo · Agregar · Editar doc. · Quitar',
        'Contactos registradosNuevo · Agregar · Editar · Quitar',
        'Gestores del contribuyenteNuevo · Agregar · Editar · Quitar',
        'TeléfonosNuevo · Agregar · Editar · Quitar',
        'E-MailNuevo · Agregar · Editar · Quitar',
        'Observaciones del registroNueva obs. · Agregar',
        'Foto álbum personalCapturar · Cargar · Guardar · Quitar',
        'Unidades afectas del contribuyenteSolo lectura',
      ],
    columnas: [
        'Est.',
        'Código',
        'Nombre / razón social',
        'D.N.I.',
        'R.U.C.',
        'Dirección',
        'Predios',
        'Deuda S/',
      ],
    acciones: [
        'Nuevo',
        'Modificar',
        'Imprimir',
        'Guardar',
      ],
    primaria: 'Guardar',
    causa: 'sin-backend',
  },
  {
    id: 'predios_rentas',
    filtros: [
        'Cod. Contribuyente',
        'Código predial',
        'Sector',
        'Condición',
      ],
    secciones: [
        'Datos del predio',
        'Valuación',
      ],
    columnas: [
        'Código predial',
        'Ubicación',
        'Uso',
        'Terreno m²',
        'Const. m²',
        '% prop.',
        'Autovalúo S/',
        'Condición',
      ],
    acciones: [
        'Nuevo',
        'Guardar',
        'Ver ficha catastral',
      ],
    primaria: 'Ver ficha catastral',
    causa: null,
  },
  {
    id: 'predial_individual',
    filtros: [
        'Cod. Contribuyente',
        'Año',
        'DJ N°',
        'Tipo de declaración',
        'Fecha de declaración',
      ],
    secciones: [
        'Escala progresiva acumulativa',
        'Beneficios aplicadosOpcional',
        'Emisión y cuotas',
      ],
    columnas: [],
    acciones: [
        'Buscar',
        'Simular',
        'Calcular',
      ],
    primaria: 'Calcular',
    causa: 'sin-determinacion',
  },
  {
    id: 'predial_masivo',
    filtros: [],
    secciones: [
        'Parámetros del proceso',
      ],
    columnas: [],
    acciones: [
        'Simular',
        'Ver observados',
        'Ejecutar proceso',
      ],
    primaria: 'Ejecutar proceso',
    // Desde #445 declara su escritura, asi que ya no hay franja que explicar:
    // «Ejecutar proceso» asienta la determinacion de verdad.
    causa: null,
  },
  {
    id: 'declaracion_jurada',
    filtros: [
        'DJ N°',
        'Cod. Contribuyente',
        'Año',
        'Tipo',
      ],
    secciones: [
        'Formularios a emitir',
      ],
    columnas: [],
    acciones: [
        'Vista previa',
        'Imprimir HR / PU / PR',
      ],
    primaria: 'Imprimir HR / PU / PR',
    causa: null,
  },
  {
    id: 'arbitrios',
    filtros: [
        'Ejercicio',
        'Código predial',
        'Zona',
        'Uso',
      ],
    secciones: [],
    columnas: [
        'Servicio',
        'Criterio de distribución',
        'Frecuencia',
        'Tasa mensual S/',
        'Anual S/',
        'Condición',
      ],
    acciones: [
        'Recalcular',
        'Emitir cuponera de arbitrios',
      ],
    primaria: 'Emitir cuponera de arbitrios',
    causa: 'sin-backend',
  },
  {
    id: 'transferencia_predio',
    filtros: [],
    secciones: [
        'Datos del acto',
        'Partes intervinientes',
      ],
    columnas: [],
    acciones: [
        'Validar deuda del transferente',
        'Registrar transferencia',
      ],
    primaria: 'Registrar transferencia',
    causa: null,
  },
  {
    id: 'alcabala',
    filtros: [],
    secciones: [
        'Liquidación',
      ],
    columnas: [],
    acciones: [
        'Liquidar',
        'Generar orden de pago',
        'Imprimir liquidación',
      ],
    primaria: 'Imprimir liquidación',
    causa: 'sin-campo',
  },
  {
    id: 'vehiculos',
    filtros: [
        'Cod. Contribuyente',
        'Nombre',
        'Nro. Documento',
        'Placa',
        'Nro. Motor',
      ],
    secciones: [
        'Identificación',
        'Características técnicasOpcional',
        'Titular del vehículo',
        'Conductor habitualOpcional',
        'Impuesto al patrimonio vehicular',
        'Inafectación y exoneraciónOpcional',
        'NotasOpcional',
      ],
    columnas: [],
    acciones: [
        'Nuevo',
        'Modificar',
        'Excel',
        'Imprimir',
        'Guardar',
      ],
    primaria: 'Guardar',
    causa: 'sin-backend',
  },
  {
    id: 'vehicular_calculo',
    filtros: [
        'Placa',
        'Cod. Contribuyente',
        'Ejercicio',
      ],
    secciones: [],
    columnas: [],
    acciones: [
        'Simular',
        'Calcular',
        'Emitir cuponera',
      ],
    primaria: 'Emitir cuponera',
    causa: 'sin-declaracion',
  },
  {
    id: 'transferencia_vehiculo',
    filtros: [],
    secciones: [
        'Datos de la transferencia',
        'Partes',
      ],
    columnas: [],
    acciones: [
        'Validar deuda',
        'Registrar transferencia',
      ],
    primaria: 'Registrar transferencia',
    causa: null,
  },
  {
    id: 'espectaculos',
    filtros: [
        'Nº de expediente',
        'Organizador',
        'Desde',
        'Hasta',
      ],
    secciones: [
        'Declaración del espectáculo',
      ],
    columnas: [],
    acciones: [
        'Liquidar',
        'Registrar',
        'Imprimir liquidación',
      ],
    primaria: 'Imprimir liquidación',
    causa: 'sin-campo',
  },
  {
    id: 'beneficios',
    filtros: [
        'Contribuyente',
        'Tipo',
        'Estado',
      ],
    secciones: [
        'Solicitud de beneficio',
      ],
    columnas: [
        'Expediente',
        'Contribuyente',
        'Tipo',
        'Resolución',
        'Vigencia',
        'Deducción',
        'Estado',
      ],
    acciones: [
        'Registrar',
        'Denegar',
        'Aprobar',
      ],
    primaria: 'Aprobar',
    causa: 'sin-backend',
  },
  {
    id: 'alta_deuda',
    filtros: [],
    secciones: [
        'Deuda a dar de alta',
      ],
    columnas: [],
    acciones: [
        'Validar',
        'Dar de alta',
      ],
    primaria: 'Dar de alta',
    causa: null,
  },
  {
    id: 'baja_deuda',
    filtros: [
        'Cod. Contribuyente',
        'Año',
        'Tributo',
      ],
    secciones: [
        'Sustento de la baja',
      ],
    columnas: [
        'Elegir',
        'Año',
        'Unidad',
        'Cuota',
        'Tributo',
        'Insoluto S/',
        'Interés S/',
        'Total S/',
      ],
    acciones: [
        'Previsualizar',
        'Dar de baja (0)',
      ],
    primaria: 'Dar de baja (0)',
    causa: null,
  },];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

const textos = (selector: string): string[] =>
  [...document.querySelectorAll<HTMLElement>(selector)].map((n) => (n.textContent ?? '').trim());

/** Lo que la pantalla montada esta dibujando ahora mismo. */
function loQueDibuja(): Omit<Capacidades, 'id'> {
  const franja = document.querySelector<HTMLElement>('.sgtm-acciones__motivo');
  return {
    filtros: textos('.sgtm-filtros__rejilla .sgtm-campo__etiqueta'),
    secciones: textos('.sgtm-seccion__cabecera'),
    columnas: textos('.sgtm-tabla thead th').filter((t) => t !== ''),
    acciones: textos('.sgtm-acciones button'),
    primaria: document.querySelector('.sgtm-acciones .sgtm-boton--primario')?.textContent?.trim() ?? null,
    causa: franja?.getAttribute('data-causa') ?? null,
  };
}

describe('el censo de capacidades de Rentas · Registro', () => {
  it('cubre las quince opciones del modulo, sin sobrar ninguna', () => {
    const delCatalogo = OPCIONES.filter((o) => o.modulo.id === 'rentas-registro').map((o) => o.id);
    expect([...CENSO].map((c) => c.id).sort()).toEqual([...delCatalogo].sort());
  });

  it.each(CENSO.map((c) => ({ id: c.id, esperado: c })))(
    '$id sigue dibujando lo que dibujaba',
    async ({ id, esperado }) => {
      const opcion = OPCIONES.find((o) => o.id === id);
      expect(opcion, `«${id}» ya no esta en el catalogo`).toBeDefined();
      montarEnRuta((opcion?.ruta ?? '') + (BUSQUEDA[id] ?? ''));
      await waitFor(() => expect(document.querySelector('.sgtm-esqueleto')).toBeNull());

      const { id: _sinId, ...sinIdEsperado } = esperado;
      expect(loQueDibuja()).toEqual(sinIdEsperado);
    },
  );
});
