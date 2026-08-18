package pe.gob.sgtm.parametros;

import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Vigencia;

/**
 * Una regla del calculo: {@code RT-001}, {@code RT-002}…
 *
 * <h2>Es una funcion pura, y el contrato lo obliga</h2>
 *
 * <p>Entra una {@link EntradaDeCalculo} y sale un {@link Dinero}. No hay forma de consultar la
 * base, de leer el reloj ni de mirar una configuracion global, porque nada de eso esta en la firma.
 * Es lo que hace que recalcular el ejercicio 2027 en 2037 de el mismo centimo (regla 6, verificada
 * ademas por ArchUnit sobre el paquete {@code ..dominio..}).
 *
 * <h2>Una implementacion que ya se uso en una emision no se modifica</h2>
 *
 * <p>Se crea otra, con su propio rango de vigencia. Si se editara, un recalculo de un ejercicio
 * pasado daria una cifra distinta de la que se notifico, y la municipalidad no podria explicar la
 * diferencia. {@link CatalogoDeReglas} lo impone rechazando dos implementaciones de la misma regla
 * con vigencias que se solapan: no hay forma de «corregir» una version, solo de sucederla.
 */
public interface ReglaTributaria {

    IdentificadorDeRegla identificador();

    /** Entre que fechas rige <b>esta implementacion</b>. Sucederla es abrir otra a continuacion. */
    Vigencia vigencia();

    /** Que hace, en una linea, para que la pantalla de auditoria del calculo lo pueda mostrar. */
    String descripcion();

    Dinero aplicar(EntradaDeCalculo entrada);
}
