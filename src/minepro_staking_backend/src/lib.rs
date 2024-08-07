#[macro_use]
extern crate ic_cdk_macros;
#[macro_use]
extern crate serde;

use candid::{CandidType, Principal};
use ic_cdk::api;
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc1::transfer::{BlockIndex, NumTokens, TransferArg, TransferError};
use icrc_ledger_types::icrc2::transfer_from::{TransferFromArgs, TransferFromError};
use std::{cell::RefCell, collections::HashMap};

thread_local! {
    static __STATE: RefCell<Option<State>> = RefCell::default();
}

pub fn read_state<F, R>(f: F) -> R
where
    F: FnOnce(&State) -> R,
{
    __STATE.with(|s| f(s.borrow().as_ref().expect("State not initialized!")))
}

pub fn mutate_state<F, R>(f: F) -> R
where
    F: FnOnce(&mut State) -> R,
{
    __STATE.with(|s| f(s.borrow_mut().as_mut().expect("State not initialized!")))
}

/// Replaces the current state.
pub fn replace_state(state: State) {
    __STATE.with(|s| {
        *s.borrow_mut() = Some(state);
    });
}

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
    __STATE.with(|s| {
        *s.borrow_mut() = Some(State {
            lock_time: args.lock_time,
            leave_early_fee: args.leave_early_fee,
            fee_recipient: args.fee_recipient,
            token: args.token,
            reward: args.reward,

            users: HashMap::new(),

            total_rewards: NumTokens::from(0u8),
            total_shares: NumTokens::from(0u8),
            dividends_per_share: NumTokens::from(0u8),
            precision: 0,
        });
    })
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
    return _claim_rewards(api::caller()).await;
}

#[update(name = "withdraw")]
async fn withdraw(amount: NumTokens) -> Result<(), StakingError> {
    assert!(amount > 0u8, "Zero Amount");

    let user_amount = read_state(|s| match s.users.get(&ic_cdk::caller()) {
        Some(u) => u.amount.clone(),
        None => NumTokens::from(0u8),
    });

    assert!(amount <= user_amount, "Insufficient Amount");

    let user_principal = ic_cdk::caller();
    if user_amount > 0u8 {
        let before_total_excluded = read_state(|s| {
            let user = s.users.get(&user_principal).unwrap();
            s.get_cumulative_dividends(user.amount.clone())
        });
            
        let _ = _claim_rewards(user_principal).await;

        // make sure nothing happens during transaction
        if read_state(|s| {
            let user = s.users.get(&user_principal).unwrap();

            if user.total_excluded != before_total_excluded {
                return 1;
            }

            return 0;
        }) > 0 {
            return Err(StakingError::RaceCondition);
        }
    }

    {
        let new_total_shares = read_state(|s| s.total_shares.clone() - amount.clone());
        let new_user_amount = user_amount - amount.clone();
        let new_user_total_excluded =
            read_state(|s| s.get_cumulative_dividends(new_user_amount.clone()));
        mutate_state(|s| {
            s.total_shares = new_total_shares;
            let user = s.users.get_mut(&user_principal);
            let user = user.unwrap();
            user.amount = new_user_amount;
            user.total_excluded = new_user_total_excluded;
        });
    }

    let fee = read_state(|s| {
        let user = s.users.get(&user_principal).unwrap();
        if user.time_until_unlock() == 0 {
            return NumTokens::from(0u8);
        } else {
            // take fee
            return (amount.clone() * s.leave_early_fee.clone()) / 100u64;
        }
    });
    
    let amount_to_send = amount - fee;

    let transfer_from_args = TransferFromArgs {
        from: Account::from(ic_cdk::id()),
        memo: None,
        amount: amount_to_send,
        spender_subaccount: None,
        fee: None,
        to: Account::from(user_principal),
        created_at_time: None,
    };
    let staked_token_principal = read_state(|s| s.token);
    assert!(
        !ic_cdk::call::<(TransferFromArgs,), (Result<BlockIndex, TransferFromError>,)>(
            staked_token_principal,
            "icrc2_transfer_from",
            (transfer_from_args,),
        )
        .await
        .is_err(),
        "transfer tokens to staker failed"
    );

    // TODO: Transfer fee to fee receiver


    Ok(())
}

async fn _claim_rewards(user_principal: Principal) -> Result<(), StakingError> {
    let amount = read_state(|s| s.pending_rewards(user_principal));
    if amount == 0u8 {
        return Err(StakingError::NothingToClaim);
    }

    let user_total_excluded = read_state(|s| {
        let user = s.users.get(&user_principal).unwrap();
        s.get_cumulative_dividends(user.amount.clone())
    });
    mutate_state(|s| {
        let user = s.users.get_mut(&user_principal).unwrap();

        user.total_excluded = user_total_excluded;
    });

    let reward_token_principal = read_state(|s| s.reward);
    let transfer_from_args = TransferFromArgs {
        from: Account::from(ic_cdk::id()),
        memo: None,
        amount,
        spender_subaccount: None,
        fee: None,
        to: Account::from(user_principal),
        created_at_time: None,
    };

    assert!(
        !ic_cdk::call::<(TransferFromArgs,), (Result<BlockIndex, TransferFromError>,)>(
            reward_token_principal,
            "icrc2_transfer_from",
            (transfer_from_args,),
        )
        .await
        .is_err(),
        "transfer tokens failed"
    );

    Ok(())
}

#[derive(CandidType, Deserialize)]
pub struct State {
    pub lock_time: u64,
    pub leave_early_fee: NumTokens,
    pub fee_recipient: Principal,
    pub token: Principal,
    pub reward: Principal,

    users: HashMap<Principal, UserInfo>,

    pub total_rewards: NumTokens,
    pub total_shares: NumTokens,
    pub dividends_per_share: NumTokens,
    pub precision: u128,
}

impl State {
    fn pending_rewards(&self, user_principal: Principal) -> NumTokens {
        let user = self.users.get(&user_principal);
        if user.is_none() {
            return NumTokens::from(0u8);
        }

        let user = user.unwrap();
        if user.amount == 0u8 {
            return NumTokens::from(0u8);
        }

        let total_dividends = self.get_cumulative_dividends(user.amount.clone());
        let t_excluded = user.total_excluded.clone();

        if total_dividends <= t_excluded {
            return NumTokens::from(0u8);
        }

        return total_dividends - t_excluded;
    }

    fn get_cumulative_dividends(&self, share: NumTokens) -> NumTokens {
        return (share * self.dividends_per_share.clone()) / self.precision;
    }
}

#[derive(CandidType, Deserialize)]
struct UserInfo {
    amount: NumTokens,
    unlock_time: u64,
    total_excluded: NumTokens,
}

impl UserInfo {
    fn time_until_unlock(&self) -> u64 {
        let current_time = ic_cdk::api::time();

        if self.unlock_time < current_time {
            return 0u64;
        }

        return self.unlock_time - current_time;
    }
}

#[derive(CandidType, Deserialize)]
pub enum StakingError {
    NothingToClaim,
    TransferTokenFailed,
    RaceCondition
}
