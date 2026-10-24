#!/bin/sh
set -eu

source_file=${1:-.env}
target_file=${2:-deploy/staging.env}

test -f "$source_file" || {
  echo "missing local environment file: $source_file" >&2
  exit 1
}

value() {
  awk -F= -v key="$1" '$1 == key { print substr($0, index($0, "=") + 1); exit }' "$source_file"
}

database_path=$(value DATABASE_PATH)
session_password=$(value NUXT_SESSION_PASSWORD)
encryption_key=$(value NUXT_WORKSPACE_CREDENTIAL_ENCRYPTION_KEY)
clickhouse_user=$(value CLICKHOUSE_USER)
clickhouse_password=$(value CLICKHOUSE_PASSWORD)
clickhouse_db=$(value CLICKHOUSE_DB)
service_name=$(value OTEL_SERVICE_NAME)
otel_protocol=$(value OTEL_EXPORTER_OTLP_PROTOCOL)

test -n "$database_path" || { echo 'local environment is missing DATABASE_PATH' >&2; exit 1; }
test -n "$session_password" || { echo 'local environment is missing NUXT_SESSION_PASSWORD' >&2; exit 1; }
test -n "$encryption_key" || { echo 'local environment is missing NUXT_WORKSPACE_CREDENTIAL_ENCRYPTION_KEY' >&2; exit 1; }

umask 077
mkdir -p "$(dirname "$target_file")"
{
  printf 'DATABASE_PATH=/var/lib/situm-explore/data/senar.db\n'
  printf 'NUXT_DATABASE_PATH=/var/lib/situm-explore/data/senar.db\n'
  printf 'CLICKHOUSE_URL=http://host.docker.internal:8124\n'
  printf 'NUXT_CLICKHOUSE_URL=http://host.docker.internal:8124\n'
  printf 'CLICKHOUSE_USER=%s\n' "$clickhouse_user"
  printf 'NUXT_CLICKHOUSE_USER=%s\n' "$clickhouse_user"
  printf 'CLICKHOUSE_PASSWORD=%s\n' "$clickhouse_password"
  printf 'NUXT_CLICKHOUSE_PASSWORD=%s\n' "$clickhouse_password"
  printf 'CLICKHOUSE_DB=%s\n' "$clickhouse_db"
  printf 'NUXT_CLICKHOUSE_DB=%s\n' "$clickhouse_db"
  printf 'NUXT_SESSION_PASSWORD=%s\n' "$session_password"
  printf 'NUXT_SESSION_COOKIE_SECURE=true\n'
  printf 'NUXT_WORKSPACE_CREDENTIAL_ENCRYPTION_KEY=%s\n' "$encryption_key"
  printf 'OTEL_SERVICE_NAME=%s\n' "${service_name:-situm-explore}"
  printf 'OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318\n'
  printf 'OTEL_EXPORTER_OTLP_PROTOCOL=%s\n' "${otel_protocol:-http/protobuf}"
} > "$target_file"
