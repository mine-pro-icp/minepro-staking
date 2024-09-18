import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi, maxUint256 } from "viem";
import { toast } from "sonner";
import { useTransactionToast } from "./useTransactionToast";

const Approve = ({ spender, token } : { spender: any; token: any }) => {
  
  const { 
    writeContract,
    data: txHash
  } = useWriteContract();

    // batch write checks native
    const {
      writeContract: batchWriteChecksByGroupNative,
      error: approveError,
      data: approveHash,
    } = useWriteContract();
  
    // Get the status receipt for transaction for more precise loading and success toasts
    const {
      status: approveStauts,
      fetchStatus: approveFetchStatus,
    } = useWaitForTransactionReceipt({
      hash: approveHash,
    });

    useTransactionToast({
      txFetchStatus: approveFetchStatus,
      txStatus: approveStauts,
      txHash: approveHash,
      loading: "Approving...",
      success: "Approve Successful!",
      error: "Approval Error",
    });

  return (
    <button 
      className={`btn btn-block btn-primary mt-2 ${approveFetchStatus === "fetching" ? 'loading' : ''}`}
      onClick={() => writeContract({
        abi: erc20Abi,
        address: token?.address,
        functionName: 'approve',
        args: [spender?.address, maxUint256]
      }, {
        onSettled(data, error) {
          if (error) {
            toast.error('Approval failed');
          } else if (data) {
            toast.success('Approval successful');
          }
        }
      })
      }
    >
      Approve
    </button>
  )
}

export default Approve;