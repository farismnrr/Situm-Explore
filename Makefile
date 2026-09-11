SHELL := /bin/sh
.SHELLFLAGS := -eu -c

REGISTRY ?= ghcr.io
IMAGE_REPOSITORY ?= ghcr.io/farismnrr/situm-explore
IMAGE ?= $(IMAGE_REPOSITORY)
SHA_TAG ?= sha-$(shell git rev-parse --short=12 HEAD 2>/dev/null || printf 'unknown')
STAGING_TAG ?= staging
MIGRATION_TAG ?= migrate-$(SHA_TAG)
PLATFORMS ?= linux/amd64
LOCAL_PLATFORM ?= $(shell docker version --format '{{.Server.Os}}/{{.Server.Arch}}' 2>/dev/null || printf 'linux/amd64')
COMPOSE_FILE ?= deploy/staging.compose.yml
STAGING_ENV_FILE ?= deploy/staging.env
STAGING_ENV_MATERIALIZER ?= ./scripts/materialize-staging-env.sh
STAGING_PORT ?= 3005
BUILD_CONTEXT ?= $(shell mktemp -d "$${TMPDIR:-/tmp}/situm-explore-docker.XXXXXX")
BUILDX_BUILDER ?= situm-explore

export COMPOSE_FILE STAGING_ENV_FILE STAGING_PORT IMAGE_REPOSITORY STAGING_TAG

.PHONY: help doctor check image-build image-push image-migration-push image-inspect image-security-check \
        staging-pull staging-up staging-update staging-down staging-restart \
        staging-ps staging-logs staging-migrate staging-config release-staging

help:
	@printf '%s\n' \
		'Usage: make <target> [VARIABLE=value]' \
		'' \
		'Checks and images:' \
		'  doctor                 Check required tools, builder, platform, and registry setup' \
		'  check                  Run repository whitespace, lint, typecheck, and build checks' \
		'  image-build            Build a local image using the filtered Docker context' \
		'  image-push             Build and publish immutable SHA and staging tags' \
		'  image-migration-push   Build and publish the immutable migration image' \
		'  image-inspect          Inspect the configured image manifest or local image' \
		'  image-security-check   Run Docker Scout or report that it is unavailable' \
		'' \
		'Staging (pull-only Compose):' \
		'  staging-pull           Pull the configured staging image' \
		'  staging-up             Start staging services' \
		'  staging-update         Pull and recreate staging services' \
		'  staging-down           Stop staging services' \
		'  staging-restart        Restart staging services' \
		'  staging-ps             Show staging service status' \
		'  staging-logs           Follow staging service logs' \
		'  staging-migrate       Apply Drizzle migrations using staging.env (operator-invoked)' \
		'  release-staging        Publish tags, pull, and recreate staging'

doctor:
	@command -v git >/dev/null || { echo 'missing: git' >&2; exit 1; }
	@command -v docker >/dev/null || { echo 'missing: docker' >&2; exit 1; }
	@docker info >/dev/null 2>&1 || { echo 'docker daemon is unavailable' >&2; exit 1; }
	@docker buildx version >/dev/null 2>&1 || { echo 'missing: docker buildx' >&2; exit 1; }
	@docker buildx inspect '$(BUILDX_BUILDER)' >/dev/null 2>&1 || echo 'builder not found: $(BUILDX_BUILDER) (image targets may create/use it)'
	@printf 'docker: available\nbuilder: $(BUILDX_BUILDER)\nplatforms: $(PLATFORMS)\nregistry: $(REGISTRY)\nregistry credentials: configured locally (not inspected or printed)\n'

check:
	@git diff --check
	@npm run lint
	@npm run typecheck
	@npm run build

image-build:
	@context='$(BUILD_CONTEXT)'; trap 'rm -rf "$$context"' EXIT INT TERM; \
		context=$$(./scripts/docker-context.sh "$$context"); \
		docker buildx inspect '$(BUILDX_BUILDER)' >/dev/null 2>&1 || docker buildx create --name '$(BUILDX_BUILDER)' --use >/dev/null; \
		docker buildx build --builder '$(BUILDX_BUILDER)' --platform '$(LOCAL_PLATFORM)' \
			--load --tag '$(IMAGE):$(SHA_TAG)' --build-arg OCI_REVISION=$$(git rev-parse HEAD) \
			--build-arg OCI_VERSION='$(SHA_TAG)' "$$context"

image-push:
	@context=$$(mktemp -d "$${TMPDIR:-/tmp}/situm-explore-docker.XXXXXX"); trap 'rm -rf "$$context"' EXIT INT TERM; \
		context=$$(./scripts/docker-context.sh "$$context"); \
		docker buildx inspect '$(BUILDX_BUILDER)' >/dev/null 2>&1 || docker buildx create --name '$(BUILDX_BUILDER)' --use >/dev/null; \
		docker buildx build --builder '$(BUILDX_BUILDER)' --platform '$(PLATFORMS)' \
			--push --tag '$(IMAGE):$(SHA_TAG)' --tag '$(IMAGE):$(STAGING_TAG)' \
			--build-arg OCI_REVISION=$$(git rev-parse HEAD) --build-arg OCI_VERSION='$(SHA_TAG)' "$$context"

image-migration-push:
	@context=$$(mktemp -d "$${TMPDIR:-/tmp}/situm-explore-docker.XXXXXX"); trap 'rm -rf "$$context"' EXIT INT TERM; \
		context=$$(./scripts/docker-context.sh "$$context"); \
		docker buildx inspect '$(BUILDX_BUILDER)' >/dev/null 2>&1 || docker buildx create --name '$(BUILDX_BUILDER)' --use >/dev/null; \
		docker buildx build --builder '$(BUILDX_BUILDER)' --platform '$(PLATFORMS)' --target migration \
			--push --tag '$(IMAGE):$(MIGRATION_TAG)' \
			--build-arg OCI_REVISION=$$(git rev-parse HEAD) --build-arg OCI_VERSION='$(MIGRATION_TAG)' "$$context"

image-inspect:
	@docker buildx imagetools inspect '$(IMAGE):$(STAGING_TAG)' 2>/dev/null || docker image inspect '$(IMAGE):$(SHA_TAG)'

image-security-check:
	@if command -v docker-scout >/dev/null 2>&1; then docker scout cves '$(IMAGE):$(SHA_TAG)'; else echo 'docker scout unavailable; image security check not run'; fi

define COMPOSE
	@test -f '$(COMPOSE_FILE)' || { echo 'missing pull-only staging Compose file: $(COMPOSE_FILE)' >&2; exit 1; }
	@test -f '$(STAGING_ENV_FILE)' || { echo 'missing staging env file: $(STAGING_ENV_FILE)' >&2; exit 1; }
	docker compose -f '$(COMPOSE_FILE)'
endef

staging-pull:
	$(STAGING_CONFIG)
	$(COMPOSE) pull
staging-up:
	$(STAGING_CONFIG)
	$(COMPOSE) up -d
staging-update:
	$(STAGING_CONFIG)
	$(COMPOSE) pull
	$(COMPOSE) up -d --force-recreate
staging-down:
	$(COMPOSE) down
staging-restart:
	$(COMPOSE) restart
staging-ps:
	$(COMPOSE) ps
staging-logs:
	$(COMPOSE) logs -f
staging-config:
	$(STAGING_CONFIG)
staging-migrate:
	$(STAGING_CONFIG)
	@database_url=$$(awk -F= '/^[[:space:]]*DATABASE_URL[[:space:]]*=/{sub(/^[[:space:]]*DATABASE_URL[[:space:]]*=/, ""); print; exit}' '$(STAGING_ENV_FILE)'); \
		test -n "$$database_url" || { echo 'staging env is missing DATABASE_URL' >&2; exit 1; }; \
		DATABASE_URL="$$database_url" npm run db:migrate

define STAGING_CONFIG
	@test -x '$(STAGING_ENV_MATERIALIZER)' || { echo 'missing executable staging env materializer: $(STAGING_ENV_MATERIALIZER)' >&2; exit 1; }
	@'$(STAGING_ENV_MATERIALIZER)' .env '$(STAGING_ENV_FILE)'
endef
release-staging: image-push staging-update
