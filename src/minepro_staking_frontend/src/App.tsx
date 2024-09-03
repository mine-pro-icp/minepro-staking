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
import UserInfo from "./components/UserInfo";
import UnlockTime from "./components/UnlockTime";
import { Toaster, toast } from "sonner";
import Approve from "./components/helpers/Approve";

type StakingListItem = {
  shortName: string;
  apy: string;
  pool: Contract;
  token: Contract;
  name: string;
  reward: string;
  depositFunction: string;
  poolImg: StaticImageData;
  primaryBtn?: Button;
  secondaryBtn?: Button;
  showClaimBtn: boolean;
  pendingRewardsFunction?: string;
  hasUnlockTime: boolean;
  unlockTimeFunction?: string;
  lockTimeFunction?: string;
  isYieldFarm: boolean;
};

const stakingListItem: StakingListItem = {
  shortName: "MINE",
  apy: "10-20%",
  pool: minepro_staking_backend,
  token: defaultTokenClient,
  name: "MINE",
  reward: "BNB",
  depositFunction: "stake",
  poolImg: "/minepro.png",
  showClaimBtn: true,
  hasUnlockTime: true,
  isYieldFarm: false,
};

const stakedAssetName = "$MINE";
const rewardTokenName = "BTC";
const tabs = ["Deposit", "Withdraw", "Transfer"];

interface Period {
  period: string;
  multiplier: number;
  earlyUnstakeFee: number;
}
const periods: Period[] = [
  {
    period: "30 Days",
    multiplier: 1,
    earlyUnstakeFee: 0.1,
  },
  {
    period: "90 Days",
    multiplier: 2,
    earlyUnstakeFee: 0.15,
  },
  {
    period: "180 Days",
    multiplier: 5,
    earlyUnstakeFee: 0.2,
  },
  {
    period: "1 Year",
    multiplier: 10,
    earlyUnstakeFee: 0.3,
  },
  {
    period: "2 Years",
    multiplier: 20,
    earlyUnstakeFee: 0.5,
  },
  {
    period: "5 Years",
    multiplier: 50,
    earlyUnstakeFee: 0.7,
  },
];

interface Token {
  name: string;
  address: string;
}

const tokens: Token[] = [
  {
    name: "MINE",
    address: "0xf82007D28B8D0EaFC6Fde42eCb697A74824D839E",
  },
  {
    name: "BNB",
    address: "0x......",
  },
];

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
  const [transferTokenToValid, setTransferTokenToValid] = useState(false);

  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [pendingRewards, setPendingRewards] = useState<string>("0");
  const [insufficientAllowance, setInsufficentAllowance] =
    useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<
    "deposit" | "withdraw" | "transfer"
  >("deposit");
  const [secsToUnlock, setSecsToUnlock] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[0]);

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
      process.env.CANISTER_ID_MINEPRO_STAKING_BACKEND_30!
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

  // useEffect(() => {
  //   if (timeLeft !== undefined && timeLeft !== null) {
  //     setSecsToUnlock(Number(timeLeft.toString()));
  //   }
  //   queryClient.invalidateQueries({ queryKey: timeLeftquery });
  // }, [blockNumber]);

  const earlyWithdrawText = (): string => {
    if (secsToUnlock == undefined || secsToUnlock == null) {
      return "Checking Lock Time";
    }
    return secsToUnlock > 0 ? "Early Withdraw (15% Fee)" : "Withdraw";
  };

  const maxDeposit = () => {
    setStakeAmount(tokenBalance);
  };

  const updateTransferToken = (e: any) => {
    // if e is a valid address, set transferTokenTo to e
    setTransferTokenToValid(true);
    setTransferTokenTo(e.target.value);
  };

  return (
    <main>
      <Toaster />
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
          <div className="flex flex-col lg:flex-row justify-center px-4 sm:px-8 lg:px-16 md:gap-6 2xl:gap-20 items-center">
            {/* lefthand content - logo, title, description */}

            <div className="w-full h-[320px] lg:h-full relative flex items-center">
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

              <div className="glassCard p-4 min-h-[540px] flex flex-col">
                <div className="flex flex-col justify-center w-full max-w-2xl mx-auto  rounded-2xl">
                  {/* tabs */}
                  <div className="mx-auto mb-4 tabs grid w-full grid-cols-2">
                    {tabs.map((tab) => (
                      <button
                        className={`tab ${
                          activeTab === tab.toLowerCase() ? "text-white" : ""
                        }`}
                        onClick={() => setActiveTab(tab.toLowerCase() as any)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* user info grid - show on deposit and withdraw */}
                {(activeTab === "deposit" || activeTab === "withdraw") && (
                  <UserInfo
                    stakedBalance={"100"}
                    totalStaked={"100"}
                    tokenBalance={"100"}
                    totalBNBRewards={"100"}
                    tokenName={"100"}
                    // stakedBalance={stakedBalance}
                    // totalStaked={totalStaked}
                    // tokenBalance={tokenBalance}
                    // totalBNBRewards={bnbRewards}
                    // tokenName={stakingListItem.reward}
                  />
                )}

                {/* deposit/withdrawal component */}
                <div className="mt-auto">
                  {(activeTab === "deposit" || activeTab === "withdraw") && (
                    // <Deposit
                    //   tokenBalance={tokenBalance}
                    //   stakingListItem={stakingListItem}
                    //   pendingRewards={pendingRewards}
                    //   rewardTokenName={selectedToken?.name}
                    // />
                    <div>
                      <p className="mt-4 text-left">
                        Select period to {activeTab}:{" "}
                      </p>
                      <select
                        name=""
                        id=""
                        onChange={(e) => {
                          setSelectedPeriod(
                            periods.find((p) => p.period === e.target.value) ||
                              periods[0]
                          );
                        }}
                        className="mt-1 border border-white/50 rounded-lg bg-transparent w-full p-2"
                      >
                        {periods.map((period) => (
                          <option key={period.period} value={period.period}>
                            {period.period}
                          </option>
                        ))}
                      </select>
                      {/* info about this period */}
                      <div className="mt-2">
                        <p className="text-center italic">
                          {selectedPeriod.multiplier}x multiplier,{" "}
                          {selectedPeriod.earlyUnstakeFee * 100}% unstake early
                          fee
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "deposit" && (
                    <>
                      <div className="mt-4 grid grid-flow-row gap-2">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="col-span-1">
                            <label className="label">
                              <span className="text-sm">
                                Balance:{" "}
                                {parseFloat(
                                  tokenBalance?.toString()
                                ).toLocaleString([], {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })}
                                {stakingListItem.isYieldFarm &&
                                  parseFloat(tokenBalance?.toString()) <= 0 && (
                                    <a
                                      href={
                                        "https://pancakeswap.finance/v2/add/BNB/0xf82007D28B8D0EaFC6Fde42eCb697A74824D839E"
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="ml-2 text-xs text-red-400 underline"
                                    >
                                      Get LP Tokens
                                    </a>
                                  )}
                              </span>
                              {stakingListItem.hasUnlockTime && (
                                <span className="label-text-alt">
                                  {/* <LockTime 
                                      stakingListItem={stakingListItem}
                                      chain={chain}
                                    /> */}
                                </span>
                              )}
                            </label>
                            <div className="relative rounded-sm shadow-sm">
                              {/* <div className="absolute inset-y-0 left-2 gap-3 flex items-center">
                                <img
                                  src={stakingListItem.poolImg}
                                  height={25}
                                  width={25}
                                  alt="token icon"
                                />
                              </div> */}
                              <input
                                id="stake"
                                alt="Stake"
                                type="number"
                                className="input input-bordered w-full"
                                value={stakeAmount}
                                // onChange={handleChangeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                                placeholder="Enter amount..."
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center">
                                <div
                                  className="badge badge-primary py-2 rounded-sm mr-4 cursor-pointer text-sm"
                                  onClick={maxDeposit}
                                >
                                  MAX
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-1">
                            {insufficientAllowance ? (
                              <Approve
                                token={stakingListItem.token[56]}
                                spender={stakingListItem.pool[56]}
                              />
                            ) : (
                              <div className="flex flex-col w-full gap-2 mt-2 sm:flex-row justify-evenly items-center">
                                <button
                                  className={`orangeButton w-full bg-[#17181c]`}
                                  onClick={() => handleStake()}
                                  // onClick={() =>
                                  //   depositCall({
                                  //     abi: stakingListItem.pool.abi,
                                  //     address:
                                  //       stakingListItem.pool[56]?.address ||
                                  //       zeroAddress,
                                  //     functionName:
                                  //       stakingListItem.depositFunction,
                                  //     args: [parseEther(amount || "0")],
                                  //   })
                                  // }
                                  //disabled={!depositCall}
                                >
                                  Deposit
                                </button>

                                {/* <button
                className={`btn btn-block bg-[#17181c] btn-primary mb-2 mt-1 ${
                  depositFetchStatus === "fetching" ? "loading" : ""
                }`}
                onClick={() =>
                  depositCall({
                    abi: stakingListItem.pool.abi,
                    address: stakingListItem.pool[56]?.address || zeroAddress,
                    functionName: stakingListItem.depositFunction,
                    args: [parseEther(amount || "0")],
                  })
                }
                disabled={!depositCall}
              >
                Deposit
              </button> */}
                                {/* <button
                className={`btn btn-block bg-[#17181c] btn-primary ${
                  claimFetchStatus === "fetching" ? "loading" : ""
                }`}
                onClick={() =>
                  claimCall({
                    abi: stakingListItem.pool.abi,
                    address: stakingListItem.pool[56]?.address || zeroAddress,
                    functionName: "claimRewards",
                    args: [BigInt(1)],
                  })
                }
                disabled={!claimCall}
              >
                Claim {parseFloat(pendingRewards || "0").toFixed(3)}{" "}
                {rewardTokenName}
              </button> */}
                              </div>
                            )}
                          </div>
                          <div className="mt-4 w-full flex justify-center">
                            <p className="italic max-w-[240px]">
                              Withdraw Timer Resets With Each Deposit
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {activeTab === "withdraw" && (
                    // <Withdraw
                    //   withdrawableBalance={stakedBalance}
                    //   stakingListItem={stakingListItem}
                    // />
                    <div className="mt-4 grid grid-flow-row gap-2">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="col-span-1">
                          <label className="label">
                            <div></div>
                            {stakingListItem.hasUnlockTime && (
                              <span className="label-text-alt">
                                <UnlockTime secsToUnlock={secsToUnlock} />
                              </span>
                            )}
                          </label>

                          <div className="mt-1 col-span-1">
                            <label className="label">
                              {/* <span className="label-text">
                                Balance:{" "}
                                {parseFloat(
                                  withdrawableBalance || "0"
                                ).toLocaleString([], {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })}
                              </span> */}
                              {stakingListItem.hasUnlockTime && (
                                <span className="label-text-alt">
                                  {/* <LockTime 
                                  stakingListItem={stakingListItem}
                                  chain={chain}
                                /> */}
                                </span>
                              )}
                            </label>
                            <div className="relative rounded-sm shadow-sm">
                              {/* <div className="absolute inset-y-0 ml-3 flex items-center">
                                <img
                                  src={stakingListItem.poolImg}
                                  height={25}
                                  width={25}
                                  alt={stakingListItem.name}
                                />
                              </div> */}
                              <input
                                value={withdrawAmount}
                                //onChange={handleChangeAmount}
                                onChange={(e) =>
                                  setWithdrawAmount(e.target.value)
                                }
                                className="input input-bordered w-full"
                                placeholder="Enter amount..."
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center">
                                <div
                                  className="badge badge-primary py-2 rounded-sm mr-4 cursor-pointer text-sm"
                                  onClick={maxDeposit}
                                >
                                  MAX
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-1">
                          <button
                            className={`mt-4 orangeButton w-full bg-[#17181c]`}
                            onClick={() => handleWithdraw()}
                            // onClick={() =>
                            //   withdrawCall({
                            //     abi: stakingListItem.pool.abi,
                            //     address:
                            //       stakingListItem.pool[56]?.address ||
                            //       zeroAddress,
                            //     functionName: "withdraw",
                            //     args: [parseEther(amount || "0")],
                            //   })
                            // }
                          >
                            {earlyWithdrawText()}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === "transfer" && (
                    <div className="mt-4 grid grid-flow-row gap-2">
                      <div className="grid grid-cols-1 gap-2">
                        {/* transfer from (principal) */}
                        <div className="col-span-1">
                          <p className="mt-4 text-left">Token to Transfer</p>
                          <select
                            name=""
                            id=""
                            onChange={(e) => {
                              setTransferTokenPrincipal(
                                tokens.find((t) => t.name === e.target.value)
                                  ?.address || ""
                              );
                            }}
                            className="mt-1 border border-white/50 rounded-lg bg-transparent w-full p-2"
                          >
                            {tokens.map((token) => (
                              <option key={token.name} value={token.name}>
                                {token.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* transfer to */}
                        <div className="col-span-1">
                          <p className="mt-4 text-left">
                            Transfer Destination Address
                          </p>
                          <input
                            value={transferTokenTo}
                            onChange={updateTransferToken}
                            className="mt-1 input input-bordered w-full"
                            placeholder="Enter address..."
                          />
                        </div>

                        {/* transfer amount */}
                        <div className="col-span-1">
                          <p className="mt-4 text-left">Amount to Transfer</p>
                          <input
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            className="mt-1 input input-bordered w-full"
                            placeholder="Enter amount..."
                          />
                        </div>

                        {/* info about transfer */}
                        <div className="col-span-1">
                          {transferTokenToValid ? (
                            <p className="mt-2 text-center italic">
                              You're transferring {transferAmount} from{" "}
                              {transferTokenPrincipal} to {transferTokenTo}
                            </p>
                          ) : (
                            <p className="mt-2 text-center italic">
                              Please enter a valid transfer address
                            </p>
                          )}
                        </div>

                        {/* transfer button */}
                        <div className="col-span-1">
                          <button
                            className={`mt-2 orangeButton w-full bg-[#17181c]`}
                            onClick={() => handleTransfer()}
                          >
                            Transfer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* claim rewards button */}
                {pendingRewards && (
                  <div className="mt-4">
                    <p className="text-left mb-1">Claim Rewards: </p>
                    {parseFloat(pendingRewards) > 0 ? (
                      <button
                        className={`orangeButton w-full bg-[#17181c]`}
                        onClick={() => handleClaimRewards()}
                        // onClick={() =>
                        //   claimCall({
                        //     abi: stakingListItem.pool.abi,
                        //     address:
                        //       stakingListItem.pool[56]?.address ||
                        //       zeroAddress,
                        //     functionName: "claimRewards",
                        //     args: [BigInt(1)],
                        //   })
                        // }
                        //disabled={!claimCall}
                      >
                        Claim {parseFloat(pendingRewards || "0").toFixed(3)}{" "}
                        {rewardTokenName}
                      </button>
                    ) : (
                      <p className="text-left text-[14px]">
                        You have no rewards to claim at this time.{" "}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* amount to stake or withdraw 
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

                  
                </div>
              </div>
            </div> */}
          </div>
        </section>
      </div>

      {/* GIANGS METADATA CODE */}
      <section className="bg-red-300 text-black ">
        <h4>DEV:</h4>
        <section id="metadata">
          {metadata && (
            <>
              <p>Stake Token: {metadata.token.toString()}</p>
              <p>Reward Token: {metadata.reward.toString()}</p>
              <p>Lock Time: {metadata.lock_time.toString()}</p>
              <p>Leave Early Fee: {metadata.leave_early_fee.toString()}</p>
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
      </section>

      <Footer />
    </main>
  );
}

export default App;
