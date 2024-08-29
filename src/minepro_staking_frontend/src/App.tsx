import { useEffect, useState } from "react";
import {
  minepro_staking_backend,
  createActor as createBackendActor,
} from "../declarations/minepro_staking_backend";
import {
  _SERVICE as _BACKEND_SERVICE,
  Metadata,
  Result,
} from "../declarations/minepro_staking_backend/minepro_staking_backend.did";
import { Principal } from "@dfinity/principal";
import { AuthClient } from "@dfinity/auth-client";
import { Actor, ActorSubclass, HttpAgent, Identity } from "@dfinity/agent";
import {
  token as defaultTokenClient,
  createActor as createTokenActor,
} from "../declarations/icrc1_token/";
import { _SERVICE as _ICRC1_TOKEN_SERVICE } from "../declarations/icrc1_token/token.did";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";

interface UserInfo {
  balance: bigint;
  reward: bigint;
}

function App() {
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);

  const [metadata, setMetadata] = useState<Metadata | undefined>(undefined);
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);

  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferTokenPrincipal, setTransferTokenPrincipal] = useState("");
  const [transferTokenTo, setTransferTokenTo] = useState("");

  const [activeTab, setActiveTab] = useState<"stake" | "withdraw">("stake");

  async function handleConnect() {
    const authClient = await AuthClient.create();

    if (await authClient.isAuthenticated()) {
      setIdentity(authClient.getIdentity());
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        authClient.login({
          identityProvider: "https://identity.internetcomputer.org",
          onSuccess: resolve,
          onError: reject,
        });
      });
    } catch (e) {
      console.error(e);
      window.alert("Login failed");
      return;
    }

    if (await authClient.isAuthenticated()) {
      setIdentity(authClient.getIdentity());
      return;
    }

    window.alert("Login failed");
  }

  async function tryAuth() {
    const authClient = await AuthClient.create();

    if (!(await authClient.isAuthenticated())) return undefined;

    return authClient;
  }

  useEffect(() => {
    const backendActor = createBackendActor(
      process.env.CANISTER_ID_MINEPRO_STAKING_BACKEND!
    );

    backendActor.getMetadata().then((mt) => {
      setMetadata(mt);
    });

    tryAuth().then((authClient) => {
      if (authClient === undefined) return;

      setIdentity(authClient.getIdentity());
    });
  }, []);

  async function fetchUserInfo() {
    const agent = await HttpAgent.create({ identity });
    const backendActor = createBackendActor(
      process.env.CANISTER_ID_MINEPRO_STAKING_BACKEND!,
      { agent }
    );

    setUserInfo({
      balance: await backendActor.balanceOf(identity!.getPrincipal()),
      reward: await backendActor.pendingRewards(),
    });
  }

  async function handleStake() {
    if (identity === undefined) {
      window.alert("You need to login first");
      return;
    }

    if (metadata === undefined) {
      return;
    }

    console.log("BLAHHH");

    const amount = BigInt(stakeAmount);

    const agent = await HttpAgent.create({ identity });
    const stakedTokenActor = createTokenActor(metadata!.token, { agent });
    const stakedTokenFee = await stakedTokenActor.icrc1_fee();

    try {
      const approveRes = await stakedTokenActor.icrc2_approve({
        spender: {
          owner: Principal.fromText(
            process.env.CANISTER_ID_MINEPRO_STAKING_BACKEND!
          ),
          subaccount: [],
        },
        amount: amount + stakedTokenFee,
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        expected_allowance: [],
        expires_at: [],
      });

      if (approveRes.Err) {
        window.alert("Approve token failed");
        return;
      }
    } catch (e) {
      window.alert("Approve token failed");
      return;
    }

    const backendActor = createBackendActor(
      process.env.CANISTER_ID_MINEPRO_STAKING_BACKEND!,
      { agent }
    );

    try {
      const res: Result = await backendActor.stake(amount, []);

      if (res.Err) {
        window.alert("Stake failed, reason: " + Object.keys(res.Err)[0]);
        return;
      }
    } catch (e) {
      window.alert("Stake failed");
      return;
    }

    window.alert("Stake success");
    fetchUserInfo();
  }

  async function handleWithdraw() {
    const amount = BigInt(withdrawAmount);

    const agent = await HttpAgent.create({ identity });
    const backendActor = createBackendActor(
      process.env.CANISTER_ID_MINEPRO_STAKING_BACKEND!,
      { agent }
    );

    try {
      const res: Result = await backendActor.withdraw(amount);

      if (res.Err) {
        window.alert("Withdraw failed, reason: " + Object.keys(res.Err)[0]);
        return;
      }
    } catch (e) {
      console.log(e);
      window.alert("Withdraw failed");
      return;
    }

    window.alert("Withdraw success");
    fetchUserInfo();
  }

  async function handleClaimRewards() {
    const agent = await HttpAgent.create({ identity });
    const backendActor = createBackendActor(
      process.env.CANISTER_ID_MINEPRO_STAKING_BACKEND!,
      { agent }
    );

    try {
      const res: Result = await backendActor.claimRewards();

      if (res.Err) {
        window.alert(
          "Claim rewards failed, reason: " + Object.keys(res.Err)[0]
        );
        return;
      }
    } catch (e) {
      console.log(e);
      window.alert("Claim rewards failed");
      return;
    }

    window.alert("Claimed rewards success");
    fetchUserInfo();
  }

  async function handleTransfer() {
    const agent = await HttpAgent.create({ identity });
    const tokenActor = createTokenActor(transferTokenPrincipal, { agent });

    try {
      const res = await tokenActor.icrc1_transfer({
        to: {
          owner: Principal.fromText(transferTokenTo),
          subaccount: [],
        },
        amount: BigInt(transferAmount),
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
      });

      if (res.Err) {
        console.log(res.Err);
        window.alert("Transfer token failed");
        return;
      }

      window.alert("Transfer token success");
    } catch (e) {
      console.log(e);
      window.alert("Transfer token failed");
    }
  }

  useEffect(() => {
    if (identity === undefined) return;

    fetchUserInfo();
  }, [identity]);

  return (
    <main>
      <div className="flex justify-center w-full">
        <Navigation
          identity={identity && identity.getPrincipal().toString()}
          loginCallback={handleConnect}
        />
      </div>

      {/* main content */}
      <div className="relative overflow-hidden flex flex-col items-center">
        <div className="homeBackground"></div>
        {/* top section - hero text and presale card */}
        <section className="lg:mt-28 max-w-[1400px] mx-auto relative pt-10 pb-20">
          {/* <div className="heroSectionBG"></div> top radial gradient */}
          <div className="heroSectionBG2"></div> {/* grid lines */}
          {/* content container */}
          <div className="flex flex-col lg:flex-row justify-center px-8 lg:px-16 md:gap-6 2xl:gap-20 items-center">
            {/* lefthand content - logo, title, description */}

            <div className="w-full h-[360px] sm:h-[320px] lg:h-full relative flex items-center">
              <div className="mr-4 lg:ml-4 xl:ml-8 lg:mr-0 mb-8 flex flex-col sm:items-center sm:w-full lg:w-auto lg:items-start">
                {/* minpro tag - centered */}
                <div className="mineproTag">
                  <img src="/logo-white.svg" alt="minepro logo" />
                  <p>MinePro</p>
                </div>
                {/* <MineProTag /> */}
                <div className="mt-4 ">
                  <h1
                    className={`text-left sm:text-center lg:text-left grayTextGradient max-w-xl lg:max-w-[500px] text-[32px] sm:text-[48px] lg:text-[64px] 2xl:text-[80px]`}
                  >
                    Stake MinePro on ICP
                  </h1>
                  <p className="text-left sm:text-center lg:text-left mt-5 max-w-[400px] text-white/60 text-[16px] sm:text-[18px] 2xl:text-[20px]">
                    MinePro is an innovative tokenized Bitcoin mining project
                    which pays investors 10-20% monthly profit in Bitcoin just
                    for staking our native token, $MINE.
                  </p>
                </div>
              </div>
              {/* <div className="absolute inset-0">
            </div> */}
            </div>

            {/* righthand content - presale card */}
            <div className="lg:mr-4 flex justify-center relative">
              {/* <div className="publicSaleSectionBG sm:top-[120px]"></div> */}
              <div className="">
                <div className="glassCard">
                  {/* tabs to toggle between staking and withdrawing */}
                  <div className="tabs">
                    <button
                      className="tab"
                      onClick={() => setActiveTab("stake")}
                    >
                      Stake
                    </button>
                    <button
                      className="tab"
                      onClick={() => setActiveTab("withdraw")}
                    >
                      Withdraw
                    </button>
                  </div>

                  {/* amount to stake or withdraw */}
                  {activeTab === "stake" ? (
                    <div className="enterAmount">
                      <label htmlFor="stake">
                        Enter amount to stake: &nbsp;
                      </label>
                      <div className="enterAmountRow">
                        <input
                          id="stake"
                          alt="Stake"
                          type="number"
                          onChange={(e) => setStakeAmount(e.target.value)}
                        />
                        <button onClick={() => handleStake()}>Stake</button>
                      </div>
                    </div>
                  ) : (
                    <div className="enterAmount">
                      <label htmlFor="withdraw">
                        Enter amount to withdraw: &nbsp;
                      </label>
                      <div className="enterAmountRow">
                        <input
                          id="withdraw"
                          alt="Withdraw"
                          type="number"
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                        />
                        <button onClick={() => handleWithdraw()}>
                          Withdraw
                        </button>
                      </div>
                    </div>
                  )}

                  <hr />

                  <section id="metadata">
                    {metadata && (
                      <>
                        <p>Stake Token: {metadata.token.toString()}</p>
                        <p>Reward Token: {metadata.reward.toString()}</p>
                        <p>Lock Time: {metadata.lock_time.toString()}</p>
                        <p>
                          Leave Early Fee: {metadata.leave_early_fee.toString()}
                        </p>
                      </>
                    )}
                  </section>

                  <section id="userinfo">
                    {userInfo && (
                      <>
                        <p>Staked Amount: {userInfo.balance.toString()}</p>
                        <p>Rewards to claim: {userInfo.reward.toString()}</p>
                      </>
                    )}
                  </section>

                  <button className="tab" onClick={() => handleClaimRewards()}>
                    Claim Rewards
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}

export default App;
