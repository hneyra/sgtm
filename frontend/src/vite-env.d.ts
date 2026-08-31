/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** La raíz de la API. Sin declarar, `/api/v1`, que el proxy de Vite reenvía. */
  readonly VITE_SGTM_API?: string;
  /** El token con el que se firma cada petición. Solo para la vista previa
   *  local: en la imagen desplegada lo trae la puerta de sesión. */
  readonly VITE_SGTM_TOKEN?: string;
  /** El realm de Keycloak. Sin declarar, `/kc/realms/sgtm` —del mismo origen. */
  readonly VITE_SGTM_OIDC_REALM?: string;
  readonly VITE_SGTM_OIDC_CLIENTE?: string;
  readonly VITE_SGTM_OIDC_ALCANCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
