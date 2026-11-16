/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** TMDb v3 API key (sent as a query param). */
  readonly VITE_TMDB_API_KEY?: string;
  /** TMDb v4 read access token (sent as a Bearer header; preferred). */
  readonly VITE_TMDB_READ_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
