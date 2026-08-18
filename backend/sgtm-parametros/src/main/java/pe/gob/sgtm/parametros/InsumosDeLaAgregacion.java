package pe.gob.sgtm.parametros;

import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.dominio.ValorNormativo;

/**
 * Lo que una {@link ReglaDeAgregacion} puede leer ademas de los aportes: ejercicio, parametros
 * sellados y politica de redondeo. Ni reloj ni base de datos, igual que una regla corriente.
 */
public record InsumosDeLaAgregacion(
        Ejercicio ejercicio, ParametrosSellados parametros, PoliticaDeRedondeo redondeo) {

    /** El parametro numerico que la regla necesita; si falta, no se produce importe. */
    public ValorNormativo numero(String tipo, String clave) {
        return parametros.exigirNumero(tipo, clave);
    }
}
