export const idlFactory = ({ IDL }) => {
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const InitArgs = IDL.Record({
    'reward' : Account,
    'token' : Account,
    'leave_early_fee' : IDL.Nat,
    'fee_recipient' : Account,
    'lock_time' : IDL.Nat64,
  });
  const StakingError = IDL.Variant({
    'NothingToClaim' : IDL.Null,
    'NoShare' : IDL.Null,
    'Busy' : IDL.Null,
    'ZeroAmount' : IDL.Null,
    'InsufficientBalance' : IDL.Null,
    'RaceCondition' : IDL.Null,
    'TransferTokenFailed' : IDL.Null,
    'UserDoesNotExist' : IDL.Null,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : StakingError });
  const Metadata = IDL.Record({
    'reward' : IDL.Principal,
    'token' : IDL.Principal,
    'leave_early_fee' : IDL.Nat,
    'total_rewards' : IDL.Nat,
    'fee_recipient' : IDL.Principal,
    'total_staked' : IDL.Nat,
    'lock_time' : IDL.Nat64,
  });
  return IDL.Service({
    'balanceOf' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'changeOwner' : IDL.Func([IDL.Principal], [], ['query']),
    'claimRewards' : IDL.Func([], [Result], []),
    'depositRewards' : IDL.Func(
        [IDL.Nat, IDL.Opt(IDL.Vec(IDL.Nat8))],
        [Result],
        [],
      ),
    'getMetadata' : IDL.Func([], [Metadata], ['query']),
    'pendingRewards' : IDL.Func([], [IDL.Nat], ['query']),
    'setFeeRecipient' : IDL.Func([IDL.Principal], [], ['query']),
    'setLeaveEarlyFee' : IDL.Func([IDL.Nat], [], ['query']),
    'setLockTime' : IDL.Func([IDL.Nat64], [], ['query']),
    'stake' : IDL.Func([IDL.Nat, IDL.Opt(IDL.Vec(IDL.Nat8))], [Result], []),
    'totalRewards' : IDL.Func([], [IDL.Nat], ['query']),
    'totalSupply' : IDL.Func([], [IDL.Nat], ['query']),
    'withdraw' : IDL.Func([IDL.Nat], [Result], []),
  });
};
export const init = ({ IDL }) => {
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const InitArgs = IDL.Record({
    'reward' : Account,
    'token' : Account,
    'leave_early_fee' : IDL.Nat,
    'fee_recipient' : Account,
    'lock_time' : IDL.Nat64,
  });
  return [InitArgs];
};
