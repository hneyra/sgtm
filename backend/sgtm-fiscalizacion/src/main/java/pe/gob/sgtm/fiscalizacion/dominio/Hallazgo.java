package pe.gob.sgtm.fiscalizacion.dominio;

/**
 * Lo que el fiscalizador encontró en campo, contrastado contra lo declarado.
 *
 * <h2>Cuatro, y no los cinco de {@link CondicionFiscalizada}</h2>
 *
 * <p>Los dos vocabularios se parecen y no son el mismo: esto es lo que una <b>persona anota</b> en
 * el acta, y {@link CondicionFiscalizada} es lo que el sistema <b>deriva</b> comparando los dos
 * lados ({@link ComparacionHalladoDeclarado}). La diferencia es {@code USO_DISTINTO}, y no está
 * aquí porque <b>el acta no tiene dónde consignar el uso observado</b>: {@code acta_fiscalizacion}
 * (V4, V24) guarda {@code area_hallada} y ninguna columna de uso, y {@code
 * LiquidarFiscalizacion.liquidar} recibe el {@code usoHallado} como argumento suyo —lo teclea quien
 * liquida, no quien visitó—. Añadirlo al enumerado sin esa columna daría un acta que afirma un
 * hallazgo que no puede sustentar.
 *
 * <h2>El desplegable del manual ofrece seis, y ninguno es ninguno de estos (#546)</h2>
 *
 * <p>«Hallazgo principal» dibuja SIN OBSERVACIONES, AMPLIACIÓN NO DECLARADA, USO DISTINTO AL
 * DECLARADO, OMISO A LA DECLARACIÓN, PREDIO SUBVALUADO y PREDIO INEXISTENTE: <b>cero de seis</b>
 * coinciden letra por letra con los cuatro de aquí. <b>Ninguno se traduce</b>, que es el criterio
 * de #427 al negarse a leer «ACTIVA» como {@code VIGENTE} y el de #431 al no mapear los cuatro de
 * este mismo desplegable. Y aquí pesa más que en un filtro: {@code hallazgo} es <b>opcional</b> en
 * el cuerpo del acta, así que una palabra que el enumerado no reconoce no deja una lista vacía sino
 * un acta registrada <b>sin hallazgo</b> —una inspección sin conclusión, que en la vehicular {@code
 * LiquidarFiscalizacion} rechaza hoy con {@code ActaSinHallazgo} y hasta #481 leía como {@code
 * CONFORME}—.
 *
 * <p>La decisión, valor a valor, y de qué lado se arregla cada uno:
 *
 * <ul>
 *   <li><b>SIN OBSERVACIONES → el desplegable lo pierde.</b> Es {@link #CONFORME} con otras
 *       palabras; el enumerado no gana nada.
 *   <li><b>AMPLIACIÓN NO DECLARADA → el desplegable lo pierde.</b> Una ampliación no declarada es
 *       declarar de menos, o sea {@link #SUBVALUADOR}. Es una <i>causa</i> del hallazgo, y la causa
 *       va en {@code detalle}, que es texto libre y está para eso.
 *   <li><b>OMISO A LA DECLARACIÓN → el desplegable lo pierde.</b> Es {@link #OMISO}.
 *   <li><b>PREDIO SUBVALUADO → el desplegable lo pierde.</b> Es {@link #SUBVALUADOR}.
 *   <li><b>PREDIO INEXISTENTE → el desplegable lo pierde.</b> Cae en {@link #NO_UBICADO}, que es
 *       «no se pudo verificar». Y conviene que caiga ahí y no en un valor propio: afirmar que un
 *       predio <i>no existe</i> desde una visita es una conclusión que el acta no puede sostener
 *       —lo que consta es que no se ubicó—, y darle valor propio invitaría a darlo de baja del
 *       padrón con eso como único sustento.
 *   <li><b>USO DISTINTO AL DECLARADO → ni una cosa ni la otra todavía.</b> Es el único de los seis
 *       que nombra algo que el enumerado no sabe decir, y su arreglo <b>no es de vocabulario</b>:
 *       el enumerado sólo puede ganarlo cuando el acta tenga dónde guardar el uso observado —una
 *       columna {@code uso_hallado} en {@code acta_fiscalizacion} y su campo en el cuerpo del
 *       {@code POST}—. Mientras tanto, el uso lo consigna quien liquida y el acta lo cuenta en
 *       {@code detalle}. Es trabajo de otro issue, y hasta entonces el desplegable no lo ofrece:
 *       ofrecerlo sería registrar actas sin hallazgo.
 * </ul>
 *
 * <p>El contrato publica estos cuatro valores como {@code enum} del parámetro {@code hallazgo} de
 * {@code POST /fiscalizacion/vehicular} (tabla {@code VOCABULARIOS} del generador), y {@code
 * ParametrosDeLaConsultaTest} compara ese texto contra {@link #values()}: el vocabulario deja de
 * poder divergir en silencio.
 */
public enum Hallazgo {

    /** Lo declarado coincide con lo hallado. «SIN OBSERVACIONES» del desplegable. */
    CONFORME,

    /** No hay declaración presentada para el ejercicio. «OMISO A LA DECLARACIÓN». */
    OMISO,

    /** Declaró de menos. «PREDIO SUBVALUADO» y «AMPLIACIÓN NO DECLARADA». */
    SUBVALUADOR,

    /** No se pudo verificar: no se ubicó o no se permitió el acceso. «PREDIO INEXISTENTE». */
    NO_UBICADO
}
