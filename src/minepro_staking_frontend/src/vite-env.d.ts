/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly CANISTER_ID_MINEPRO_STAKING_BACKEND: string,
  readonly CANISTER_ID_INTERNET_IDENTITY: string,
  readonly CANISTER_ID_MINEPRO_STAKING_FRONTEND: string,
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
