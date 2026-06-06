import {
  isConnected,
  getPublicKey,
  signTransaction,
  setAllowed,
} from "@stellar/freighter-api";
import {
  TransactionBuilder,
  Networks,
  SorobanRpc,
  Transaction,
} from "@stellar/stellar-sdk";

export function getNetworkConfig() {
  return {
    rpcUrl:
      process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org",
    networkPassphrase:
      process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET,
    horizonUrl:
      process.env.NEXT_PUBLIC_HORIZON_URL ||
      "https://horizon-testnet.stellar.org",
  };
}

export async function getFreighterPublicKey(): Promise<string> {
  const connected = await isConnected();
  if (!connected) {
    throw new Error(
      "Freighter is not connected. Please install the extension.",
    );
  }

  await setAllowed();
  const publicKey = await getPublicKey();
  return publicKey;
}

export async function signAndSubmitTransaction(
  xdr: string,
): Promise<SorobanRpc.Api.GetTransactionResponse> {
  const signedXdr = await signTransaction(xdr, {
    network: "TESTNET",
    networkPassphrase: getNetworkConfig().networkPassphrase,
  });

  const server = new SorobanRpc.Server(getNetworkConfig().rpcUrl);

  const tx = TransactionBuilder.fromXDR(
    signedXdr,
    getNetworkConfig().networkPassphrase,
  ) as Transaction;

  const sendResponse = await server.sendTransaction(tx);

  if (sendResponse.status === "ERROR") {
    throw new Error(
      `Transaction submitted with error: ${sendResponse.errorResult?.toXDR("base64") || ""}`,
    );
  }

  let getResponse = await server.getTransaction(sendResponse.hash);
  while (getResponse.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResponse = await server.getTransaction(sendResponse.hash);
  }

  if (getResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error(`Transaction failed`);
  }

  return getResponse;
}

export async function fundWithFriendbot(publicKey: string): Promise<void> {
  const response = await fetch(
    `https://friendbot.stellar.org?addr=${publicKey}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fund account with Friendbot");
  }
}
