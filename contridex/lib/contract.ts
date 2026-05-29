import {
  Address,
  nativeToScVal,
  Account,
  SorobanRpc,
  Contract,
  TransactionBuilder,
  scValToNative,
} from "@stellar/stellar-sdk";
import { getNetworkConfig, signAndSubmitTransaction } from "./stellar";

export const getContractId = () => {
  return process.env.NEXT_PUBLIC_CONTRACT_ID || "";
};

const getServer = () => {
  return new SorobanRpc.Server(getNetworkConfig().rpcUrl);
};

export async function getCampaignState() {
  const server = getServer();
  const contractId = getContractId();
  if (!contractId) {
    throw new Error("Contract ID not set");
  }
  const contract = new Contract(contractId);

  const op = contract.call("get_state");

  // Using a dummy source account just for simulation purposes
  const sourceAccount = new Account(
    Address.fromString(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    ).toString(),
    "0",
  );

  let tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: getNetworkConfig().networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  if (!simResult.result || !simResult.result.retval) {
    throw new Error("Simulation did not return a value");
  }

  const result = scValToNative(simResult.result.retval);
  return {
    goal: BigInt(result[0]),
    totalFunded: BigInt(result[1]),
    deadline: Number(result[2]),
    claimed: Boolean(result[3]),
  };
}

export async function contribute(publicKey: string, amount: string) {
  const server = getServer();
  const contract = new Contract(getContractId());
  // Convert to stroops (1 XLM = 10,000,000 stroops)
  const amountVal = (BigInt(amount) * 10_000_000n).toString();
  const op = contract.call(
    "contribute",
    ...[
      new Address(publicKey).toScVal(),
      nativeToScVal(BigInt(amountVal), { type: "i128" }),
    ],
  );

  const accountResponse = await server.getAccount(publicKey);
  const sourceAccount = new Account(publicKey, accountResponse.sequence);

  let tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: getNetworkConfig().networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  tx = SorobanRpc.assembleTransaction(tx, simResult).build();

  return await signAndSubmitTransaction(tx.toXDR());
}

export async function claimFunds(publicKey: string) {
  const server = getServer();
  const contract = new Contract(getContractId());
  const op = contract.call("claim");

  const accountResponse = await server.getAccount(publicKey);
  const sourceAccount = new Account(publicKey, accountResponse.sequence);

  let tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: getNetworkConfig().networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  tx = SorobanRpc.assembleTransaction(tx, simResult).build();

  return await signAndSubmitTransaction(tx.toXDR());
}

export async function withdrawFunds(publicKey: string) {
  const server = getServer();
  const contract = new Contract(getContractId());
  const op = contract.call("withdraw", ...[new Address(publicKey).toScVal()]);

  const accountResponse = await server.getAccount(publicKey);
  const sourceAccount = new Account(publicKey, accountResponse.sequence);

  let tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: getNetworkConfig().networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  tx = SorobanRpc.assembleTransaction(tx, simResult).build();

  return await signAndSubmitTransaction(tx.toXDR());
}
