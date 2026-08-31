/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** La raíz de la API. Sin declarar, `/api/v1`, que el proxy de Vite reenvía. */
  readonly VITE_SGTM_API?: string;
  /** El token con el que se firma cada petición mientras no haya sesión. */
  readonly VITE_SGTM_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
