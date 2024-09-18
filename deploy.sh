export MINTER=$(dfx identity get-principal)
export REWARD=mxzaz-hqaaa-aaaar-qaada-cai
export TOKEN=3pplk-2yaaa-aaaag-alqsq-cai
export FEE_RECIPIENT=y7qze-p442g-4trdg-6b3vn-f2m3n-2nlvp-htzga-5jojr-jn6zo-fwbaq-3qe

# 30 days
dfx deploy minepro_staking_backend_30 --network ic --argument "(record {
  reward = record { owner = principal \"${REWARD}\" };
  token = record { owner = principal \"${TOKEN}\" };
  fee_recipient = record { owner = principal \"${FEE_RECIPIENT}\" };
  leave_early_fee = 10;
  lock_time = 2_592_000;
})"

# 90 days
dfx deploy minepro_staking_backend_90 --network ic --argument "(record {
  reward = record { owner = principal \"${REWARD}\" };
  token = record { owner = principal \"${TOKEN}\" };
  fee_recipient = record { owner = principal \"${FEE_RECIPIENT}\" };
  leave_early_fee = 15;
  lock_time = 7_776_000;
})"

# 180 days
dfx deploy minepro_staking_backend_180 --network ic --argument "(record {
  reward = record { owner = principal \"${REWARD}\" };
  token = record { owner = principal \"${TOKEN}\" };
  fee_recipient = record { owner = principal \"${FEE_RECIPIENT}\" };
  leave_early_fee = 20;
  lock_time = 15_552_000;
})"

# 1 year
dfx deploy minepro_staking_backend_1year --network ic --argument "(record {
  reward = record { owner = principal \"${REWARD}\" };
  token = record { owner = principal \"${TOKEN}\" };
  fee_recipient = record { owner = principal \"${FEE_RECIPIENT}\" };
  leave_early_fee = 30;
  lock_time = 31_536_000;
})"

# 2 years
dfx deploy minepro_staking_backend_2year --network ic --argument "(record {
  reward = record { owner = principal \"${REWARD}\" };
  token = record { owner = principal \"${TOKEN}\" };
  fee_recipient = record { owner = principal \"${FEE_RECIPIENT}\" };
  leave_early_fee = 50;
  lock_time = 63_072_000;
})"

# 5 years
dfx deploy minepro_staking_backend_5year --network ic --argument "(record {
  reward = record { owner = principal \"${REWARD}\" };
  token = record { owner = principal \"${TOKEN}\" };
  fee_recipient = record { owner = principal \"${FEE_RECIPIENT}\" };
  leave_early_fee = 70;
  lock_time = 157_680_000;
})"
