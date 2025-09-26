# Trunk-Based Development CI/CD Pipeline with Google Cloud Run

A complete example of trunk-based development with modular GitHub Actions CI/CD pipeline deploying to Google Cloud Run using OIDC authentication.

## 🏗️ Architecture Overview

This project demonstrates trunk-based development practices with:

- **Single main branch** - All development happens on `main`
- **Short-lived feature branches** - Merged within 1-2 days
- **Modular CI/CD pipeline** - Reusable workflows for different stages
- **Google Cloud Run deployment** - Serverless container deployment
- **OIDC authentication** - Secure keyless authentication to Google Cloud
- **Multi-environment strategy** - Local → Staging → Production
- **Feature flags** - Decouple deployment from feature releases
- **Automated testing** - Unit, integration, and smoke tests
- **Security scanning** - Vulnerability detection in CI
- **Blue-green deployments** - Zero-downtime production releases

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker
- Git
- Google Cloud CLI (`gcloud`)
- GitHub CLI (optional)
- Google Cloud Project with billing enabled

### Local Development

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd ci-test
   npm install
   npm run prepare  # Setup git hooks
   ```

2. **Start development:**
   ```bash
   npm run dev
   ```

3. **Run tests:**
   ```bash
   npm test              # All tests
   npm run test:unit     # Unit tests only
   npm run test:coverage # With coverage
   ```

## 📋 Workflow

### Development Process

1. **Create feature branch** (optional, keep short-lived):
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and commit** (follows conventional commits):
   ```bash
   git add .
   git commit -m "feat: add new user authentication"
   ```

3. **Push and create PR**:
   ```bash
   git push origin feature/new-feature
   # Create PR via GitHub UI or CLI
   ```

4. **Merge to main** after CI passes and review approval

### CI/CD Pipeline

The pipeline automatically triggers on:
- **Push to main** → Full CI/CD (deploy to staging → production)
- **Pull request** → CI only (tests and validation)

#### Modular Pipeline Architecture:

The CI/CD pipeline is split into reusable workflows:

1. **CI Workflow** (`ci.yml`)
   - Code linting and formatting
   - Security audit
   - Unit tests with coverage
   - Build validation

2. **Build & Push Workflow** (`build-and-push.yml`)
   - Docker image build
   - Push to Google Artifact Registry
   - Container vulnerability scanning
   - Multi-tag support

3. **Deploy Workflow** (`deploy-cloud-run.yml`)
   - Deploy to Google Cloud Run
   - Environment-specific configuration
   - Post-deployment testing
   - Traffic management for production

4. **Main Orchestrator** (`main.yml`)
   - Coordinates all workflows
   - Environment-specific deployments
   - Deployment notifications

## 🔧 Configuration

### Environment Files

- `env.example` - Template for environment variables
- `config/environments/local.json` - Local development config
- `config/environments/staging.json` - Staging environment config  
- `config/environments/production.json` - Production environment config

### Google Cloud Setup

1. **Run the OIDC setup script**:
   ```bash
   ./scripts/setup-gcp-oidc.sh your-github-username ci-test
   ```

2. **The script will**:
   - Create the `github-sa` service account
   - Set up Workload Identity Federation
   - Create Artifact Registry repository
   - Configure necessary IAM permissions

### GitHub Setup

1. **Configure branch protection** (see `.github/branch-protection.md`):
   - Require PR reviews
   - Require status checks
   - Restrict direct pushes to main

2. **Set up environments**:
   - `staging` - Auto-deploy from main
   - `production` - Requires manual approval
   - `production-traffic` - Controls production traffic rollout

3. **Add repository secrets**:
   ```
   # Staging environment
   STAGING_DATABASE_URL
   STAGING_REDIS_URL
   STAGING_SENTRY_DSN
   
   # Production environment
   PRODUCTION_DATABASE_URL
   PRODUCTION_REDIS_URL
   PRODUCTION_SENTRY_DSN
   ```

## 🧪 Testing Strategy

### Test Types

- **Unit Tests** (`tests/unit/`) - Individual component testing
- **Integration Tests** (`tests/integration/`) - Service interaction testing
- **Smoke Tests** (`tests/smoke/`) - Basic functionality validation
- **Performance Tests** (`tests/performance/`) - Load and performance testing

### Running Tests

```bash
# Local testing
npm run test:unit
npm run test:integration
npm run test:smoke -- --env=local

# CI/CD testing (automatic)
# - Unit tests run on every commit
# - Integration tests run in staging
# - Smoke tests run in all environments
```

## 🚢 Deployment

### Automatic Deployments

- **Staging**: Deploys automatically to Cloud Run on main branch push
- **Production**: Requires manual approval, then blue-green deployment with gradual traffic rollout

### Deployment Flow

1. **CI Pipeline**: Runs on every push/PR
2. **Build & Push**: Creates Docker image and pushes to Artifact Registry
3. **Deploy Staging**: Automatic deployment with integration tests
4. **Deploy Production**: Manual approval → Deploy → Gradual traffic rollout (10% → 50% → 100%)

### Cloud Run Configuration

- **Staging**: `cloud-run/staging.yaml`
  - 0-5 instances
  - 512Mi memory
  - Auto-scaling based on traffic

- **Production**: `cloud-run/production.yaml`
  - 1-10 instances minimum
  - 1Gi memory
  - Always-on with faster scaling

## 🎛️ Feature Flags

Feature flags allow deploying code without releasing features:

```javascript
// In your code
if (config.features.newUI) {
  // New feature code
} else {
  // Existing code
}
```

Configure in environment files:
- `local.json`: Enable all features for development
- `staging.json`: Enable features for testing
- `production.json`: Control feature rollout

## 🔒 Security

### Pre-commit Hooks

- **Linting**: Code style enforcement
- **Testing**: Unit tests must pass
- **Commit format**: Conventional commit validation

### CI Security

- **Dependency scanning**: npm audit
- **Container scanning**: Trivy vulnerability scanner
- **SARIF upload**: Results to GitHub Security tab

### Branch Protection

- No direct pushes to main
- Require PR reviews
- Require passing status checks
- Automatic branch deletion

## 📊 Monitoring

### Health Checks

All environments include:
- `/health` endpoint
- Kubernetes liveness/readiness probes
- Automated health validation in deployments

### Logging & Metrics

- **Local**: Debug logging to console
- **Staging**: Structured logging with metrics
- **Production**: Minimal logging with full monitoring stack

## 🔄 Rollback Strategy

### Automatic Rollback

- Health check failures trigger automatic rollback
- Failed deployments revert to previous version

### Manual Rollback

```bash
# Rollback staging
./scripts/deploy.sh rollback staging

# Rollback production
./scripts/deploy.sh rollback production
```

## 📝 Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

**Examples**:
```
feat: add user authentication
fix(api): resolve login endpoint error
docs: update deployment guide
ci: add security scanning to pipeline
```

## 🤝 Contributing

1. Follow trunk-based development practices
2. Keep feature branches short-lived (< 2 days)
3. Write tests for new features
4. Use conventional commit messages
5. Ensure CI passes before merging

## 📚 Resources

- [Trunk-Based Development](https://trunkbaseddevelopment.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🆘 Troubleshooting

### Common Issues

1. **CI failing on main branch**
   - Check GitHub Actions logs
   - Verify all required secrets are set
   - Ensure branch protection rules are configured

2. **Deployment failures**
   - Check deployment logs: `kubectl logs -n <namespace>`
   - Verify environment configuration
   - Check health endpoint manually

3. **Pre-commit hooks failing**
   - Run `npm run lint:fix` to auto-fix linting issues
   - Ensure all tests pass: `npm test`
   - Check commit message format

### Getting Help

- Check GitHub Issues for known problems
- Review GitHub Actions workflow logs
- Verify environment configuration files
- Check deployment script logs
