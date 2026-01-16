//! Stellar Soroban Demo Contract
//!
//! A demo contract showcasing various input types for UI testing.
//! All functions are public for demonstration purposes.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env, Map, String,
    Symbol, Vec,
};

// ============================================================================
// Storage Keys
// ============================================================================

const GREETING: Symbol = symbol_short!("GREETING");
const OWNER: Symbol = symbol_short!("OWNER");
const PAUSED: Symbol = symbol_short!("PAUSED");
const STAKES: Symbol = symbol_short!("STAKES");
const REWARDS: Symbol = symbol_short!("REWARDS");
const PERIODS: Symbol = symbol_short!("PERIODS");
const PERIOD_COUNT: Symbol = symbol_short!("PCOUNT");
const WHITELIST: Symbol = symbol_short!("WLIST");
const PROFILES: Symbol = symbol_short!("PROFILES");
const SETTINGS: Symbol = symbol_short!("SETTINGS");

// ============================================================================
// Complex Types - Structs
// ============================================================================

/// Staking period configuration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Period {
    pub start: u64,
    pub end: u64,
    pub rate: u64,
}

/// User profile with multiple fields
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserProfile {
    pub name: String,
    pub bio: String,
    pub level: u32,
    pub verified: bool,
    pub join_timestamp: u64,
}

/// User staking info
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserInfo {
    pub staked: i128,
    pub reward: i128,
}

/// Transfer parameters as a struct
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferParams {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub memo: String,
}

/// Configuration settings
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractSettings {
    pub min_stake: i128,
    pub max_stake: i128,
    pub lock_period: u64,
    pub fee_percent: u32,
    pub enabled: bool,
}

// ============================================================================
// Complex Types - Enums
// ============================================================================

/// Action type enum for categorizing operations
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ActionType {
    Stake,
    Unstake,
    Claim,
    Transfer,
    Delegate,
}

/// Priority level enum
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

/// Result status enum with associated data
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OperationResult {
    Success(i128),
    Pending(u64),
    Failed(String),
}

// ============================================================================
// Contract Implementation
// ============================================================================

#[contract]
pub struct DemoContract;

#[contractimpl]
impl DemoContract {
    // ========================================================================
    // Initialization
    // ========================================================================

    /// Initialize with admin and greeting
    pub fn initialize(env: Env, admin: Address, greeting: String) {
        if env.storage().instance().has(&OWNER) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&OWNER, &admin);
        env.storage().instance().set(&GREETING, &greeting);
        env.storage().instance().set(&PAUSED, &false);
        env.storage().instance().set(&PERIOD_COUNT, &0u32);
    }

    // ========================================================================
    // View Functions (No Parameters)
    // ========================================================================

    pub fn greeting(env: Env) -> String {
        env.storage()
            .instance()
            .get(&GREETING)
            .unwrap_or(String::from_str(&env, "Hello!"))
    }

    pub fn owner(env: Env) -> Address {
        env.storage().instance().get(&OWNER).unwrap()
    }

    pub fn paused(env: Env) -> bool {
        env.storage().instance().get(&PAUSED).unwrap_or(false)
    }

    pub fn total_periods(env: Env) -> u32 {
        env.storage().instance().get(&PERIOD_COUNT).unwrap_or(0u32)
    }

    pub fn get_settings(env: Env) -> ContractSettings {
        env.storage().instance().get(&SETTINGS).unwrap_or(ContractSettings {
            min_stake: 100,
            max_stake: 1000000,
            lock_period: 86400,
            fee_percent: 1,
            enabled: true,
        })
    }

    // ========================================================================
    // View Functions (With Parameters)
    // ========================================================================

    pub fn stakes(env: Env, account: Address) -> i128 {
        let stakes_map: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&STAKES)
            .unwrap_or(Map::new(&env));
        stakes_map.get(account).unwrap_or(0)
    }

    pub fn rewards(env: Env, account: Address) -> i128 {
        let rewards_map: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&REWARDS)
            .unwrap_or(Map::new(&env));
        rewards_map.get(account).unwrap_or(0)
    }

    pub fn get_period(env: Env, id: u32) -> Period {
        let periods: Map<u32, Period> = env
            .storage()
            .persistent()
            .get(&PERIODS)
            .unwrap_or(Map::new(&env));
        periods.get(id).unwrap_or(Period { start: 0, end: 0, rate: 0 })
    }

    pub fn user_info(env: Env, account: Address) -> UserInfo {
        UserInfo {
            staked: Self::stakes(env.clone(), account.clone()),
            reward: Self::rewards(env, account),
        }
    }

    pub fn get_profile(env: Env, account: Address) -> UserProfile {
        let profiles: Map<Address, UserProfile> = env
            .storage()
            .persistent()
            .get(&PROFILES)
            .unwrap_or(Map::new(&env));
        profiles.get(account).unwrap_or(UserProfile {
            name: String::from_str(&env, "Anonymous"),
            bio: String::from_str(&env, ""),
            level: 0,
            verified: false,
            join_timestamp: 0,
        })
    }

    pub fn is_whitelisted(env: Env, account: Address) -> bool {
        let whitelist: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&WHITELIST)
            .unwrap_or(Map::new(&env));
        whitelist.get(account).unwrap_or(false)
    }

    // ========================================================================
    // Basic Write Functions
    // ========================================================================

    /// Simple string input
    pub fn set_greeting(env: Env, new_greeting: String) {
        env.storage().instance().set(&GREETING, &new_greeting);
        env.events().publish((symbol_short!("greet"),), (new_greeting,));
    }

    /// Boolean input
    pub fn set_paused(env: Env, is_paused: bool) {
        env.storage().instance().set(&PAUSED, &is_paused);
    }

    /// Address and amount inputs
    pub fn stake(env: Env, from: Address, amount: i128) {
        let mut stakes_map: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&STAKES)
            .unwrap_or(Map::new(&env));
        let current = stakes_map.get(from.clone()).unwrap_or(0);
        stakes_map.set(from.clone(), current + amount);
        env.storage().persistent().set(&STAKES, &stakes_map);
        env.events().publish((symbol_short!("staked"),), (from, amount));
    }

    /// Address and boolean inputs
    pub fn set_whitelist(env: Env, account: Address, allowed: bool) {
        let mut whitelist: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&WHITELIST)
            .unwrap_or(Map::new(&env));
        whitelist.set(account.clone(), allowed);
        env.storage().persistent().set(&WHITELIST, &whitelist);
    }

    // ========================================================================
    // Struct Input Functions
    // ========================================================================

    /// Accept a Period struct as input
    pub fn create_period(env: Env, period: Period) {
        let count: u32 = env.storage().instance().get(&PERIOD_COUNT).unwrap_or(0);
        let mut periods: Map<u32, Period> = env
            .storage()
            .persistent()
            .get(&PERIODS)
            .unwrap_or(Map::new(&env));
        periods.set(count, period.clone());
        env.storage().persistent().set(&PERIODS, &periods);
        env.storage().instance().set(&PERIOD_COUNT, &(count + 1));
        env.events().publish((symbol_short!("period"),), (count, period));
    }

    /// Accept UserProfile struct
    pub fn set_profile(env: Env, account: Address, profile: UserProfile) {
        let mut profiles: Map<Address, UserProfile> = env
            .storage()
            .persistent()
            .get(&PROFILES)
            .unwrap_or(Map::new(&env));
        profiles.set(account.clone(), profile.clone());
        env.storage().persistent().set(&PROFILES, &profiles);
        env.events().publish((symbol_short!("profile"),), (account, profile.name));
    }

    /// Accept TransferParams struct for complex transfer
    pub fn execute_transfer(env: Env, params: TransferParams) -> bool {
        // Demo: just emit an event with the transfer params
        env.events().publish(
            (symbol_short!("transfer"),),
            (params.from, params.to, params.amount, params.memo),
        );
        true
    }

    /// Accept ContractSettings struct
    pub fn update_settings(env: Env, settings: ContractSettings) {
        env.storage().instance().set(&SETTINGS, &settings);
        env.events().publish((symbol_short!("settings"),), (settings.min_stake, settings.max_stake));
    }

    // ========================================================================
    // Enum Input Functions
    // ========================================================================

    /// Accept ActionType enum
    pub fn log_action(env: Env, user: Address, action: ActionType, amount: i128) {
        env.events().publish((symbol_short!("action"),), (user, amount));
        // Store action count or history if needed
        let _ = action; // Use the action
    }

    /// Accept Priority enum
    pub fn submit_request(env: Env, requester: Address, priority: Priority, description: String) {
        env.events().publish((symbol_short!("request"),), (requester, description));
        let _ = priority; // Use the priority
    }

    // ========================================================================
    // Vector/Array Input Functions
    // ========================================================================

    /// Accept a vector of addresses for batch whitelist
    pub fn batch_whitelist(env: Env, accounts: Vec<Address>, allowed: bool) {
        let mut whitelist: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&WHITELIST)
            .unwrap_or(Map::new(&env));

        for i in 0..accounts.len() {
            let account = accounts.get(i).unwrap();
            whitelist.set(account, allowed);
        }
        env.storage().persistent().set(&WHITELIST, &whitelist);
        env.events().publish((symbol_short!("batch"),), (accounts.len(), allowed));
    }

    /// Accept a vector of amounts for batch staking
    pub fn batch_stake(env: Env, users: Vec<Address>, amounts: Vec<i128>) {
        if users.len() != amounts.len() {
            panic!("Arrays must be same length");
        }

        let mut stakes_map: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&STAKES)
            .unwrap_or(Map::new(&env));

        for i in 0..users.len() {
            let user = users.get(i).unwrap();
            let amount = amounts.get(i).unwrap();
            let current = stakes_map.get(user.clone()).unwrap_or(0);
            stakes_map.set(user, current + amount);
        }
        env.storage().persistent().set(&STAKES, &stakes_map);
    }

    /// Accept vector of u32 IDs
    pub fn remove_periods(env: Env, period_ids: Vec<u32>) {
        let mut periods: Map<u32, Period> = env
            .storage()
            .persistent()
            .get(&PERIODS)
            .unwrap_or(Map::new(&env));

        for i in 0..period_ids.len() {
            let id = period_ids.get(i).unwrap();
            periods.remove(id);
        }
        env.storage().persistent().set(&PERIODS, &periods);
    }

    // ========================================================================
    // Bytes Input Functions
    // ========================================================================

    /// Accept raw bytes input
    pub fn store_data(env: Env, key: Symbol, data: Bytes) -> u32 {
        let len = data.len();
        env.storage().persistent().set(&key, &data);
        len
    }

    /// Accept fixed-size bytes (32 bytes - like a hash)
    pub fn verify_hash(env: Env, data: Bytes, expected_hash: BytesN<32>) -> bool {
        // Demo: just check if data is not empty and hash is provided
        let _ = expected_hash; // In real impl, would hash data and compare
        data.len() > 0
    }

    // ========================================================================
    // Optional Input Functions
    // ========================================================================

    /// Function with optional string parameter
    pub fn update_profile_name(env: Env, account: Address, name: String, bio: Option<String>) {
        let mut profiles: Map<Address, UserProfile> = env
            .storage()
            .persistent()
            .get(&PROFILES)
            .unwrap_or(Map::new(&env));

        let mut profile = profiles.get(account.clone()).unwrap_or(UserProfile {
            name: String::from_str(&env, ""),
            bio: String::from_str(&env, ""),
            level: 0,
            verified: false,
            join_timestamp: 0,
        });

        profile.name = name;
        if let Some(new_bio) = bio {
            profile.bio = new_bio;
        }

        profiles.set(account, profile);
        env.storage().persistent().set(&PROFILES, &profiles);
    }

    /// Function with optional amount
    pub fn withdraw(env: Env, user: Address, amount: Option<i128>) {
        let mut stakes_map: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&STAKES)
            .unwrap_or(Map::new(&env));

        let current = stakes_map.get(user.clone()).unwrap_or(0);
        let withdraw_amount = amount.unwrap_or(current); // If None, withdraw all

        if withdraw_amount > current {
            panic!("Insufficient balance");
        }

        stakes_map.set(user.clone(), current - withdraw_amount);
        env.storage().persistent().set(&STAKES, &stakes_map);
        env.events().publish((symbol_short!("withdraw"),), (user, withdraw_amount));
    }

    // ========================================================================
    // Multiple Complex Parameters
    // ========================================================================

    /// Function with many different parameter types
    pub fn complex_operation(
        env: Env,
        user: Address,
        amount: i128,
        action: ActionType,
        priority: Priority,
        note: String,
        tags: Vec<Symbol>,
        metadata: Bytes,
    ) -> OperationResult {
        // Demo: emit event and return success
        env.events().publish(
            (symbol_short!("complex"),),
            (user.clone(), amount, note.clone()),
        );

        // Use the parameters
        let _ = (action, priority, tags, metadata);

        OperationResult::Success(amount)
    }

    /// Tuple-like function with multiple returns via struct
    pub fn get_full_user_data(env: Env, account: Address) -> (UserInfo, UserProfile, bool) {
        let info = Self::user_info(env.clone(), account.clone());
        let profile = Self::get_profile(env.clone(), account.clone());
        let whitelisted = Self::is_whitelisted(env, account);
        (info, profile, whitelisted)
    }

    // ========================================================================
    // Integer Type Variations
    // ========================================================================

    /// Various integer sizes
    pub fn set_limits(
        env: Env,
        small: u32,
        medium: u64,
        large: i128,
        signed_small: i32,
        signed_medium: i64,
    ) {
        // Demo: store as a tuple in events
        env.events().publish(
            (symbol_short!("limits"),),
            (small, medium, large, signed_small, signed_medium),
        );
    }

    /// Percentage with basis points (u32)
    pub fn set_fee(env: Env, fee_basis_points: u32) {
        // e.g., 100 = 1%, 10000 = 100%
        if fee_basis_points > 10000 {
            panic!("Fee cannot exceed 100%");
        }
        env.events().publish((symbol_short!("fee"),), (fee_basis_points,));
    }
}
