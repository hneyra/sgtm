package pe.gob.sgtm.seguridad.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.web.ParametrosDePaginacion;

/**
 * Las lecturas de administracion de permisos declaran su acceso <b>en el metodo</b>, y cual.
 *
 * <p>Nacio con las dos de #543 y crece con las dos de #583 —lo configurado de una cuenta y quien
 * tiene un privilegio sobre un acceso—, por el mismo motivo: la anotacion la ve ArchUnit, pero
 * <b>cual</b> acceso exige, no.
 *
 * <h2>Por que esto no lo cubre ArchUnit</h2>
 *
 * <p>La regla de {@code verificarArquitectura} exige la anotacion «en la clase <b>o</b> en cada
 * endpoint». {@link PermisosDeUsuarioController} declara un {@code @RequestMapping} de clase y hoy
 * un solo metodo: si mañana alguien le añade una escritura sin anotarla, heredaria el {@code
 * LECTURA} de esta y ArchUnit seguiria en verde. Es el hueco que #431 encontro en {@code
 * ProgramasController} y #489 en el alta de predio, aqui puesto por delante.
 *
 * <p>Y sobre {@link SeguridadController} la comprobacion dice otra cosa: <b>que acceso</b> exige la
 * lectura nueva. Elegir uno u otro no es un detalle de estilo —decide quien puede abrir la pantalla
 * que la consume— y no hay ninguna otra prueba que lo fije.
 */
@DisplayName("El acceso de las lecturas de permisos de un usuario (#543, #583)")
class AccesoDeLasLecturasDeUsuarioTest {

    @Test
    @DisplayName("los grupos de un usuario exigen LECTURA sobre «usuarios»")
    void losGruposExigenLecturaSobreUsuarios() throws Exception {
        RequiereAcceso enElMetodo =
                SeguridadController.class
                        .getMethod("gruposDeUsuario", long.class, ParametrosDePaginacion.class)
                        .getAnnotation(RequiereAcceso.class);

        assertThat(enElMetodo)
                .as("la clase no declara ninguna: sin la del metodo esta lectura no tiene guardia")
                .isNotNull();
        assertThat(enElMetodo.acceso())
                .as(
                        "es una lectura SOBRE un usuario, y la grilla de «Usuarios del sistema» del"
                                + " manual dibuja la columna «Grupo»; afiliarlo sigue siendo"
                                + " «miembros» con REGISTRO")
                .isEqualTo("usuarios");
        assertThat(enElMetodo.privilegio()).isEqualTo(Privilegio.LECTURA);
    }

    @Test
    @DisplayName("los permisos efectivos exigen LECTURA sobre «permisos»")
    void losPermisosExigenLecturaSobrePermisos() throws Exception {
        RequiereAcceso enElMetodo =
                PermisosDeUsuarioController.class
                        .getMethod("deUsuario", long.class)
                        .getAnnotation(RequiereAcceso.class);

        assertThat(enElMetodo)
                .as("una escritura añadida despues no puede heredar en silencio este LECTURA")
                .isNotNull();
        assertThat(enElMetodo.acceso())
                .as("la misma opcion del catalogo que la matriz de un grupo")
                .isEqualTo("permisos");
        assertThat(enElMetodo.privilegio()).isEqualTo(Privilegio.LECTURA);
    }

    @Test
    @DisplayName("los permisos configurados tambien: es la misma matriz con otra regla (#583)")
    void losConfiguradosExigenLecturaSobrePermisos() throws Exception {
        RequiereAcceso enElMetodo =
                PermisosDeUsuarioController.class
                        .getMethod("configuradosDeUsuario", long.class)
                        .getAnnotation(RequiereAcceso.class);

        assertThat(enElMetodo)
                .as(
                        "la clase declara solo el @RequestMapping: sin la del metodo, esta lectura"
                                + " —que enseña lo que una cuenta deshabilitada conserva— se"
                                + " quedaria sin guardia")
                .isNotNull();
        assertThat(enElMetodo.acceso())
                .as(
                        "es el mismo dato que la matriz efectiva, mirado sin la regla del guardia:"
                                + " pedir otro acceso lo dejaria detras de un permiso distinto del"
                                + " de la pantalla que lo dibuja. ArchUnit no ve CUAL acceso es"
                                + " (#431, #543)")
                .isEqualTo("permisos");
        assertThat(enElMetodo.privilegio()).isEqualTo(Privilegio.LECTURA);
    }

    @Test
    @DisplayName("y «quien tiene X sobre Y» exige LECTURA sobre «permisos» (#583)")
    void losTitularesExigenLecturaSobrePermisos() throws Exception {
        RequiereAcceso enElMetodo =
                TitularesDelPrivilegioController.class
                        .getMethod(
                                "titulares",
                                String.class,
                                String.class,
                                ParametrosDePaginacion.class)
                        .getAnnotation(RequiereAcceso.class);

        assertThat(enElMetodo)
                .as("la clase no declara ninguna: sin la del metodo no hay guardia")
                .isNotNull();
        assertThat(enElMetodo.acceso())
                .as(
                        "es la misma informacion que la matriz de un usuario, mirada desde el otro"
                                + " lado: quien puede leer los permisos de una persona puede"
                                + " preguntar quien tiene uno. Pedir «accesos» —la ruta empieza por"
                                + " ahi— la dejaria detras del permiso de ver el CATALOGO, que es"
                                + " otra cosa, y deja el build en VERDE")
                .isEqualTo("permisos");
        assertThat(enElMetodo.privilegio()).isEqualTo(Privilegio.LECTURA);
    }
}
