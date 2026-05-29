#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    DeadlinePassed = 1,
    DeadlineNotPassed = 2,
    GoalNotMet = 3,
    GoalMet = 4,
    NotInitialized = 5,
    AlreadyInitialized = 6,
    InsufficientBalance = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Creator,
    Token,
    Goal,
    Deadline,
    Balance(Address),
    TotalFunded,
    Claimed,
}

#[contract]
pub struct Crowdfund;

#[contractimpl]
impl Crowdfund {
    /// Initializes the crowdfunding campaign. Can only be called once.
    pub fn initialize(
        env: Env,
        creator: Address,
        token: Address,
        goal: i128,
        deadline: u64,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Creator) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Creator, &creator);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Goal, &goal);
        env.storage().instance().set(&DataKey::Deadline, &deadline);
        env.storage().instance().set(&DataKey::TotalFunded, &0i128);
        env.storage().instance().set(&DataKey::Claimed, &false);
        Ok(())
    }

    /// Contribute to the crowdfunding campaign. 
    pub fn contribute(env: Env, contributor: Address, amount: i128) -> Result<(), Error> {
        contributor.require_auth();
        let deadline: u64 = env.storage().instance().get(&DataKey::Deadline).ok_or(Error::NotInitialized)?;
        if env.ledger().timestamp() >= deadline {
            return Err(Error::DeadlinePassed);
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&contributor, &env.current_contract_address(), &amount);

        let balance_key = DataKey::Balance(contributor.clone());
        let mut balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        balance += amount;
        env.storage().persistent().set(&balance_key, &balance);

        let mut total: i128 = env.storage().instance().get(&DataKey::TotalFunded).unwrap();
        total += amount;
        env.storage().instance().set(&DataKey::TotalFunded, &total);

        Ok(())
    }

    /// Creator claims the funds if the goal is met and the deadline is passed.
    pub fn claim(env: Env) -> Result<(), Error> {
        let deadline: u64 = env.storage().instance().get(&DataKey::Deadline).ok_or(Error::NotInitialized)?;
        if env.ledger().timestamp() < deadline {
            return Err(Error::DeadlineNotPassed);
        }

        let total: i128 = env.storage().instance().get(&DataKey::TotalFunded).unwrap();
        let goal: i128 = env.storage().instance().get(&DataKey::Goal).unwrap();
        if total < goal {
            return Err(Error::GoalNotMet);
        }

        let claimed: bool = env.storage().instance().get(&DataKey::Claimed).unwrap();
        if claimed {
            return Ok(());
        }

        let creator: Address = env.storage().instance().get(&DataKey::Creator).unwrap();
        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        
        token_client.transfer(&env.current_contract_address(), &creator, &total);
        env.storage().instance().set(&DataKey::Claimed, &true);
        
        Ok(())
    }

    /// Contributors withdraw their funds if the goal is not met and the deadline is passed.
    pub fn withdraw(env: Env, contributor: Address) -> Result<(), Error> {
        let deadline: u64 = env.storage().instance().get(&DataKey::Deadline).ok_or(Error::NotInitialized)?;
        if env.ledger().timestamp() < deadline {
            return Err(Error::DeadlineNotPassed);
        }

        let total: i128 = env.storage().instance().get(&DataKey::TotalFunded).unwrap();
        let goal: i128 = env.storage().instance().get(&DataKey::Goal).unwrap();
        if total >= goal {
            return Err(Error::GoalMet);
        }

        let balance_key = DataKey::Balance(contributor.clone());
        let balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        if balance == 0 {
            return Err(Error::InsufficientBalance);
        }

        env.storage().persistent().set(&balance_key, &0i128);

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &contributor, &balance);

        Ok(())
    }

    pub fn get_state(env: Env) -> Result<(i128, i128, u64, bool), Error> {
        let goal: i128 = env.storage().instance().get(&DataKey::Goal).ok_or(Error::NotInitialized)?;
        let total: i128 = env.storage().instance().get(&DataKey::TotalFunded).unwrap();
        let deadline: u64 = env.storage().instance().get(&DataKey::Deadline).unwrap();
        let claimed: bool = env.storage().instance().get(&DataKey::Claimed).unwrap();
        Ok((goal, total, deadline, claimed))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{token, Address, Env};

    #[test]
    fn test_contribute_and_claim() {
        let env = Env::default();
        let creator = Address::generate(&env);
        let contributor = Address::generate(&env);
        
        let token_admin = Address::generate(&env);
        let token = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_client = token::Client::new(&env, &token.address());
        let token_admin_client = token::StellarAssetClient::new(&env, &token.address());
        
        let contract_id = env.register_contract(None, Crowdfund);
        let client = CrowdfundClient::new(&env, &contract_id);
        
        let goal = 1000;
        let deadline = env.ledger().timestamp() + 1000;
        
        client.initialize(&creator, &token.address(), &goal, &deadline);
        
        token_admin_client.mock_all_auths().mint(&contributor, &2000);
        
        env.mock_all_auths();
        client.contribute(&contributor, &1000);
        
        assert_eq!(token_client.balance(&contract_id), 1000);
        
        env.ledger().set_timestamp(deadline + 1);
        
        client.claim();
        
        assert_eq!(token_client.balance(&creator), 1000);
        assert_eq!(token_client.balance(&contract_id), 0);
    }

    #[test]
    fn test_contribute_and_withdraw() {
        let env = Env::default();
        let creator = Address::generate(&env);
        let contributor = Address::generate(&env);
        
        let token_admin = Address::generate(&env);
        let token = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_client = token::Client::new(&env, &token.address());
        let token_admin_client = token::StellarAssetClient::new(&env, &token.address());
        
        let contract_id = env.register_contract(None, Crowdfund);
        let client = CrowdfundClient::new(&env, &contract_id);
        
        let goal = 1000;
        let deadline = env.ledger().timestamp() + 1000;
        
        client.initialize(&creator, &token.address(), &goal, &deadline);
        
        token_admin_client.mock_all_auths().mint(&contributor, &2000);
        
        env.mock_all_auths();
        client.contribute(&contributor, &500);
        
        assert_eq!(token_client.balance(&contract_id), 500);
        
        env.ledger().set_timestamp(deadline + 1);
        
        client.withdraw(&contributor);
        
        assert_eq!(token_client.balance(&contributor), 2000);
        assert_eq!(token_client.balance(&contract_id), 0);
    }
}
