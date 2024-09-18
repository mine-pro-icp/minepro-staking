/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly CANISTER_ID_MINEPRO_STAKING_BACKEND_30: string,
  readonly CANISTER_ID_MINEPRO_STAKING_BACKEND_90: string,
  readonly CANISTER_ID_MINEPRO_STAKING_BACKEND_180: string,
  readonly CANISTER_ID_MINEPRO_STAKING_BACKEND_1YEAR: string,
  readonly CANISTER_ID_MINEPRO_STAKING_BACKEND_2YEAR: string,
  readonly CANISTER_ID_MINEPRO_STAKING_BACKEND_5YEAR: string,
  readonly CANISTER_ID_INTERNET_IDENTITY: string,
  readonly CANISTER_ID_MINEPRO_STAKING_FRONTEND: string,
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
