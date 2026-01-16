// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DemoContract
 * @notice A demo contract showcasing various input types for UI testing.
 * @dev All functions are public without access controls for demonstration purposes.
 */
contract DemoContract {
    // ========================================================================
    // Types
    // ========================================================================

    /// @notice Staking period configuration
    struct Period {
        uint64 start;
        uint64 end;
        uint64 rate;
    }

    /// @notice User profile with multiple fields
    struct UserProfile {
        string name;
        string bio;
        uint32 level;
        bool verified;
        uint64 joinTimestamp;
    }

    /// @notice User staking info
    struct UserInfo {
        int128 staked;
        int128 reward;
    }

    /// @notice Transfer parameters as a struct
    struct TransferParams {
        address from;
        address to;
        int128 amount;
        string memo;
    }

    /// @notice Configuration settings
    struct ContractSettings {
        int128 minStake;
        int128 maxStake;
        uint64 lockPeriod;
        uint32 feePercent;
        bool enabled;
    }

    /// @notice Action type enum for categorizing operations
    enum ActionType {
        Stake,
        Unstake,
        Claim,
        Transfer,
        Delegate
    }

    /// @notice Priority level enum
    enum Priority {
        Low,
        Medium,
        High,
        Critical
    }

    // ========================================================================
    // State Variables
    // ========================================================================

    string public greeting;
    address public owner;
    bool public paused;
    ContractSettings public settings;

    mapping(address => int128) public stakes;
    mapping(address => int128) public rewards;
    mapping(address => bool) public whitelist;
    mapping(address => UserProfile) public profiles;
    mapping(uint32 => Period) public periods;
    mapping(bytes32 => bytes) public dataStore;

    uint32 public totalPeriods;

    // ========================================================================
    // Events
    // ========================================================================

    event GreetingChanged(string oldGreeting, string newGreeting);
    event Staked(address indexed user, int128 amount);
    event Withdrawn(address indexed user, int128 amount);
    event WhitelistUpdated(address indexed account, bool allowed);
    event ProfileUpdated(address indexed account, string name);
    event PeriodCreated(uint32 indexed id, Period period);
    event SettingsUpdated(int128 minStake, int128 maxStake);
    event ActionLogged(address indexed user, ActionType action, int128 amount);
    event RequestSubmitted(address indexed requester, Priority priority, string description);
    event TransferExecuted(address indexed from, address indexed to, int128 amount, string memo);
    event DataStored(bytes32 indexed key, uint256 length);
    event ComplexOperation(address indexed user, int128 amount, string note);
    event LimitsSet(uint32 small, uint64 medium, int128 large);
    event FeeSet(uint32 feeBasisPoints);
    event BatchWhitelisted(uint256 count, bool allowed);

    // ========================================================================
    // Constructor
    // ========================================================================

    constructor(string memory _greeting) {
        greeting = _greeting;
        owner = msg.sender;
        paused = false;
        totalPeriods = 0;
        
        // Set default settings
        settings = ContractSettings({
            minStake: 100,
            maxStake: 1000000,
            lockPeriod: 86400,
            feePercent: 1,
            enabled: true
        });
    }

    // ========================================================================
    // View Functions (No Parameters)
    // ========================================================================

    function getSettings() external view returns (ContractSettings memory) {
        return settings;
    }

    function rawData() external pure returns (bytes memory) {
        return hex"DEADBEEF";
    }

    // ========================================================================
    // View Functions (With Parameters)
    // ========================================================================

    function getPeriod(uint32 id) external view returns (Period memory) {
        return periods[id];
    }

    function userInfo(address account) external view returns (UserInfo memory) {
        return UserInfo({
            staked: stakes[account],
            reward: rewards[account]
        });
    }

    function getProfile(address account) external view returns (UserProfile memory) {
        return profiles[account];
    }

    function isWhitelisted(address account) external view returns (bool) {
        return whitelist[account];
    }

    // ========================================================================
    // Basic Write Functions
    // ========================================================================

    /// @notice Simple string input
    function setGreeting(string calldata newGreeting) external {
        string memory oldGreeting = greeting;
        greeting = newGreeting;
        emit GreetingChanged(oldGreeting, newGreeting);
    }

    /// @notice Boolean input
    function setPaused(bool _paused) external {
        paused = _paused;
    }

    /// @notice Address and amount inputs
    function stake(address from, int128 amount) external {
        require(amount > 0, "Amount must be positive");
        stakes[from] += amount;
        emit Staked(from, amount);
    }

    /// @notice Address and boolean inputs
    function setWhitelist(address account, bool allowed) external {
        whitelist[account] = allowed;
        emit WhitelistUpdated(account, allowed);
    }

    // ========================================================================
    // Struct Input Functions
    // ========================================================================

    /// @notice Accept a Period struct as input
    function createPeriod(Period calldata period) external {
        uint32 id = totalPeriods;
        periods[id] = period;
        totalPeriods++;
        emit PeriodCreated(id, period);
    }

    /// @notice Accept UserProfile struct
    function setProfile(address account, UserProfile calldata profile) external {
        profiles[account] = profile;
        emit ProfileUpdated(account, profile.name);
    }

    /// @notice Accept TransferParams struct for complex transfer
    function executeTransfer(TransferParams calldata params) external returns (bool) {
        emit TransferExecuted(params.from, params.to, params.amount, params.memo);
        return true;
    }

    /// @notice Accept ContractSettings struct
    function updateSettings(ContractSettings calldata _settings) external {
        settings = _settings;
        emit SettingsUpdated(_settings.minStake, _settings.maxStake);
    }

    // ========================================================================
    // Enum Input Functions
    // ========================================================================

    /// @notice Accept ActionType enum
    function logAction(address user, ActionType action, int128 amount) external {
        emit ActionLogged(user, action, amount);
    }

    /// @notice Accept Priority enum
    function submitRequest(address requester, Priority priority, string calldata description) external {
        emit RequestSubmitted(requester, priority, description);
    }

    // ========================================================================
    // Array Input Functions
    // ========================================================================

    /// @notice Accept an array of addresses for batch whitelist
    function batchWhitelist(address[] calldata accounts, bool allowed) external {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = allowed;
        }
        emit BatchWhitelisted(accounts.length, allowed);
    }

    /// @notice Accept arrays for batch staking
    function batchStake(address[] calldata users, int128[] calldata amounts) external {
        require(users.length == amounts.length, "Arrays must be same length");
        for (uint256 i = 0; i < users.length; i++) {
            stakes[users[i]] += amounts[i];
            emit Staked(users[i], amounts[i]);
        }
    }

    /// @notice Accept array of uint32 IDs
    function removePeriods(uint32[] calldata periodIds) external {
        for (uint256 i = 0; i < periodIds.length; i++) {
            delete periods[periodIds[i]];
        }
    }

    // ========================================================================
    // Bytes Input Functions
    // ========================================================================

    /// @notice Accept raw bytes input
    function storeData(bytes32 key, bytes calldata data) external returns (uint256) {
        dataStore[key] = data;
        emit DataStored(key, data.length);
        return data.length;
    }

    /// @notice Accept fixed-size bytes (32 bytes - like a hash)
    function verifyHash(bytes calldata data, bytes32 expectedHash) external pure returns (bool) {
        return data.length > 0 && expectedHash != bytes32(0);
    }

    // ========================================================================
    // Optional-like Input Functions (using defaults)
    // ========================================================================

    /// @notice Withdraw with optional amount (0 = withdraw all)
    function withdraw(address user, int128 amount) external {
        int128 withdrawAmount = amount == 0 ? stakes[user] : amount;
        require(withdrawAmount <= stakes[user], "Insufficient balance");
        stakes[user] -= withdrawAmount;
        emit Withdrawn(user, withdrawAmount);
    }

    // ========================================================================
    // Multiple Complex Parameters
    // ========================================================================

    /// @notice Function with many different parameter types
    function complexOperation(
        address user,
        int128 amount,
        ActionType action,
        Priority priority,
        string calldata note,
        bytes32[] calldata tags,
        bytes calldata metadata
    ) external returns (int128) {
        // Suppress unused variable warnings
        action;
        priority;
        tags;
        metadata;
        
        emit ComplexOperation(user, amount, note);
        return amount;
    }

    /// @notice Get full user data as multiple return values
    function getFullUserData(address account) external view returns (
        UserInfo memory info,
        UserProfile memory profile,
        bool isWhitelistedUser
    ) {
        info = UserInfo({
            staked: stakes[account],
            reward: rewards[account]
        });
        profile = profiles[account];
        isWhitelistedUser = whitelist[account];
    }

    // ========================================================================
    // Integer Type Variations
    // ========================================================================

    /// @notice Various integer sizes
    function setLimits(
        uint32 small,
        uint64 medium,
        int128 large,
        int32 signedSmall,
        int64 signedMedium
    ) external {
        // Suppress unused variable warnings
        signedSmall;
        signedMedium;
        
        emit LimitsSet(small, medium, large);
    }

    /// @notice Percentage with basis points (uint32)
    function setFee(uint32 feeBasisPoints) external {
        require(feeBasisPoints <= 10000, "Fee cannot exceed 100%");
        settings.feePercent = feeBasisPoints;
        emit FeeSet(feeBasisPoints);
    }
}
