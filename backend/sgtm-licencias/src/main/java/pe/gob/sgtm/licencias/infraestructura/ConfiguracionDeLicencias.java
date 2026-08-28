package pe.gob.sgtm.licencias.infraestructura;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pe.gob.sgtm.licencias.dominio.PlantillaDeNumeroDeLicencia;

/**
 * El unico sitio que decide con que plantilla se numera una licencia.
 *
 * <p>{@code EmitirLicenciaDeFuncionamiento} recibe la plantilla por constructor —asi las pruebas
 * emiten con dos plantillas distintas, que es lo que delato el analisis del numero en #40—, y este
 * bean es quien la fija para la aplicacion real: {@link PlantillaDeNumeroDeLicencia#POR_OMISION}
 * mientras D-09 siga abierta. Cerrar la decision es cambiar este metodo (o leer la plantilla de la
 * municipalidad), no tocar el caso de uso.
 *
 * <p>La marcha blanca es la prueba de este cableado: sin el bean, la aplicacion real ni arranca
 * —las pruebas no lo detectan porque instancian el caso de uso a mano—.
 */
@Configuration
class ConfiguracionDeLicencias {

    @Bean
    PlantillaDeNumeroDeLicencia plantillaDeNumeroDeLicencia() {
        return PlantillaDeNumeroDeLicencia.POR_OMISION;
    }
}
