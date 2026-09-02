#!/bin/bash
set -e

if [ -t 1 ]; then
  BOLD=$'\033[1m'    DIM=$'\033[2m'
  GREEN=$'\033[32m'  RED=$'\033[31m'  CYAN=$'\033[36m'  YELLOW=$'\033[33m'
  RST=$'\033[0m'
else
  BOLD='' DIM='' GREEN='' RED='' CYAN='' YELLOW='' RST=''
fi

PREFLIGHT_ONLY=false
for __deploy_arg in "$@"; do
  case "$__deploy_arg" in
    --preflight)
      PREFLIGHT_ONLY=true
      ;;
  esac
done
unset __deploy_arg

ADMIN="GCEXAMPLEOWNER"
MANAGER="GCEXAMPLEMGR"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-${STELLAR_ACCOUNT:-}}"
ADMIN_SOURCE_ACCOUNT="${ADMIN_SOURCE_ACCOUNT:-$SOURCE_ACCOUNT}"
MANAGER_SOURCE_ACCOUNT="${MANAGER_SOURCE_ACCOUNT:-$SOURCE_ACCOUNT}"

if [ -z "$SOURCE_ACCOUNT" ]; then
  echo "Missing Stellar source account."
  echo "Set SOURCE_ACCOUNT or STELLAR_ACCOUNT to a Stellar CLI identity that controls the configured Admin/Manager addresses."
  echo "Example: export STELLAR_ACCOUNT=<identity-for-GCEXAMPLEOWNER>"
  exit 1
fi

if [ "$ADMIN" != "$MANAGER" ]; then
  echo "Admin and Manager addresses differ — set ADMIN_SOURCE_ACCOUNT and MANAGER_SOURCE_ACCOUNT to Stellar CLI identities that control those addresses."
  echo "Post-deploy invokes sign with the matching role account; deploy transactions still use SOURCE_ACCOUNT."
  echo ""
fi
resolve_cli_identity_address() {
  local identity="$1"
  if [[ "$identity" =~ ^G[A-Z2-7]{55}$ ]]; then
    echo "$identity"
    return 0
  fi
  local resolved
  resolved="$(stellar keys address "$identity" 2>/dev/null | tr -d '[:space:]' || true)"
  if [[ "$resolved" =~ ^G[A-Z2-7]{55}$ ]]; then
    echo "$resolved"
    return 0
  fi
  return 1
}

verify_role_signer() {
  local role_label="$1"
  local expected_address="$2"
  local source_account="$3"
  local resolved
  if ! resolved="$(resolve_cli_identity_address "$source_account")"; then
    echo "${RED}  ✗ Could not resolve Stellar CLI identity for ${role_label}: ${source_account}${RST}"
    echo "    Ensure the identity exists (stellar keys generate <name> --fund ...) or pass a G-address directly."
    exit 1
  fi
  if [ "$resolved" != "$expected_address" ]; then
    echo "${RED}  ✗ ${role_label} signer mismatch${RST}"
    echo "    Expected on-chain address: $expected_address"
    echo "    CLI identity \"$source_account\" resolves to: $resolved"
    echo "    Set ADMIN_SOURCE_ACCOUNT / MANAGER_SOURCE_ACCOUNT to identities that control the configured addresses."
    exit 1
  fi
}

verify_role_signer "Admin" "$ADMIN" "$ADMIN_SOURCE_ACCOUNT"
verify_role_signer "Manager" "$MANAGER" "$MANAGER_SOURCE_ACCOUNT"

verify_wasm_artifacts() {
  local missing=0
  if [ ! -f "target/wasm32v1-none/release/claim_topics_issuers.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/claim_topics_issuers.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/identity_registry_storage.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/identity_registry_storage.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/identity_verifier.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/identity_verifier.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/compliance.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/compliance.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/compliance_supply_limit.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/compliance_supply_limit.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/compliance_max_balance.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/compliance_max_balance.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/compliance_initial_lockup_period.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/compliance_initial_lockup_period.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/compliance_time_transfers_limits.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/compliance_time_transfers_limits.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/compliance_country_allow.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/compliance_country_allow.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/compliance_country_restrict.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/compliance_country_restrict.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/compliance_transfer_allow.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/compliance_transfer_allow.wasm"
    missing=1
  fi
  if [ ! -f "target/wasm32v1-none/release/rwa_token.wasm" ]; then
    echo "  ✗ Missing target/wasm32v1-none/release/rwa_token.wasm"
    missing=1
  fi
  if [ "$missing" -ne 0 ]; then
    echo ""
    echo "Run ./scripts/build.sh first to compile workspace contracts."
    exit 1
  fi
}

verify_wasm_artifacts

if [ "$PREFLIGHT_ONLY" = true ]; then
  echo ""
echo "  ✓ Preflight checks passed — ready to deploy."
  echo "    Run ./scripts/deploy.sh without --preflight to deploy."
  exit 0
fi

echo ""
echo ""
echo "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RST}"
echo "${BOLD}${CYAN}  Deploying Acme Real Estate Token (ACME) — RWA Token System${RST}"
echo "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RST}"
echo ""
echo "  Network:        Stellar Testnet"
echo "  Deploy Signer:  $SOURCE_ACCOUNT"
echo "  Admin:          $ADMIN"
echo "  Manager:        $MANAGER"
echo "  Admin Signer:   $ADMIN_SOURCE_ACCOUNT"
echo "  Manager Signer: $MANAGER_SOURCE_ACCOUNT"

echo ""
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo "${BOLD}  Core Contracts (4)${RST}"
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo ""
# 1. Deploy claim-topics-issuers
echo "${BOLD}  [1/4] Deploying Claim Topics & Issuers ...${RST}"
CTI_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/claim_topics_issuers.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER")
if [ $? -ne 0 ] || [ -z "$CTI_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Claim Topics & Issuers (claim-topics-issuers)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Claim Topics & Issuers: ${CTI_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${CTI_ADDRESS}${RST}"

echo ""
# 2. Deploy identity-registry-storage
echo "${BOLD}  [2/4] Deploying Identity Registry Storage ...${RST}"
IRS_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/identity_registry_storage.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER")
if [ $? -ne 0 ] || [ -z "$IRS_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Identity Registry Storage (identity-registry-storage)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Identity Registry Storage: ${IRS_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${IRS_ADDRESS}${RST}"

echo ""
# 3. Deploy identity-verifier
echo "${BOLD}  [3/4] Deploying Identity Verifier ...${RST}"
IDENTITY_VERIFIER_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/identity_verifier.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER" --identity_registry_storage "$IRS_ADDRESS" --claim_topics_and_issuers "$CTI_ADDRESS")
if [ $? -ne 0 ] || [ -z "$IDENTITY_VERIFIER_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Identity Verifier (identity-verifier)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Identity Verifier: ${IDENTITY_VERIFIER_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${IDENTITY_VERIFIER_ADDRESS}${RST}"

echo ""
# 4. Deploy compliance
echo "${BOLD}  [4/4] Deploying Compliance ...${RST}"
COMPLIANCE_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/compliance.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER")
if [ $? -ne 0 ] || [ -z "$COMPLIANCE_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Compliance (compliance)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Compliance: ${COMPLIANCE_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${COMPLIANCE_ADDRESS}${RST}"

echo ""
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo "${BOLD}  Compliance Modules (7)${RST}"
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo ""
echo "${BOLD}  [1/7] Deploying Supply Limit ...${RST}"
MODULE_SUPPLY_LIMIT_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/compliance_supply_limit.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER")
if [ $? -ne 0 ] || [ -z "$MODULE_SUPPLY_LIMIT_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Supply Limit (compliance-supply-limit)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Supply Limit: ${MODULE_SUPPLY_LIMIT_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${MODULE_SUPPLY_LIMIT_ADDRESS}${RST}"

echo ""
echo "${BOLD}  [2/7] Deploying Max Balance ...${RST}"
MODULE_MAX_BALANCE_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/compliance_max_balance.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER")
if [ $? -ne 0 ] || [ -z "$MODULE_MAX_BALANCE_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Max Balance (compliance-max-balance)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Max Balance: ${MODULE_MAX_BALANCE_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${MODULE_MAX_BALANCE_ADDRESS}${RST}"

echo ""
echo "${BOLD}  [3/7] Deploying Initial Lockup Period ...${RST}"
MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/compliance_initial_lockup_period.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER")
if [ $? -ne 0 ] || [ -z "$MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Initial Lockup Period (compliance-initial-lockup-period)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Initial Lockup Period: ${MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS}${RST}"

echo ""
echo "${BOLD}  [4/7] Deploying Time-based Transfer Limits ...${RST}"
MODULE_TIME_TRANSFERS_LIMITS_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/compliance_time_transfers_limits.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER")
if [ $? -ne 0 ] || [ -z "$MODULE_TIME_TRANSFERS_LIMITS_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Time-based Transfer Limits (compliance-time-transfers-limits)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Time-based Transfer Limits: ${MODULE_TIME_TRANSFERS_LIMITS_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${MODULE_TIME_TRANSFERS_LIMITS_ADDRESS}${RST}"

echo ""
echo "${BOLD}  [5/7] Deploying Country Allow-list ...${RST}"
MODULE_COUNTRY_ALLOW_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/compliance_country_allow.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER")
if [ $? -ne 0 ] || [ -z "$MODULE_COUNTRY_ALLOW_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Country Allow-list (compliance-country-allow)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Country Allow-list: ${MODULE_COUNTRY_ALLOW_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${MODULE_COUNTRY_ALLOW_ADDRESS}${RST}"

echo ""
echo "${BOLD}  [6/7] Deploying Country Restriction ...${RST}"
MODULE_COUNTRY_RESTRICT_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/compliance_country_restrict.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER")
if [ $? -ne 0 ] || [ -z "$MODULE_COUNTRY_RESTRICT_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Country Restriction (compliance-country-restrict)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Country Restriction: ${MODULE_COUNTRY_RESTRICT_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${MODULE_COUNTRY_RESTRICT_ADDRESS}${RST}"

echo ""
echo "${BOLD}  [7/7] Deploying Transfer Allow-list ...${RST}"
MODULE_TRANSFER_ALLOW_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/compliance_transfer_allow.wasm \
  --network testnet \
  -- \
  --admin "$ADMIN" --manager "$MANAGER")
if [ $? -ne 0 ] || [ -z "$MODULE_TRANSFER_ALLOW_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy Transfer Allow-list (compliance-transfer-allow)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ Transfer Allow-list: ${MODULE_TRANSFER_ALLOW_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${MODULE_TRANSFER_ALLOW_ADDRESS}${RST}"

echo ""
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo "${BOLD}  RWA Token${RST}"
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo ""
echo "${BOLD}  Deploying ACME Token ...${RST}"
RWA_TOKEN_ADDRESS=$(stellar contract deploy \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm target/wasm32v1-none/release/rwa_token.wasm \
  --network testnet \
  -- \
  --name "Acme Real Estate Token" \
  --symbol "ACME" \
  --admin "$ADMIN" \
  --manager "$MANAGER" \
  --compliance "$COMPLIANCE_ADDRESS" \
  --identity_verifier "$IDENTITY_VERIFIER_ADDRESS" \
  --agent "[\"GCEXAMPLEAGNT\"]")
if [ $? -ne 0 ] || [ -z "$RWA_TOKEN_ADDRESS" ]; then
  echo "${RED}  ✗ Failed to deploy ACME Token (rwa-token)${RST}"
  exit 1
fi
echo "${GREEN}  ✓ ACME Token: ${RWA_TOKEN_ADDRESS}${RST}"
echo "${DIM}    Explorer: https://stellar.expert/explorer/testnet/contract/${RWA_TOKEN_ADDRESS}${RST}"

echo ""
echo ""
echo "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RST}"
echo "${BOLD}${CYAN}  Post-Deploy Configuration${RST}"
echo "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RST}"
echo ""
echo ""
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo "${BOLD}  Token Binding${RST}"
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo ""
echo "${BOLD}  Binding token on Compliance and IRS...${RST}"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  bind_token \
  --token "$RWA_TOKEN_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $IRS_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  bind_token \
  --token "$RWA_TOKEN_ADDRESS" --operator "$MANAGER"
echo "${GREEN}  ✓ Token bound to Compliance and IRS${RST}"
echo ""
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo "${BOLD}  Compliance Module Wiring (7 modules)${RST}"
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo ""
echo "${BOLD}  Configuring Supply Limit...${RST}"
stellar contract invoke \
  --id $MODULE_SUPPLY_LIMIT_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_supply_limit \
  --token "$RWA_TOKEN_ADDRESS" --limit 1000000 --operator "$MANAGER"
stellar contract invoke \
  --id $MODULE_SUPPLY_LIMIT_ADDRESS \
  --source-account "$ADMIN_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_compliance_address \
  --token "$RWA_TOKEN_ADDRESS" --compliance "$COMPLIANCE_ADDRESS" --operator "$ADMIN"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Created" --module "$MODULE_SUPPLY_LIMIT_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Destroyed" --module "$MODULE_SUPPLY_LIMIT_ADDRESS" --operator "$MANAGER"
echo "${GREEN}  ✓ Supply Limit registered on hooks: Created, Destroyed${RST}"
echo ""
echo "${BOLD}  Configuring Max Balance...${RST}"
stellar contract invoke \
  --id $MODULE_MAX_BALANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_identity_registry_storage \
  --token "$RWA_TOKEN_ADDRESS" --irs "$IRS_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $MODULE_MAX_BALANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_max_balance \
  --token "$RWA_TOKEN_ADDRESS" --max 500000 --operator "$MANAGER"
stellar contract invoke \
  --id $MODULE_MAX_BALANCE_ADDRESS \
  --source-account "$ADMIN_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_compliance_address \
  --token "$RWA_TOKEN_ADDRESS" --compliance "$COMPLIANCE_ADDRESS" --operator "$ADMIN"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Transferred" --module "$MODULE_MAX_BALANCE_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Created" --module "$MODULE_MAX_BALANCE_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Destroyed" --module "$MODULE_MAX_BALANCE_ADDRESS" --operator "$MANAGER"
echo "${GREEN}  ✓ Max Balance registered on hooks: Transferred, Created, Destroyed${RST}"
echo ""
echo "${BOLD}  Configuring Initial Lockup Period...${RST}"
stellar contract invoke \
  --id $MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_lockup_period \
  --token "$RWA_TOKEN_ADDRESS" --period 100 --operator "$MANAGER"
stellar contract invoke \
  --id $MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS \
  --source-account "$ADMIN_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_compliance_address \
  --token "$RWA_TOKEN_ADDRESS" --compliance "$COMPLIANCE_ADDRESS" --operator "$ADMIN"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Transferred" --module "$MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Created" --module "$MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Destroyed" --module "$MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS" --operator "$MANAGER"
echo "${GREEN}  ✓ Initial Lockup Period registered on hooks: Transferred, Created, Destroyed${RST}"
echo ""
echo "${BOLD}  Configuring Time-based Transfer Limits...${RST}"
stellar contract invoke \
  --id $MODULE_TIME_TRANSFERS_LIMITS_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_identity_registry_storage \
  --token "$RWA_TOKEN_ADDRESS" --irs "$IRS_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $MODULE_TIME_TRANSFERS_LIMITS_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_time_transfer_limit \
  --token "$RWA_TOKEN_ADDRESS" --limit '{"limit_duration": 10, "limit_value": "1000"}' --operator "$MANAGER"
stellar contract invoke \
  --id $MODULE_TIME_TRANSFERS_LIMITS_ADDRESS \
  --source-account "$ADMIN_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_compliance_address \
  --token "$RWA_TOKEN_ADDRESS" --compliance "$COMPLIANCE_ADDRESS" --operator "$ADMIN"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Transferred" --module "$MODULE_TIME_TRANSFERS_LIMITS_ADDRESS" --operator "$MANAGER"
echo "${GREEN}  ✓ Time-based Transfer Limits registered on hooks: Transferred${RST}"
echo ""
echo "${BOLD}  Configuring Country Allow-list...${RST}"
stellar contract invoke \
  --id $MODULE_COUNTRY_ALLOW_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_identity_registry_storage \
  --token "$RWA_TOKEN_ADDRESS" --irs "$IRS_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $MODULE_COUNTRY_ALLOW_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  batch_allow_countries \
  --token "$RWA_TOKEN_ADDRESS" --countries '[840, 756]' --operator "$MANAGER"
stellar contract invoke \
  --id $MODULE_COUNTRY_ALLOW_ADDRESS \
  --source-account "$ADMIN_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_compliance_address \
  --token "$RWA_TOKEN_ADDRESS" --compliance "$COMPLIANCE_ADDRESS" --operator "$ADMIN"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Transferred" --module "$MODULE_COUNTRY_ALLOW_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Created" --module "$MODULE_COUNTRY_ALLOW_ADDRESS" --operator "$MANAGER"
echo "${GREEN}  ✓ Country Allow-list registered on hooks: Transferred, Created${RST}"
echo ""
echo "${BOLD}  Configuring Country Restriction...${RST}"
stellar contract invoke \
  --id $MODULE_COUNTRY_RESTRICT_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_identity_registry_storage \
  --token "$RWA_TOKEN_ADDRESS" --irs "$IRS_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $MODULE_COUNTRY_RESTRICT_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  batch_restrict_countries \
  --token "$RWA_TOKEN_ADDRESS" --countries '[408]' --operator "$MANAGER"
stellar contract invoke \
  --id $MODULE_COUNTRY_RESTRICT_ADDRESS \
  --source-account "$ADMIN_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_compliance_address \
  --token "$RWA_TOKEN_ADDRESS" --compliance "$COMPLIANCE_ADDRESS" --operator "$ADMIN"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Transferred" --module "$MODULE_COUNTRY_RESTRICT_ADDRESS" --operator "$MANAGER"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Created" --module "$MODULE_COUNTRY_RESTRICT_ADDRESS" --operator "$MANAGER"
echo "${GREEN}  ✓ Country Restriction registered on hooks: Transferred, Created${RST}"
echo ""
echo "${BOLD}  Configuring Transfer Allow-list...${RST}"
stellar contract invoke \
  --id $MODULE_TRANSFER_ALLOW_ADDRESS \
  --source-account "$ADMIN_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  set_compliance_address \
  --token "$RWA_TOKEN_ADDRESS" --compliance "$COMPLIANCE_ADDRESS" --operator "$ADMIN"
stellar contract invoke \
  --id $COMPLIANCE_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_module_to \
  --hook "Transferred" --module "$MODULE_TRANSFER_ALLOW_ADDRESS" --operator "$MANAGER"
echo "${GREEN}  ✓ Transfer Allow-list registered on hooks: Transferred${RST}"
echo ""
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo "${BOLD}  Claim Topics (2)${RST}"
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
stellar contract invoke \
  --id $CTI_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_claim_topic \
  --claim_topic 1 --operator "$MANAGER"
echo "${GREEN}  ✓ Claim topic 1 (KYC)${RST}"
stellar contract invoke \
  --id $CTI_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_claim_topic \
  --claim_topic 2 --operator "$MANAGER"
echo "${GREEN}  ✓ Claim topic 2 (AML)${RST}"
echo ""
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
echo "${BOLD}  Trusted Issuers (1)${RST}"
echo "${BOLD}───────────────────────────────────────────────────────────────${RST}"
stellar contract invoke \
  --id $CTI_ADDRESS \
  --source-account "$MANAGER_SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  add_trusted_issuer \
  --trusted_issuer "GCEXAMPLEISSUER1" --claim_topics '[1, 2]' --operator "$MANAGER"
echo "${GREEN}  ✓ Issuer GCEXAMPL... → topics [1, 2]${RST}"

echo ""
echo ""
echo "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RST}"
echo "${BOLD}${CYAN}  Initial Supply — Demo Auto-Mint Script Included${RST}"
echo "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RST}"
echo ""
echo "  Status:    deploy.sh does not auto-mint (identity verification required)."
echo "  Requested: 1000000000000000000000000 base units (from config)"
echo "  Decimals:  18 (1 whole token = 10^18 base units)"
echo ""
echo "  This testnet export includes scripts/bootstrap-demo-mint.sh — a demo-only"
echo "  educational script (NOT production KYC) that will:"
echo "    1. Deploy the example Claim Issuer and register it in CTI"
echo "    2. Deploy an Identity contract for Admin and sign demo claims"
echo "    3. Register Admin in IRS"
echo "    4. Run compliance preflight on the \`created\` hook (see script output)"
echo "    5. Mint 1000000000000000000000000 base units to Admin"
echo ""
echo "  After ./scripts/deploy.sh completes:"
echo "    chmod +x scripts/bootstrap-demo-mint.sh"
echo "    ./scripts/bootstrap-demo-mint.sh --preflight   # optional compliance check"
echo "    ./scripts/bootstrap-demo-mint.sh               # full demo flow (run printed Manager invokes first if needed)"

echo ""
echo ""
echo "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RST}"
echo "${BOLD}${CYAN}  Deployment Complete — Acme Real Estate Token (ACME)${RST}"
echo "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RST}"
echo ""
echo "  Network:        Stellar Testnet"
echo "  Admin:          $ADMIN"
echo "  Manager:        $MANAGER"
echo "  Deploy Signer:  $SOURCE_ACCOUNT"
echo "  Admin Signer:   $ADMIN_SOURCE_ACCOUNT"
echo "  Manager Signer: $MANAGER_SOURCE_ACCOUNT"
echo ""
echo "${DIM}───────────────────────────────────────────────────────────────${RST}"
echo '  Contract                       Address'
echo "${DIM}───────────────────────────────────────────────────────────────${RST}"
echo "  ${GREEN}Claim Topics & Issuers        ${RST} ${CTI_ADDRESS}"
echo "  ${GREEN}Identity Registry Storage     ${RST} ${IRS_ADDRESS}"
echo "  ${GREEN}Identity Verifier             ${RST} ${IDENTITY_VERIFIER_ADDRESS}"
echo "  ${GREEN}Compliance                    ${RST} ${COMPLIANCE_ADDRESS}"
echo "  ${GREEN}Supply Limit                  ${RST} ${MODULE_SUPPLY_LIMIT_ADDRESS}"
echo "  ${GREEN}Max Balance                   ${RST} ${MODULE_MAX_BALANCE_ADDRESS}"
echo "  ${GREEN}Initial Lockup Period         ${RST} ${MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS}"
echo "  ${GREEN}Time-based Transfer Limits    ${RST} ${MODULE_TIME_TRANSFERS_LIMITS_ADDRESS}"
echo "  ${GREEN}Country Allow-list            ${RST} ${MODULE_COUNTRY_ALLOW_ADDRESS}"
echo "  ${GREEN}Country Restriction           ${RST} ${MODULE_COUNTRY_RESTRICT_ADDRESS}"
echo "  ${GREEN}Transfer Allow-list           ${RST} ${MODULE_TRANSFER_ALLOW_ADDRESS}"
echo "  ${GREEN}ACME Token                    ${RST} ${RWA_TOKEN_ADDRESS}"
echo "${DIM}───────────────────────────────────────────────────────────────${RST}"
echo ""
echo "  ${BOLD}Contract Explorer Links:${RST}"
echo "    Claim Topics & Issuers:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${CTI_ADDRESS}${RST}"
echo "    Identity Registry Storage:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${IRS_ADDRESS}${RST}"
echo "    Identity Verifier:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${IDENTITY_VERIFIER_ADDRESS}${RST}"
echo "    Compliance:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${COMPLIANCE_ADDRESS}${RST}"
echo "    Supply Limit:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${MODULE_SUPPLY_LIMIT_ADDRESS}${RST}"
echo "    Max Balance:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${MODULE_MAX_BALANCE_ADDRESS}${RST}"
echo "    Initial Lockup Period:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS}${RST}"
echo "    Time-based Transfer Limits:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${MODULE_TIME_TRANSFERS_LIMITS_ADDRESS}${RST}"
echo "    Country Allow-list:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${MODULE_COUNTRY_ALLOW_ADDRESS}${RST}"
echo "    Country Restriction:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${MODULE_COUNTRY_RESTRICT_ADDRESS}${RST}"
echo "    Transfer Allow-list:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${MODULE_TRANSFER_ALLOW_ADDRESS}${RST}"
echo "    ACME Token:"
echo "${DIM}      https://stellar.expert/explorer/testnet/contract/${RWA_TOKEN_ADDRESS}${RST}"

write_deployment_manifest() {
  cat > deployment-manifest.json <<MANIFEST
{
  "network": "Stellar Testnet",
  "tokenName": "Acme Real Estate Token",
  "tokenSymbol": "ACME",
  "admin": "$ADMIN",
  "manager": "$MANAGER",
  "deploySigner": "$SOURCE_ACCOUNT",
  "adminSigner": "$ADMIN_SOURCE_ACCOUNT",
  "managerSigner": "$MANAGER_SOURCE_ACCOUNT",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contracts": {
    "CTI_ADDRESS": "$CTI_ADDRESS",
    "IRS_ADDRESS": "$IRS_ADDRESS",
    "IDENTITY_VERIFIER_ADDRESS": "$IDENTITY_VERIFIER_ADDRESS",
    "COMPLIANCE_ADDRESS": "$COMPLIANCE_ADDRESS",
    "MODULE_SUPPLY_LIMIT_ADDRESS": "$MODULE_SUPPLY_LIMIT_ADDRESS",
    "MODULE_MAX_BALANCE_ADDRESS": "$MODULE_MAX_BALANCE_ADDRESS",
    "MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS": "$MODULE_INITIAL_LOCKUP_PERIOD_ADDRESS",
    "MODULE_TIME_TRANSFERS_LIMITS_ADDRESS": "$MODULE_TIME_TRANSFERS_LIMITS_ADDRESS",
    "MODULE_COUNTRY_ALLOW_ADDRESS": "$MODULE_COUNTRY_ALLOW_ADDRESS",
    "MODULE_COUNTRY_RESTRICT_ADDRESS": "$MODULE_COUNTRY_RESTRICT_ADDRESS",
    "MODULE_TRANSFER_ALLOW_ADDRESS": "$MODULE_TRANSFER_ALLOW_ADDRESS",
    "RWA_TOKEN_ADDRESS": "$RWA_TOKEN_ADDRESS"
  }
}
MANIFEST
  echo ""
echo "  ✓ Wrote deployment-manifest.json"
}
write_deployment_manifest
