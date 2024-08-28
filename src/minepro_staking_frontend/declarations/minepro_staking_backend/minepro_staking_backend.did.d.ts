import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Account {
  'owner' : Principal,
  'subaccount' : [] | [Uint8Array | number[]],
}
export interface InitArgs {
  'reward' : Account,
  'token' : Account,
  'leave_early_fee' : bigint,
  'fee_recipient' : Account,
  'lock_time' : bigint,
}
export interface Metadata {
  'reward' : Principal,
  'token' : Principal,
  'leave_early_fee' : bigint,
  'fee_recipient' : Principal,
  'lock_time' : bigint,
}
export type Result = { 'Ok' : null } |
  { 'Err' : StakingError };
export type StakingError = { 'NothingToClaim' : null } |
  { 'NoShare' : null } |
  { 'Busy' : null } |
  { 'ZeroAmount' : null } |
  { 'InsufficientBalance' : null } |
  { 'RaceCondition' : null } |
  { 'TransferTokenFailed' : null } |
  { 'UserDoesNotExist' : null };
export interface _SERVICE {
  'balanceOf' : ActorMethod<[Principal], bigint>,
  'claimRewards' : ActorMethod<[], Result>,
  'depositRewards' : ActorMethod<
    [bigint, [] | [Uint8Array | number[]]],
    Result
  >,
  'getMetadata' : ActorMethod<[], Metadata>,
  'pendingRewards' : ActorMethod<[], bigint>,
  'stake' : ActorMethod<[bigint, [] | [Uint8Array | number[]]], Result>,
  'totalRewards' : ActorMethod<[], bigint>,
  'totalSupply' : ActorMethod<[], bigint>,
  'withdraw' : ActorMethod<[bigint], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
