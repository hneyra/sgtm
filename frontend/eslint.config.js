import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

/**
 * Reglas de ESLint del frontend del SGTM.
 *
 * Objetivo de FRO-04 §9, heredado de ARQ-04: **toda prohibición que pueda
 * expresarse como verificación automática se expresa así.** Una prohibición que
 * solo vive en un documento se incumple en seis meses.
 *
 * Cada regla de este archivo tiene su muestra que la viola en
 * `verificaciones/muestras/`, y `verificaciones/reglas-de-eslint.test.ts` exige
 * que muerda: una regla que no puede fallar no protege nada.
 */

/** Nombres de campo que llevan dinero. Sobre ellos no se hace aritmética. */
const CAMPOS_DE_DINERO =
  'monto|importe|saldo|deuda|total|insoluto|interes|autovaluo|arbitrio|recargo|vuelto|recibido';

/** Tildes y eñe: prohibidas en identificadores (regla de idioma; Checkstyle hace lo mismo en el backend). */
const LETRAS_ACENTUADAS = 'áéíóúÁÉÍÓÚñÑüÜ';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.config.ts',
      // Violan las reglas a propósito. Se lintan desde la prueba, no desde `yarn lint`.
      'verificaciones/muestras/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      // —— FRO-04 §3: `any` prohibido ——
      '@typescript-eslint/no-explicit-any': 'error',

      // —— FRO-04 §4: un importe es `string`, nunca `number` (regla 1, RNF-055) ——
      'no-restricted-globals': [
        'error',
        {
          name: 'parseFloat',
          message: 'Un importe es texto (FRO-04 §4). No lo conviertas a number.',
        },
        {
          name: 'parseInt',
          message: 'Si es un importe, no lo conviertas a number (FRO-04 §4).',
        },
      ],

      'no-restricted-syntax': [
        'error',
        // —— FRO-04 §4: la interfaz no hace aritmética con importes (RNF-083) ——
        {
          selector: `BinaryExpression[operator=/^[-+*/%]$/] > MemberExpression[property.name=/${CAMPOS_DE_DINERO}/i]`,
          message:
            'Aritmética con un importe. El total lo calcula el backend (RNF-083): pídelo, no lo sumes.',
        },
        {
          selector: `CallExpression[callee.property.name='reduce'][callee.object.property.name=/${CAMPOS_DE_DINERO}|cuotas|conceptos|valores|papeletas/i]`,
          message:
            'Sumar importes en el cliente produce una cifra que el backend no puede sustentar (RNF-083).',
        },
        {
          selector: `CallExpression[callee.name=/^(Number|parseFloat)$/] > MemberExpression[property.name=/${CAMPOS_DE_DINERO}/i]`,
          message: 'Un importe es texto y pierde céntimos como number (RNF-055, FRO-04 §4).',
        },

        // —— Regla 2 de CLAUDE.md: el frontend jamás envía `municipalidadId` (ARQ-03 §3.1) ——
        {
          selector: "Identifier[name='municipalidadId']",
          message:
            'El frontend jamás envía municipalidadId: el backend lo toma del token (ARQ-03 §3.1, FRO-01 §4).',
        },

        // —— FRO-01 §5: el token vive en memoria ——
        // La prohibicion es guardar credenciales en el navegador, no usar el
        // almacenamiento: FRO-03 §3 pide persistir ahi las cinco opciones
        // recientes, y lo dice en la misma frase en que excluye el token.
        {
          selector:
            'CallExpression[callee.object.name=/^(localStorage|sessionStorage)$/][callee.property.name=/^(setItem|getItem|removeItem)$/][arguments.0.value=/token|jwt|bearer|credencial|contrasena|acceso|sesion/i]',
          message: 'El token vive en memoria, nunca en localStorage ni sessionStorage (FRO-01 §5).',
        },

        // —— La interfaz habla con el backend por @sgtm/api-client ——
        // Es la regla que sostiene el proxy de datos: mientras todas las
        // peticiones pasen por `solicitar()`, cambiar el proxy simulado por el
        // backend real es apagar el proxy. Un `fetch` suelto en una pantalla se
        // salta el token, la idempotencia y el formato de error, y ademas
        // sobrevive a la integracion como un caso aparte que nadie recuerda.
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            'Las peticiones pasan por «solicitar» de @sgtm/api-client: ahi viven el token, la clave de idempotencia y el formato de error (FRO-01 §5, FRO-04 §5).',
        },

        // —— Regla 10 de CLAUDE.md: sin observacion no se guarda (RNF-052) ——
        // No se puede pedirle a ESLint que compruebe que un formulario «tiene»
        // un campo; lo que si se puede es dejar **un solo camino** para
        // escribir. `useEscritura` pide la observacion y sin ella no habilita la
        // accion, asi que una mutacion suelta es una escritura que se salta la
        // regla. El unico sitio donde se permite es el propio `escritura.ts`,
        // con su justificacion escrita al lado.
        {
          selector: "CallExpression[callee.name='useMutation']",
          message:
            'Toda escritura pasa por «useEscritura»: sin observación del usuario no se guarda (regla 10, RNF-052).',
        },

        // —— Regla 9 de CLAUDE.md: no existe «la deuda», existe la deuda a una fecha (RNF-075) ——
        {
          selector:
            "JSXOpeningElement[name.name='Importe']:not(:has(JSXAttribute[name.name=/^(fechaCalculo|fechaDeCalculo)$/]))",
          message:
            'Todo importe se muestra con su fecha de cálculo: no existe «la deuda» (RNF-075, regla 9).',
        },

        // —— Regla 8 de CLAUDE.md: `alicuota`, nunca `tasa`, para un porcentaje ——
        {
          selector: `Identifier[name=/^tasa(De)?(Interes|Descuento|Porcentaje|Depreciacion|Moratori|Alicuota)/i]`,
          message:
            'Un porcentaje se llama «alicuota» (regla 8). «tasa» es un tipo de tributo del manual.',
        },

        // —— Idioma (CLAUDE.md): sin tildes en identificadores ——
        {
          selector: `Identifier[name=/[${LETRAS_ACENTUADAS}]/]`,
          message:
            'Sin tildes ni eñe en identificadores: «alicuota», no «alícuota». El texto con tildes va en las cadenas.',
        },

        // —— FRO-04 §7: accesibilidad ——
        {
          selector: "JSXAttribute[name.name='tabIndex'][value.expression.value>0]",
          message: 'Sin tabIndex positivo (FRO-04 §7).',
        },
      ],

      // —— FRO-04 §5: los datos del servidor no se copian a useState ——
      'react-hooks/exhaustive-deps': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    // El portador del catalogo corre en Node, no en el navegador.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    // `@sgtm/api-client` y el proxy de datos son los dos unicos sitios donde
    // `fetch` esta en su sitio: uno lo usa y el otro lo sustituye.
    files: ['packages/api-client/**/*.ts', 'packages/api-mock/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Identifier[name='municipalidadId']",
          message:
            'El frontend jamás envía municipalidadId: el backend lo toma del token (ARQ-03 §3.1, FRO-01 §4).',
        },
      ],
    },
  },

  {
    files: ['**/*.test.{ts,tsx}', 'verificaciones/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-restricted-syntax': 'off' },
  },
);
