import { useEffect, useState } from 'react';
import { minepro_staking_backend, createActor as createBackendActor } from '../declarations/minepro_staking_backend';
import { _SERVICE as _BACKEND_SERVICE, Metadata } from '../declarations/minepro_staking_backend/minepro_staking_backend.did';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, ActorSubclass, HttpAgent, Identity } from '@dfinity/agent';
import { token as defaultTokenClient, createActor as createTokenActor } from '../declarations/icrc1_token/';
import { _SERVICE as _ICRC1_TOKEN_SERVICE } from '../declarations/icrc1_token/token.did';

interface Actors {
  backend: ActorSubclass<_BACKEND_SERVICE> | undefined
  token: ActorSubclass<_ICRC1_TOKEN_SERVICE> | undefined
  reward: ActorSubclass<_ICRC1_TOKEN_SERVICE> | undefined
}

function App() {
  const [actors, setActors] = useState<Actors>({backend: undefined, token: undefined, reward: undefined});
  
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [metadata, setMetadata] = useState<Metadata>({
    token: Principal.fromText("mwrwg-4yaaa-aaaap-qhswq-cai"),
    reward: Principal.fromText("mwrwg-4yaaa-aaaap-qhswq-cai"),
    fee_recipient: Principal.fromText("mwrwg-4yaaa-aaaap-qhswq-cai"),
    leave_early_fee: BigInt(0),
    lock_time: BigInt(0)
  });

  async function createAuthClient() {
    const authClient = await AuthClient.create();

    if (await authClient.isAuthenticated())
      return authClient;

    await new Promise((resolve, reject) => {
      authClient.login({
        identityProvider: "https://identity.internetcomputer.org",
        onSuccess: resolve,
        onError: reject,
      })
    });

    return authClient;
  }

  async function handleConnect() {
  }

  async function fetchTokenInformation(principal: Principal) {
    
  }

  async function tryAuth() {
    const authClient = await AuthClient.create()
    
    if (!(await authClient.isAuthenticated()))
      return undefined;

    return authClient;
  }

  async function setupActors() {
    
  }

  useEffect(() => {
    minepro_staking_backend.getMetadata().then((mt) => {
      setMetadata(mt);
    });
    
    tryAuth().then((authClient) => {
      if (authClient === undefined)
        return;

      
    });

  }, []);

  return (
    <main>
      <button onClick={handleConnect}>Connect with Internet Identity</button>
      <br />
      <label htmlFor="name">Enter amount to stake: &nbsp;</label>
      <input id="stake" alt="Stake" type="number" onChange={(e) => setStakeAmount(e.target.value)} />
      <button onClick={() => {}}>Stake</button>
      <section id="metadata">{
        metadata && metadata.token.toString()
      }</section>
    </main>
  );
}

export default App;
