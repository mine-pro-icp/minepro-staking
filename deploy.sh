export MINTER=$(dfx identity get-principal)
export REWARD=mrqqs-raaaa-aaaap-qhswa-cai
export TOKEN=mexb7-qiaaa-aaaap-qhsvq-cai

# staked token
dfx deploy minepro_staking_backend --network ic --argument "(record {
  reward = record { owner = principal \"${REWARD}\" };
  token = record { owner = principal \"${TOKEN}\" };
  fee_recipient = record { owner = principal \"${MINTER}\" };
  leave_early_fee = 10_000;
  lock_time = 300;
})"

