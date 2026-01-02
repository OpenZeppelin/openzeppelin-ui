# DevOps Setup Guide

This document outlines the required configuration for CI/CD workflows in the `openzeppelin-ui` repository.

## Required Secrets

The publish workflow requires three secrets to be configured in the GitHub repository settings.

### 1. GitHub App Authentication

The release workflow uses a GitHub App to create release PRs and push version bumps.

#### GH_APP_ID (Repository Variable)

- **Type**: Repository variable (not secret)
- **Location**: Settings > Secrets and variables > Actions > Variables
- **Description**: The App ID of the GitHub App used for automation
- **How to obtain**: GitHub App settings page > App ID field

#### GH_APP_PRIVATE_KEY (Repository Secret)

- **Type**: Repository secret
- **Location**: Settings > Secrets and variables > Actions > Secrets
- **Description**: The private key for the GitHub App
- **How to obtain**: GitHub App settings > Generate a private key
- **Format**: Full PEM file contents including `-----BEGIN RSA PRIVATE KEY-----` headers

### 2. NPM Token

#### NPM_TOKEN (Repository Secret)

- **Type**: Repository secret
- **Location**: Settings > Secrets and variables > Actions > Secrets
- **Description**: Access token for publishing to npm registry
- **Required scope**: `publish` access for `@openzeppelin` organization
- **How to obtain**: npm.js > Access Tokens > Generate New Token > Granular Access Token

## GitHub App Requirements

The GitHub App needs the following permissions:

### Repository Permissions

| Permission    | Access     | Purpose                         |
| ------------- | ---------- | ------------------------------- |
| Contents      | Read/Write | Push version bumps, create tags |
| Pull requests | Read/Write | Create release PRs              |
| Metadata      | Read       | Basic repository access         |
| Actions       | Read/Write | Trigger workflows               |

### Installation

The GitHub App must be installed on the `OpenZeppelin/openzeppelin-ui` repository.

## NPM Token Requirements

The npm token must have:

1. **Automation token type** (for CI/CD)
2. **Publish permission** for the `@openzeppelin` organization
3. **No 2FA requirement** (automation tokens bypass 2FA)

## Verification Steps

After configuring secrets, verify the setup:

1. **Test GitHub App token generation**:
   - Trigger the publish workflow manually
   - Check that the "Checkout Repo" step succeeds with the app token

2. **Test npm authentication**:
   - The first publish attempt will verify npm token validity
   - Check workflow logs for authentication errors

## Initial Release

Once secrets are configured:

1. Merge any pending changes to `main`
2. The publish workflow will automatically:
   - Generate SLSA Level 3 provenance
   - Publish all 7 packages at version 1.0.0
   - Create GitHub releases for each package

## Troubleshooting

### "Resource not accessible by integration"

- Ensure the GitHub App is installed on this repository
- Verify the App has the required permissions

### "npm ERR! 403 Forbidden"

- Verify the NPM_TOKEN has publish access to `@openzeppelin`
- Check token hasn't expired

### "Could not create workflow dispatch event"

- Ensure GH_APP_ID is set as a **variable** (not a secret)
- Verify the App ID is correct

## Security Notes

- Never commit tokens or keys to the repository
- Rotate tokens periodically
- Use the principle of least privilege for token scopes
- Consider separate tokens for staging vs production (future)
