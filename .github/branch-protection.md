# Branch Protection Configuration

This document outlines the branch protection rules that should be configured in GitHub to enforce trunk-based development practices.

## Main Branch Protection Rules

Navigate to: `Settings > Branches > Add rule` for the `main` branch

### Required Settings:

#### 1. Restrict pushes that create files
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1`
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners (if CODEOWNERS file exists)

#### 2. Require status checks to pass
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks:**
    - `Continuous Integration`
    - `Build Docker Image`
    - `Security Scan`

#### 3. Enforce restrictions
- ✅ **Restrict pushes that create files**
- ✅ **Do not allow bypassing the above settings**
- ✅ **Allow force pushes** (disabled)
- ✅ **Allow deletions** (disabled)

#### 4. Additional protections
- ✅ **Require linear history** (optional but recommended)
- ✅ **Require deployments to succeed** (for production environment)

## Environment Protection Rules

### Staging Environment
Navigate to: `Settings > Environments > staging`

- **Deployment branches:** `Selected branches` → `main`
- **Environment secrets:** Add staging-specific secrets
- **Reviewers:** Not required (auto-deploy)

### Production Environment  
Navigate to: `Settings > Environments > production`

- **Deployment branches:** `Selected branches` → `main`
- **Required reviewers:** Add team leads/DevOps team
- **Wait timer:** `5 minutes` (optional cooling period)
- **Environment secrets:** Add production-specific secrets

## Repository Settings

### General Settings
- **Allow merge commits:** ✅ Enabled
- **Allow squash merging:** ✅ Enabled (recommended)
- **Allow rebase merging:** ✅ Enabled
- **Automatically delete head branches:** ✅ Enabled

### Security Settings
- **Dependency graph:** ✅ Enabled
- **Dependabot alerts:** ✅ Enabled
- **Dependabot security updates:** ✅ Enabled
- **Code scanning:** ✅ Enabled (via workflow)
- **Secret scanning:** ✅ Enabled

## CLI Configuration (Alternative)

You can also configure these settings using GitHub CLI:

```bash
# Enable branch protection
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Continuous Integration","Build Docker Image","Security Scan"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null

# Create environments
gh api repos/:owner/:repo/environments/staging --method PUT
gh api repos/:owner/:repo/environments/production --method PUT \
  --field reviewers='[{"type":"User","id":USER_ID}]'
```

## Verification Checklist

After configuration, verify:
- [ ] Cannot push directly to main branch
- [ ] PRs require approval and passing checks
- [ ] Staging deploys automatically on main branch push
- [ ] Production requires manual approval
- [ ] Status checks prevent merging failing builds
- [ ] Branch deletion is prevented
