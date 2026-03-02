# CHANGELOG


## v0.3.0 (2026-03-02)

### Bug Fixes

- Handle null values in response
  ([`f668eb1`](https://github.com/ngavilan-dogfy/ci-test/commit/f668eb14d8a9d320877faf2c316545b7ff07db27))

- Improve error logging
  ([`d8a7e06`](https://github.com/ngavilan-dogfy/ci-test/commit/d8a7e06cadd4be5108d069f20bf738fe493aadf5))

### Features

- Add user preferences endpoint
  ([`ba57c82`](https://github.com/ngavilan-dogfy/ci-test/commit/ba57c82b8937faa24b9be8c521b74a5d079b23e1))


## v0.2.0 (2026-03-02)

### Features

- Add metrics endpoint and fixes ([#4](https://github.com/ngavilan-dogfy/ci-test/pull/4),
  [`80cb377`](https://github.com/ngavilan-dogfy/ci-test/commit/80cb3776340392b674aa3243b00a9ab26b08dae5))

* chore: update dependencies

* fix: handle edge case in health check

* feat: add metrics endpoint

* fix: correct response format


## v0.1.0 (2026-03-02)

### Features

- Add semantic release with bump-first CI/CD flow
  ([#2](https://github.com/ngavilan-dogfy/ci-test/pull/2),
  [`b0b1b2a`](https://github.com/ngavilan-dogfy/ci-test/commit/b0b1b2adcfb3630a31451c43595d00ec5bd295c7))

Add pyproject.toml with python-semantic-release config and a new ci-cd-test workflow that runs:
  release (bump) → build → deploy. Disable old main orchestrator workflow.

- Added thing
  ([`d3aa0ee`](https://github.com/ngavilan-dogfy/ci-test/commit/d3aa0ee9c38c6feff3488a79ec50f53e65b32a33))

- Setup trunk-based CI/CD pipeline with Google Cloud Run
  ([`d9452fe`](https://github.com/ngavilan-dogfy/ci-test/commit/d9452fedff122fd5bd0b65f7e28e28130ab5ef8a))

- Add modular CI/CD workflows (ci, build-push, deploy, production-rollout) - Configure OIDC
  authentication with Google Cloud - Set up staging and production environments - Implement
  blue-green deployment with gradual traffic rollout - Remove database/redis dependencies for simple
  app
