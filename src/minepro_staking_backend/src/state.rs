use candid::{CandidType, Principal};
use icrc_ledger_types::icrc1::transfer::NumTokens;
use std::{
    cell::RefCell,
    collections::{BTreeSet, HashMap},
};

thread_local! {
    static __STATE: RefCell<Option<State>> = RefCell::default();
}

#[derive(CandidType, Deserialize)]
pub enum GuardState {
    GuardUnlocked,
    GuardLocked,
}

#[derive(CandidType, Deserialize)]
pub struct State {
    pub lock_time: u64,
    pub leave_early_fee: NumTokens,
    pub fee_recipient: Principal,
    pub token: Principal,
    pub reward: Principal,

    pub users: HashMap<Principal, UserInfo>,
    pub principal_guards: BTreeSet<Principal>,

    pub total_rewards: NumTokens,
    pub total_shares: NumTokens,
    pub dividends_per_share: NumTokens,
    pub precision: NumTokens,
}

impl State {
    pub fn pending_rewards(&self, user_principal: &Principal) -> NumTokens {
        let user = self.users.get(&user_principal);
        if user.is_none() {
            return NumTokens::from(0u8);
        }

        let user = user.unwrap();
        if user.amount == 0u8 {
            return NumTokens::from(0u8);
        }

        let total_dividends = self.get_cumulative_dividends(&user.amount);
        let t_excluded = user.total_excluded.clone();

        if total_dividends <= t_excluded {
            return NumTokens::from(0u8);
        }

        return total_dividends - t_excluded;
    }

    pub fn get_cumulative_dividends(&self, share: &NumTokens) -> NumTokens {
        return (share.clone() * self.dividends_per_share.clone()) / self.precision.clone();
    }
}

#[derive(CandidType, Deserialize)]
pub struct UserInfo {
    pub amount: NumTokens,
    pub unlock_time: u64,
    pub total_excluded: NumTokens,

    pub token_to_claim: NumTokens,
    pub rewards_to_claim: NumTokens,
    pub fee_to_claim: NumTokens,
}

impl UserInfo {
    pub fn default() -> Self {
        return UserInfo{
            amount: NumTokens::from(0u8),
            unlock_time: 0,
            total_excluded: NumTokens::from(0u8),

            token_to_claim: NumTokens::from(0u8),
            rewards_to_claim: NumTokens::from(0u8),
            fee_to_claim: NumTokens::from(0u8),
        }
    }

    pub fn time_until_unlock(&self) -> u64 {
        let current_time = ic_cdk::api::time();

        if self.unlock_time < current_time {
            return 0u64;
        }

        return self.unlock_time - current_time;
    }
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
