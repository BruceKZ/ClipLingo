/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_PROVIDER_ID?: string;
  readonly VITE_DEFAULT_PROVIDER_NAME?: string;
  readonly VITE_DEFAULT_PROVIDER_BASE_URL?: string;
  readonly VITE_DEFAULT_PROVIDER_PATH?: string;
  readonly VITE_DEFAULT_PROVIDER_MODEL?: string;
  readonly VITE_DEFAULT_PROVIDER_API_KEY?: string;
  readonly VITE_DEFAULT_PROVIDER_ORGANIZATION?: string;
  readonly VITE_DEFAULT_PROVIDER_TIMEOUT_SECS?: string;
  readonly VITE_DEFAULT_PROVIDER_TEMPERATURE?: string;
  readonly VITE_DEFAULT_PROVIDER_TOP_P?: string;
  readonly VITE_DEFAULT_PROVIDER_MAX_TOKENS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
