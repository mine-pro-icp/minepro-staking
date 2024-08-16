#[macro_use]
extern crate ic_cdk_macros;
#[macro_use]
extern crate serde;

use candid::{candid_method, CandidType, Principal};
use ic_cdk::{api, storage};
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc1::transfer::{BlockIndex, NumTokens, TransferArg, TransferError};
use icrc_ledger_types::icrc2::transfer_from::{TransferFromArgs, TransferFromError};
use std::collections::{BTreeSet, HashMap};

pub mod guard;
use guard::GuardPrincipal;
pub mod state;
use state::{mutate_state, read_state, replace_state, State, UserInfo};

fn reject_anonymous_call() {
    if ic_cdk::caller() == Principal::anonymous() {
        ic_cdk::trap("call rejected: anonymous caller");
    }
}

#[derive(CandidType, Deserialize)]
struct InitArgs {
    token: Account,
    reward: Account,
    fee_recipient: Account,
    leave_early_fee: NumTokens,
    lock_time: u64,
}

#[pre_upgrade]
fn pre_upgrade() {
    read_state(|s| storage::stable_save((s,)).unwrap());
}

#[post_upgrade]
fn post_upgrade() {
    let (old_state,): (State,) = storage::stable_restore().unwrap();
    replace_state(old_state);
}

#[init]
#[candid_method(init)]
fn init(args: InitArgs) {
    replace_state(State {
        lock_time: args.lock_time,
        leave_early_fee: args.leave_early_fee,
        fee_recipient: args.fee_recipient.owner,
        token: args.token.owner,
        reward: args.reward.owner,

        users: HashMap::new(),
        principal_guards: BTreeSet::new(),

        total_rewards: NumTokens::from(0u8),
        total_shares: NumTokens::from(0u8),
        dividends_per_share: NumTokens::from(0u8),
        precision: NumTokens::from(1000000000000000000u128), // 10^18
    });
}

#[query(name = "totalSupply")]
fn total_supply() -> NumTokens {
    read_state(|s| s.total_shares.clone())
}

#[query(name = "balanceOf")]
fn balance_of(user: Principal) -> NumTokens {
    read_state(|s| {
        let user_info = s.users.get(&user);

        match user_info {
            Some(u) => u.amount.clone(),
            _ => NumTokens::from(0u8),
        }
    })
}

#[query(name = "totalRewards")]
fn total_rewards() -> NumTokens {
    read_state(|s| s.total_rewards.clone())
}

#[query(name = "pendingRewards")]
fn pending_rewards() -> NumTokens {
    read_state(|s| {
        match s.users.get(&api::caller()) {
            Some(user) => s.pending_rewards(&api::caller()) + user.rewards_to_claim.clone(),
            None => NumTokens::from(0u8),
        }
    })
}

#[derive(CandidType, Deserialize)]
struct Metadata {
    pub lock_time: u64,
    pub leave_early_fee: NumTokens,
    pub fee_recipient: Principal,
    pub token: Principal,
    pub reward: Principal,
}

#[query(name = "getMetadata")]
fn get_metadata() -> Metadata {
    read_state(|s| Metadata{
        lock_time: s.lock_time,
        leave_early_fee: s.leave_early_fee.clone(),
        fee_recipient: s.fee_recipient,
        token: s.token,
        reward: s.reward,
    })
}

#[update(name = "claimRewards")]
async fn claim_rewards() -> Result<(), StakingError> {
    reject_anonymous_call();

    let principal = api::caller();
    let _guard = GuardPrincipal::new(principal);
    if _guard.is_err() {
        return Err(StakingError::Busy);
    }

    init_claim_rewards(&principal);

    return try_claim_all(&principal).await;
}

#[update(name = "withdraw")]
async fn withdraw(amount: NumTokens) -> Result<(), StakingError> {
    reject_anonymous_call();

    if amount <= 0u8 {
        return Err(StakingError::ZeroAmount);
    }

    let principal = api::caller();
    let _guard = GuardPrincipal::new(principal);
    if _guard.is_err() {
        return Err(StakingError::Busy);
    }

    let user_amount = read_state(|s| match s.users.get(&principal) {
        Some(user) => user.amount.clone(),
        None => NumTokens::from(0u8),
    });
    if amount > user_amount {
        return Err(StakingError::InsufficientBalance);
    }

    init_claim_rewards(&principal);

    let mut tokens_to_claim = amount.clone();

    let fee = read_state(|s| match s.users.get(&principal) {
        Some(user) => {
            if user.time_until_unlock() == 0 {
                return NumTokens::from(0u8);
            }

            return amount.clone() * s.leave_early_fee.clone() / 100u8;
        }
        None => NumTokens::from(0u8),
    });
    if fee > 0u8 {
        tokens_to_claim -= fee.clone();
    }

    let new_user_amount = read_state(|s| {
        return s.users.get(&principal).unwrap().amount.clone() - amount.clone();
    });
    let total_excluded = read_state(|s| s.get_cumulative_dividends(&new_user_amount));
    mutate_state(|s| {
        let user = s.users.get_mut(&principal).unwrap();

        s.total_shares -= amount.clone();
        user.amount = new_user_amount.clone();
        user.total_excluded = total_excluded.clone();

        user.token_to_claim += tokens_to_claim.clone();
        user.fee_to_claim += fee.clone();
    });

    return try_claim_all(&principal).await;
}

#[update(name = "stake")]
async fn stake(amount: NumTokens, subaccount: Option<[u8; 32]>) -> Result<(), StakingError> {
    reject_anonymous_call();

    let principal = api::caller();
    let _guard = GuardPrincipal::new(principal);
    if _guard.is_err() {
        return Err(StakingError::Busy);
    }

    init_claim_rewards(&principal);
    try_init_account(&principal);

    let staked_token_principal = read_state(|s| s.token);
    let transfer_from_args = TransferFromArgs {
        from: Account::from(principal),
        memo: None,
        amount: amount.clone(),
        fee: None,
        spender_subaccount: subaccount,
        to: Account::from(api::id()),
        created_at_time: None,
    };

    match ic_cdk::call::<(TransferFromArgs,), (Result<BlockIndex, TransferFromError>,)>(
        staked_token_principal,
        "icrc2_transfer_from",
        (transfer_from_args,),
    )
    .await
    {
        Ok(res) => match res.0 {
            Ok(_) => mutate_state(|s| {
                let user = s.users.get_mut(&principal).unwrap();

                s.total_shares += amount.clone();
                user.amount += amount.clone();
                user.unlock_time = api::time() + s.lock_time;
                user.total_excluded = (user.amount.clone() * s.dividends_per_share.clone()) / s.precision.clone();
            }),
            Err(_) => return Err(StakingError::TransferTokenFailed),
        },
        Err(_) => return Err(StakingError::TransferTokenFailed),
    };

    Ok(())
}

#[update(name = "depositRewards")]
async fn deposit_rewards(amount: NumTokens, subaccount: Option<[u8; 32]>) -> Result<(), StakingError> {
    reject_anonymous_call();

    let principal = api::caller();

    let total_shares = read_state(|s| s.total_shares.clone());
    if total_shares == 0u8 {
        return Err(StakingError::NoShare);
    }

    let reward_token_principal = read_state(|s| s.reward);
    let transfer_from_args = TransferFromArgs {
        from: Account::from(principal),
        memo: None,
        amount: amount.clone(),
        fee: None,
        spender_subaccount: subaccount,
        to: Account::from(api::id()),
        created_at_time: None,
    };

    match ic_cdk::call::<(TransferFromArgs,), (Result<BlockIndex, TransferFromError>,)>(
        reward_token_principal,
        "icrc2_transfer_from",
        (transfer_from_args,),
    )
    .await
    {
        Ok(res) => match res.0 {
            Ok(_) => mutate_state(|s| {
                s.dividends_per_share += (amount.clone() * s.precision.clone()) / s.total_shares.clone();
                s.total_rewards += amount.clone();
            }),
            Err(_) => return Err(StakingError::TransferTokenFailed),
        },
        Err(_) => return Err(StakingError::TransferTokenFailed),
    };

    Ok(())
}

fn init_claim_rewards(principal: &Principal) {
    let user_amount = read_state(|s| match s.users.get(principal) {
        Some(user) => user.amount.clone(),
        None => NumTokens::from(0u8),
    });
    if user_amount == 0u8 {
        return;
    }

    let amount = read_state(|s| s.pending_rewards(principal));
    if amount == 0u8 {
        return;
    }

    let new_total_excluded = read_state(|s| s.get_cumulative_dividends(&user_amount));
    mutate_state(|s| {
        let user = s.users.get_mut(principal).unwrap();

        user.total_excluded = new_total_excluded;
        user.rewards_to_claim += amount;
    });
}

async fn try_claim_all(principal: &Principal) -> Result<(), StakingError> {
    let staked_token_principal = read_state(|s| s.token);
    let reward_token_principal = read_state(|s| s.reward);

    let claims: (NumTokens, NumTokens, NumTokens) = read_state(|s| match s.users.get(principal) {
        Some(user) => (
            user.fee_to_claim.clone(),
            user.rewards_to_claim.clone(),
            user.token_to_claim.clone(),
        ),
        None => (
            NumTokens::from(0u8),
            NumTokens::from(0u8),
            NumTokens::from(0u8),
        ),
    });

    // send fee to fee_recipient
    if claims.0 > 0u8 {
        let fee_recipient = read_state(|s| s.fee_recipient);
        let transfer_args = TransferArg {
            memo: None,
            amount: claims.0.clone(),
            from_subaccount: None,
            fee: None,
            to: Account::from(fee_recipient),
            created_at_time: None,
        };

        match ic_cdk::call::<(TransferArg,), (Result<BlockIndex, TransferError>,)>(
            reward_token_principal,
            "icrc1_transfer",
            (transfer_args,),
        )
        .await
        {
            Ok(res) => match res.0 {
                Ok(_) => mutate_state(|s| {
                    let user = s.users.get_mut(&principal).unwrap();

                    user.fee_to_claim = NumTokens::from(0u8);
                }),
                Err(_) => return Err(StakingError::TransferTokenFailed),
            },
            Err(_) => return Err(StakingError::TransferTokenFailed),
        };
    }

    // claim rewards
    if claims.1 > 0u8 {
        let transfer_args = TransferArg {
            memo: None,
            amount: claims.1,
            from_subaccount: None,
            fee: None,
            to: Account::from(*principal),
            created_at_time: None,
        };

        match ic_cdk::call::<(TransferArg,), (Result<BlockIndex, TransferError>,)>(
            reward_token_principal,
            "icrc1_transfer",
            (transfer_args,),
        )
        .await
        {
            Ok(res) => match res.0 {
                Ok(_) => mutate_state(|s| {
                    let user = s.users.get_mut(&principal).unwrap();

                    user.rewards_to_claim = NumTokens::from(0u8);
                }),
                Err(_) => return Err(StakingError::TransferTokenFailed),
            },
            Err(_) => return Err(StakingError::TransferTokenFailed),
        };
    }

    // claim staked tokens
    if claims.2 > 0u8 {
        let transfer_args = TransferArg {
            memo: None,
            amount: claims.2,
            from_subaccount: None,
            fee: None,
            to: Account::from(*principal),
            created_at_time: None,
        };

        match ic_cdk::call::<(TransferArg,), (Result<BlockIndex, TransferError>,)>(
            staked_token_principal,
            "icrc1_transfer",
            (transfer_args,),
        )
        .await
        {
            Ok(res) => match res.0 {
                Ok(_) => mutate_state(|s| {
                    let user = s.users.get_mut(&principal).unwrap();

                    user.token_to_claim = NumTokens::from(0u8);
                }),
                Err(_) => return Err(StakingError::TransferTokenFailed),
            },
            Err(_) => return Err(StakingError::TransferTokenFailed),
        };
    }

    Ok(())
}

pub fn try_init_account(principal: &Principal) {
    mutate_state(|s| {
        s.users.entry(*principal).or_insert(UserInfo{
            amount: NumTokens::from(0u8),
            unlock_time: 0,
            total_excluded: NumTokens::from(0u8),
            token_to_claim: NumTokens::from(0u8),
            rewards_to_claim: NumTokens::from(0u8),
            fee_to_claim: NumTokens::from(0u8),
        });
    });
}

#[derive(CandidType, Deserialize)]
pub enum StakingError {
    Busy,
    ZeroAmount,
    NothingToClaim,
    InsufficientBalance,
    UserDoesNotExist,
    TransferTokenFailed,
    RaceCondition,
    NoShare,
}

ic_cdk::export_candid!();
