import { FC } from 'react';
import CountUp from 'react-countup';

interface UserInfoProps {
  tokenBalance: string,
  totalStaked: string,
  stakedBalance: string,
  totalBNBRewards: string,
  tokenName: string
}

const UserInfo: FC<UserInfoProps> = ({ 
  tokenBalance, 
  totalStaked, 
  stakedBalance, 
  totalBNBRewards,
  tokenName
} : UserInfoProps) => {

  return (
    <div className="grid grid-row-2 gap-2">
      <div className="flex justify-between gap-2">
      <div>
        <div className="text-left">
            Wallet Balance
          </div>
          <div className="text-left font-bold text-lg">
            <CountUp end={
              Number(tokenBalance || '0')
              } decimals={2} separator="," />&nbsp;{tokenName}
          </div>
        </div>
        <div>
          <div className="text-right">
            Total Staked
          </div>
          <div className="text-right font-bold text-lg">
            <CountUp end={Number(totalStaked) || 0} decimals={0} separator="," /> {tokenName}
            
          </div>
        </div>
        
      </div>
      <div className="flex justify-between">
        <div>
          <div className="text-left">
            Your Staked Balance

          </div>
          <div className="text-left font-bold text-lg">
            <CountUp end={Number(stakedBalance) || 0} decimals={2} separator="," />&nbsp;{tokenName}
          </div>
        </div>
        <div>
          <div className="text-right">
            Total Rewards
          </div>
          <div className="text-right font-bold text-lg">
            <CountUp end={Number(totalBNBRewards) || 0} decimals={2} /> BNB
          </div>
        </div>
      </div>
      {/* <div className="flex justify-between">
        <div>
          <div className="text-left">
            Leave Early Fee
          </div>
          <div className="text-left font-bold text-lg">
            <CountUp end={Number(leaveEarlyFee) || 0} decimals={0} separator="," suffix='%' />
          </div>
        </div>
        <div>
          <div className="text-right">
            APY
          </div>
          <div className="text-right font-bold text-lg">
            <CountUp end={Number(apy) || 0} decimals={0} separator="," suffix='%' />
          </div>
        </div>
      </div> */}
    </div>
  )
}

export default UserInfo;