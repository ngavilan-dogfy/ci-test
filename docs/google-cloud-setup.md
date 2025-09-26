# Google Cloud Setup Guide

This guide walks you through setting up Google Cloud Run deployment with OIDC authentication for the trunk-based CI/CD pipeline.

## Prerequisites

- Google Cloud Project with billing enabled
- `gcloud` CLI installed and authenticated
- GitHub repository with admin access
- Project ID: `toolshock-pro` (update in scripts if different)

## Quick Setup

Run the automated setup script:

```bash
./scripts/setup-gcp-oidc.sh your-github-username your-repo-name
```

This script will handle all the configuration automatically. Continue reading for manual setup or troubleshooting.

## Manual Setup Steps

### 1. Enable Required APIs

```bash
gcloud services enable \
    cloudresourcemanager.googleapis.com \
    iam.googleapis.com \
    iamcredentials.googleapis.com \
    sts.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com
```

### 2. Create Service Account

```bash
# Create the service account
gcloud iam service-accounts create github-sa \
    --display-name="GitHub Actions Service Account" \
    --description="Service account for GitHub Actions CI/CD"

# Get the service account email
SA_EMAIL="github-sa@toolshock-pro.iam.gserviceaccount.com"
```

### 3. Grant Permissions

```bash
PROJECT_ID="toolshock-pro"

# Cloud Run permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.admin"

# Artifact Registry permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/artifactregistry.writer"

# Service Account User
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountUser"

# Storage permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.admin"
```

### 4. Create Workload Identity Pool

```bash
# Create the pool
gcloud iam workload-identity-pools create github-pool \
    --location="global" \
    --display-name="GitHub Actions Pool" \
    --description="Pool for GitHub Actions OIDC authentication"

# Create OIDC provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
    --workload-identity-pool=github-pool \
    --location="global" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='your-username/your-repo'"
```

### 5. Bind Service Account

```bash
# Allow GitHub repository to impersonate service account
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/$PROJECT_ID/locations/global/workloadIdentityPools/github-pool/attribute.repository/your-username/your-repo"
```

### 6. Create Artifact Registry

```bash
# Create Docker repository
gcloud artifacts repositories create ci-test \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for CI/CD pipeline"
```

## Verification

Test the setup:

```bash
# List service accounts
gcloud iam service-accounts list --filter="email:github-sa@*"

# Check Workload Identity Pool
gcloud iam workload-identity-pools describe github-pool --location=global

# Check Artifact Registry
gcloud artifacts repositories list --location=us-central1
```

## GitHub Configuration

The workflows are already configured with the correct values. No additional GitHub secrets are needed for authentication - OIDC handles it automatically.

### Environment Secrets (Optional)

Add these secrets to your GitHub repository for environment-specific configuration:

**Staging Environment:**
- `STAGING_DATABASE_URL`
- `STAGING_REDIS_URL`
- `STAGING_SENTRY_DSN`

**Production Environment:**
- `PRODUCTION_DATABASE_URL`
- `PRODUCTION_REDIS_URL`
- `PRODUCTION_SENTRY_DSN`

## Workflow Configuration

The workflows use these key configurations:

### OIDC Authentication
```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: projects/toolshock-pro/locations/global/workloadIdentityPools/github-pool/providers/github-provider
    service_account: github-sa@toolshock-pro.iam.gserviceaccount.com
```

### Artifact Registry
- **Registry**: `us-central1-docker.pkg.dev`
- **Project**: `toolshock-pro`
- **Repository**: `ci-test`

### Cloud Run Services
- **Staging**: `ci-test-staging` (us-central1)
- **Production**: `ci-test-production` (us-central1)

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   # Check service account permissions
   gcloud projects get-iam-policy toolshock-pro \
       --flatten="bindings[].members" \
       --filter="bindings.members:github-sa@toolshock-pro.iam.gserviceaccount.com"
   ```

2. **OIDC Authentication Failures**
   ```bash
   # Verify Workload Identity binding
   gcloud iam service-accounts get-iam-policy github-sa@toolshock-pro.iam.gserviceaccount.com
   ```

3. **Artifact Registry Access Issues**
   ```bash
   # Test Docker authentication
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```

4. **Cloud Run Deployment Failures**
   ```bash
   # Check Cloud Run logs
   gcloud run services logs read ci-test-staging --region=us-central1
   ```

### Debugging Commands

```bash
# Check current project
gcloud config get-value project

# List enabled APIs
gcloud services list --enabled

# Check IAM policies
gcloud projects get-iam-policy toolshock-pro

# Test service account impersonation
gcloud auth print-access-token --impersonate-service-account=github-sa@toolshock-pro.iam.gserviceaccount.com
```

## Security Best Practices

1. **Least Privilege**: The service account only has necessary permissions
2. **Repository Restriction**: OIDC provider is restricted to specific repository
3. **No Long-lived Keys**: Uses OIDC tokens instead of service account keys
4. **Audit Logging**: All actions are logged in Cloud Audit Logs

## Cost Optimization

1. **Cloud Run**: Pay per request, scales to zero
2. **Artifact Registry**: Pay for storage used
3. **Staging**: Minimal resources, scales to zero when not used
4. **Production**: Right-sized for expected load

## Monitoring

Set up monitoring for:

- Cloud Run service health
- Deployment success/failure rates
- Container vulnerabilities
- Resource usage and costs

Use Google Cloud Monitoring and Logging for comprehensive observability.
