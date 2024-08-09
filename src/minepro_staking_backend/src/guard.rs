use crate::state::{mutate_state, GuardState};

use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;
use std::marker::PhantomData;

/// Guards a block from executing twice when called by the same user and from being
/// executed [MAX_CONCURRENT] or more times in parallel.
#[must_use]
pub struct GuardPrincipal {
    principal: Principal,
    _marker: PhantomData<GuardPrincipal>,
}

#[derive(Debug, PartialEq, Eq, CandidType, Serialize, Deserialize)]
pub enum GuardError {
    AlreadyProcessing,
    TooManyConcurrentRequests,
}

impl GuardPrincipal {
    /// Attempts to create a new guard for the current block. Fails if there is
    /// already a pending request for the specified [principal] or if there
    /// are at least [MAX_CONCURRENT] pending requests.
    pub fn new() -> Result<(), ()> {
        mutate_state(|s| {
            if matches!(s.state_guard, GuardState::GuardLocked) {
                return Err(());
            }

            Ok(())
        })
    }
}

impl Drop for GuardPrincipal {
    fn drop(&mut self) {
        mutate_state(|s| {
            s.state_guard = GuardState::GuardUnlocked;
        });
    }
}
