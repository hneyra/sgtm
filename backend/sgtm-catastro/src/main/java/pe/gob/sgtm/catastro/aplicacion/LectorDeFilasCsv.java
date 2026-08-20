package pe.gob.sgtm.catastro.aplicacion;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.List;

/**
 * Lee un archivo separado por comas fila a fila, para los tres importadores de #121.
 *
 * <p>Sin dependencias, a proposito: el archivo que carga una municipalidad son unas pocas columnas
 * de codigo y nombre, no una hoja de calculo con formulas. Un analizador CSV completo (RFC 4180
 * entero, campos con salto de linea) traeria una dependencia para un problema que este archivo no
 * tiene.
 *
 * <p>Lo que si soporta, porque un nombre de via o de sector puede traer una coma: un campo entre
 * comillas dobles, con {@code ""} como comilla literal dentro de el. Lo que <b>no</b> soporta: un
 * campo con un salto de linea dentro de las comillas. Cada linea fisica del archivo es una fila; si
 * un dia hace falta mas, este es el sitio para reemplazarlo por una libreria de verdad.
 *
 * <p>La primera linea es el encabezado y se descarta sin leerla como fila. Las lineas en blanco se
 * saltan y no cuentan como fila de datos, pero <b>si</b> cuentan para la numeracion: el numero de
 * fila que se reporta es siempre el numero de linea real del archivo, para que quien lo abra en un
 * editor de hojas de calculo encuentre la fila exacta.
 */
final class LectorDeFilasCsv {

    private LectorDeFilasCsv() {}

    /**
     * Una fila de datos, con su numero de linea en el archivo (1-based, contando el encabezado).
     */
    record FilaCsv(int numeroDeLinea, List<String> campos) {}

    static List<FilaCsv> leer(Reader archivo) throws IOException {
        List<FilaCsv> filas = new ArrayList<>();
        try (BufferedReader lector = new BufferedReader(archivo)) {
            int numeroDeLinea = 1;
            lector.readLine(); // el encabezado: se descarta sin analizar
            String linea;
            while ((linea = lector.readLine()) != null) {
                numeroDeLinea++;
                if (!linea.isBlank()) {
                    filas.add(new FilaCsv(numeroDeLinea, dividir(linea)));
                }
            }
        }
        return filas;
    }

    /** Separa por comas, respetando un campo entre comillas dobles con {@code ""} como escape. */
    private static List<String> dividir(String linea) {
        List<String> campos = new ArrayList<>();
        StringBuilder actual = new StringBuilder();
        boolean entreComillas = false;

        for (int i = 0; i < linea.length(); i++) {
            char caracter = linea.charAt(i);
            if (entreComillas) {
                if (caracter == '"') {
                    boolean comillaEscapada = i + 1 < linea.length() && linea.charAt(i + 1) == '"';
                    if (comillaEscapada) {
                        actual.append('"');
                        i++;
                    } else {
                        entreComillas = false;
                    }
                } else {
                    actual.append(caracter);
                }
            } else if (caracter == '"' && actual.isEmpty()) {
                entreComillas = true;
            } else if (caracter == ',') {
                campos.add(actual.toString().strip());
                actual.setLength(0);
            } else {
                actual.append(caracter);
            }
        }
        campos.add(actual.toString().strip());
        return campos;
    }
}
