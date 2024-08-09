#[macro_use]
extern crate ic_cdk_macros;
#[macro_use]
extern crate serde;

use candid::{CandidType, Principal};
use ic_cdk::api;
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc1::transfer::{BlockIndex, NumTokens, TransferArg, TransferError};
use icrc_ledger_types::icrc2::transfer_from::{TransferFromArgs, TransferFromError};
use std::collections::HashMap;

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
    token: Principal,
    reward: Principal,
    fee_recipient: Principal,
    leave_early_fee: NumTokens,
    lock_time: u64,
}

#[init]
fn init(args: InitArgs) {
    replace_state(State {
        lock_time: args.lock_time,
        leave_early_fee: args.leave_early_fee,
        fee_recipient: args.fee_recipient,
        token: args.token,
        reward: args.reward,

        users: HashMap::new(),

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

#[update(name = "claimRewards")]
async fn claim_rewards() -> Result<(), StakingError> {
    reject_anonymous_call();

    let user_principal = api::caller();
    let _guard_principal = GuardPrincipal::new();
    if _guard_principal.is_err() {
        return Err(StakingError::Busy);
    }

    return _claim_rewards(user_principal).await;
}

#[update(name = "withdraw")]
async fn withdraw(amount: NumTokens) -> Result<(), StakingError> {
    if amount <= 0u8 {
        return Err(StakingError::ZeroAmount);
    }

    let _guard_principal = GuardPrincipal::new();
    if _guard_principal.is_err() {
        return Err(StakingError::Busy);
    }

    let user_amount = read_state(|s| {
        let user = s.users.get(&api::caller());
        match user {
            Some(u) => return u.amount.clone(),
            None => return NumTokens::from(0u8),
        }
    });
    if user_amount < amount {
        return Err(StakingError::InsufficientBalance);
    }

    _claim_rewards(api::caller()).await;

    let fee = read_state(|s| {
        if s.users.get(&api::caller()).unwrap().time_until_unlock() == 0 {
            return NumTokens::from(0u8);
        }

        return amount.clone() * s.leave_early_fee.clone() / 100u8;
    });

    mutate_state(|s| {
        s.total_shares -= amount.clone();
        let user = s.users.get_mut(&api::caller()).unwrap();

        let user_amount = user.amount.clone() - amount.clone();
        user.amount = user_amount.clone();

        user.total_excluded = user_amount * s.dividends_per_share.clone() / s.precision.clone();
    });

    if fee > 0u8 {
        let transfer_args = TransferArg {
            memo: None,
            amount: fee.clone(),
            from_subaccount: None,
            fee: None,
            to: Account::from(read_state(|s| s.fee_recipient)),
            created_at_time: None,
        };
        let res = ic_cdk::call::<(TransferArg,), (Result<BlockIndex, TransferFromError>,)>(
            read_state(|s| s.token),
            "icrc1_transfer",
            (transfer_args,),
        )
        .await;

        if res.is_err() {
            return Err(StakingError::TransferTokenFailed);
        }
    }

    let send_amount = amount - fee.clone();
    let transfer_args = TransferArg {
        memo: None,
        amount: send_amount,
        from_subaccount: None,
        fee: None,
        to: Account::from(api::caller()),
        created_at_time: None,
    };
    let res = ic_cdk::call::<(TransferArg,), (Result<BlockIndex, TransferFromError>,)>(
        read_state(|s| s.token),
        "icrc1_transfer",
        (transfer_args,),
    )
    .await;
    if res.is_err() {
        return Err(StakingError::TransferTokenFailed);
    }

    Ok(())
}

#[update(name = "withdraw")]
async fn stake(amount: NumTokens) -> Result<(), StakingError> {
    if amount <= 0u8 {
        return Err(StakingError::ZeroAmount);
    }

    let _guard = GuardPrincipal::new();
    if _guard.is_err() {
        return Err(StakingError::Busy);
    }

    let user_amount = read_state(|s| {
        let user = s.users.get(&api::caller());
        match user {
            Some(u) => return u.amount.clone(),
            None => return NumTokens::from(0u8),
        }
    });
    if user_amount > 0u8 {
        _claim_rewards(api::caller()).await;
    }

    let received = _transfer_in(read_state(|s| s.token), amount).await;

    mutate_state(|s| {
        
    });

    Ok(())
}

async fn _claim_rewards(user_principal: Principal) -> Result<(), StakingError> {
    let user_amount = read_state(|s| match s.users.get(&user_principal) {
        Some(u) => u.amount.clone(),
        None => NumTokens::from(0u8),
    });
    let amount = read_state(|s| s.pending_rewards(user_principal));
    if amount == 0u8 {
        return Err(StakingError::NothingToClaim);
    }

    let transfer_args = TransferArg {
        memo: None,
        amount,
        from_subaccount: None,
        fee: None,
        to: Account::from(api::caller()),
        created_at_time: None,
    };

    let staked_token_principal = read_state(|s| s.token);
    match ic_cdk::call::<(TransferArg,), (Result<BlockIndex, TransferFromError>,)>(
        staked_token_principal,
        "icrc1_transfer",
        (transfer_args,),
    )
    .await
    {
        Ok(_) => mutate_state(|s| s.get_cumulative_dividends(user_amount)),
        Err(_) => return Err(StakingError::TransferTokenFailed),
    };

    Ok(())
}

async fn _transfer_in(token: Principal, amount: NumTokens) {}

#[derive(CandidType, Deserialize)]
pub enum StakingError {
    Busy,
    ZeroAmount,
    NothingToClaim,
    InsufficientBalance,
    UserDoesNotExist,
    TransferTokenFailed,
    RaceCondition,
}
