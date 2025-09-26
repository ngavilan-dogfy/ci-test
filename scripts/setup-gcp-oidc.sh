#!/bin/bash

# Google Cloud OIDC Setup Script for GitHub Actions
# This script sets up Workload Identity Federation for secure authentication

set -euo pipefail

# Configuration
PROJECT_ID="toolshock-pro"
SERVICE_ACCOUNT_NAME="github-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL_NAME="github-pool"
PROVIDER_NAME="github-provider"
REPO_OWNER="${1:-your-github-username}"
REPO_NAME="${2:-ci-test}"

# Get project number (needed for Workload Identity)
PROJECT_NUMBER=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged in
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not authenticated with gcloud. Please run 'gcloud auth login'"
        exit 1
    fi
    
    # Set project
    gcloud config set project $PROJECT_ID
    
    # Get project number
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
    if [[ -z "$PROJECT_NUMBER" ]]; then
        log_error "Could not get project number for project: $PROJECT_ID"
        exit 1
    fi
    
    log_info "Project ID: $PROJECT_ID"
    log_info "Project Number: $PROJECT_NUMBER"
    log_success "Prerequisites checked"
}

# Enable required APIs
enable_apis() {
    log_info "Enabling required Google Cloud APIs..."
    
    gcloud services enable \
        cloudresourcemanager.googleapis.com \
        iam.googleapis.com \
        iamcredentials.googleapis.com \
        sts.googleapis.com \
        run.googleapis.com \
        artifactregistry.googleapis.com \
        cloudbuild.googleapis.com
    
    log_success "APIs enabled"
}

# Create service account
create_service_account() {
    log_info "Creating service account: $SERVICE_ACCOUNT_NAME"
    
    # Check if service account already exists
    if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &>/dev/null; then
        log_warning "Service account $SERVICE_ACCOUNT_NAME already exists"
    else
        gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
            --display-name="GitHub Actions Service Account" \
            --description="Service account for GitHub Actions CI/CD"
        
        log_success "Service account created"
    fi
}

# Grant necessary permissions
grant_permissions() {
    log_info "Granting permissions to service account..."
    
    # Cloud Run permissions
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/run.admin"
    
    # Artifact Registry permissions
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/artifactregistry.writer"
    
    # Cloud Build permissions (if needed)
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/cloudbuild.builds.builder"
    
    # Service Account User (to deploy Cloud Run services)
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/iam.serviceAccountUser"
    
    # Storage permissions (for build artifacts)
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/storage.admin"
    
    log_success "Permissions granted"
}

# Create Workload Identity Pool
create_workload_identity_pool() {
    log_info "Creating Workload Identity Pool..."
    
    # Check if pool already exists
    if gcloud iam workload-identity-pools describe $POOL_NAME \
        --location="global" &>/dev/null; then
        log_warning "Workload Identity Pool $POOL_NAME already exists"
    else
        gcloud iam workload-identity-pools create $POOL_NAME \
            --location="global" \
            --display-name="GitHub Actions Pool" \
            --description="Pool for GitHub Actions OIDC authentication"
        
        log_success "Workload Identity Pool created"
    fi
}

# Create OIDC Provider
create_oidc_provider() {
    log_info "Creating OIDC Provider..."
    
    # Check if provider already exists
    if gcloud iam workload-identity-pools providers describe $PROVIDER_NAME \
        --workload-identity-pool=$POOL_NAME \
        --location="global" &>/dev/null; then
        log_warning "OIDC Provider $PROVIDER_NAME already exists"
    else
        gcloud iam workload-identity-pools providers create-oidc $PROVIDER_NAME \
            --workload-identity-pool=$POOL_NAME \
            --location="global" \
            --issuer-uri="https://token.actions.githubusercontent.com" \
            --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
            --attribute-condition="assertion.repository=='${REPO_OWNER}/${REPO_NAME}'"
        
        log_success "OIDC Provider created"
    fi
}

# Bind service account to Workload Identity
bind_service_account() {
    log_info "Binding service account to Workload Identity..."
    
    # Allow the GitHub repository to impersonate the service account
    # Use PROJECT_NUMBER instead of project ID for Workload Identity
    gcloud iam service-accounts add-iam-policy-binding $SERVICE_ACCOUNT_EMAIL \
        --role="roles/iam.workloadIdentityUser" \
        --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/$POOL_NAME/attribute.repository/${REPO_OWNER}/${REPO_NAME}"
    
    log_success "Service account bound to Workload Identity"
}

# Create Artifact Registry repository
create_artifact_registry() {
    log_info "Creating Artifact Registry repository..."
    
    REPOSITORY_NAME="ci-test"
    LOCATION="us-central1"
    
    # Check if repository already exists
    if gcloud artifacts repositories describe $REPOSITORY_NAME \
        --location=$LOCATION &>/dev/null; then
        log_warning "Artifact Registry repository $REPOSITORY_NAME already exists"
    else
        gcloud artifacts repositories create $REPOSITORY_NAME \
            --repository-format=docker \
            --location=$LOCATION \
            --description="Docker repository for CI/CD pipeline"
        
        log_success "Artifact Registry repository created"
    fi
}

# Display configuration information
display_config() {
    log_info "Configuration Summary:"
    echo ""
    echo "Project ID: $PROJECT_ID"
    echo "Project Number: $PROJECT_NUMBER"
    echo "Service Account: $SERVICE_ACCOUNT_EMAIL"
    echo "Workload Identity Provider: projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/$POOL_NAME/providers/$PROVIDER_NAME"
    echo "Repository: ${REPO_OWNER}/${REPO_NAME}"
    echo ""
    log_info "GitHub Actions workflows are configured with:"
    echo ""
    echo "workload_identity_provider: projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/$POOL_NAME/providers/$PROVIDER_NAME"
    echo "service_account: $SERVICE_ACCOUNT_EMAIL"
    echo ""
    log_success "✅ No additional GitHub secrets needed - OIDC handles authentication!"
}

# Main execution
main() {
    log_info "Starting Google Cloud OIDC setup for GitHub Actions..."
    
    if [[ $# -lt 2 ]]; then
        log_error "Usage: $0 <github-owner> <repo-name>"
        log_error "Example: $0 myusername ci-test"
        exit 1
    fi
    
    check_prerequisites
    enable_apis
    create_service_account
    grant_permissions
    create_workload_identity_pool
    create_oidc_provider
    bind_service_account
    create_artifact_registry
    display_config
    
    log_success "Google Cloud OIDC setup completed successfully!"
    log_info "You can now push to your repository to trigger the CI/CD pipeline."
}

# Run main function
main "$@"
