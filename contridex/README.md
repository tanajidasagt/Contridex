# StellarCrowd - Decentralized Crowdfunding on Stellar

StellarCrowd is a Kickstarter-style crowdfunding dApp built on the Stellar network using Soroban smart contracts. It enables project creators to deploy a campaign with a specific XLM funding goal and a deadline. Users can back the project using their Freighter wallet. If the goal is met before the deadline, the project creator can claim the collected funds. If the deadline passes and the goal is not met, contributors can safely withdraw their refunded XLM.

## Tech Stack
- Rust / Soroban SDK (Smart Contracts)
- Next.js 14 (Frontend App Router)
- TypeScript
- Tailwind CSS
- Stellar JS SDK
- Freighter Wallet API

## Prerequisites
- **Rust installed**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Wasm target**: `rustup target add wasm32-unknown-unknown`
- **Stellar CLI**: `cargo install --locked stellar-cli --features opt`
- **Node.js 18+**
- **Freighter wallet** browser extension installed from [Freighter App](https://freighter.app)

## Project Structure
- `/contracts/src/lib.rs` - The Soroban smart contract source code.
- `/contracts/Cargo.toml` - Rust project configuration and dependencies.
- `/frontend/` - Next.js frontend application.
- `/frontend/lib/stellar.ts` - Stellar network configuration and Freighter API wrapper.
- `/frontend/lib/contract.ts` - Smart contract interaction logic (RPC calls).
- `/frontend/components/` - React components including WalletConnect and MainFeature.
- `/frontend/app/` - Next.js 14 pages and layout.

## Step 1 — Build the Smart Contract
Navigate to the contracts directory and build the WebAssembly file.
```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```
This produces a `crowdfund_contract.wasm` file located at `contracts/target/wasm32-unknown-unknown/release/crowdfund_contract.wasm`. This is the compiled smart contract bytecode ready to be deployed.

## Step 2 — Set Up a Testnet Identity
Generate a new Stellar keypair and automatically fund it on the Testnet using Friendbot.
```bash
stellar keys generate --global my-key --network testnet
stellar keys address my-key
```
This creates a local keypair named `my-key` and uses Friendbot to fund it with 10,000 Testnet XLM.

## Step 3 — Deploy Contract to Testnet
Deploy the compiled WASM to the Stellar Testnet.
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/crowdfund_contract.wasm \
  --source my-key \
  --network testnet
```
Copy the returned **Contract ID** (e.g., `C...`). You will need it in Step 5. Next, you need to initialize the contract. 

```bash
# Calculate deadline: current Unix timestamp + desired seconds (e.g., 86400 for 1 day)
stellar contract invoke \
  --id <YOUR_CONTRACT_ID> \
  --source my-key \
  --network testnet \
  -- \
  initialize \
  --creator <YOUR_STELLAR_ADDRESS> \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --goal 1000000000 \
  --deadline <UNIX_TIMESTAMP>
```
Note: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` is the native XLM token address on Testnet.

## Step 4 — Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

## Step 5 — Configure Environment Variables
```bash
cp .env.example .env.local
```
Open `.env.local` and paste the Contract ID from Step 3 into `NEXT_PUBLIC_CONTRACT_ID`.

## Step 6 — Run the Frontend
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

## Step 7 — Using the App
1. Install Freighter at [https://freighter.app](https://freighter.app) if you haven't already.
2. Set it to **Testnet** mode (Settings → Network → Testnet).
3. Click "Connect Wallet" on the dApp to link your Freighter wallet.
4. Click "Get Testnet XLM" to fund your wallet via Friendbot if you have a 0 balance.
5. In the main UI, enter an amount in XLM and click **Contribute**. Your wallet will prompt you to sign the transaction.
6. If the deadline passes:
   - If the goal is met, the contract creator can click **Claim Funds**.
   - If the goal is not met, contributors can click **Withdraw Funds** to get their XLM back.

## Smart Contract Functions
- `initialize(env, creator, token, goal, deadline)`: Writes the campaign settings to storage. Must be called once before anything else. (Write)
- `contribute(env, contributor, amount)`: Transfers XLM from the contributor to the contract and updates their balance. Fails if the deadline has passed. (Write)
- `claim(env)`: Transfers the total funded amount to the creator. Overrides if the goal is met and deadline has passed. Sets a claimed flag to prevent double-claiming. (Write)
- `withdraw(env, contributor)`: Refunds a contributor's balance. Fails if the goal is met or the deadline has not passed. (Write)
- `get_state(env)`: Returns the current goal, total funded amount, deadline, and claimed status. (Read-only)

## Common Errors & Fixes
- **"Transaction simulation failed"** → The contract is not deployed, it has not been initialized, or you have the wrong `NEXT_PUBLIC_CONTRACT_ID` in `.env.local`.
- **"Freighter not found"** → Install the Freighter extension and refresh the page.
- **"Account not found"** → Click "Get Testnet XLM" to fund your wallet first via Friendbot.
- **"wasm32 target not found"** → Run: `rustup target add wasm32-unknown-unknown`

## Testnet Resources
- [Stellar Testnet Explorer](https://stellar.expert/explorer/testnet)
- [Stellar Lab (manual transactions)](https://lab.stellar.org)
- [Friendbot](https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY)