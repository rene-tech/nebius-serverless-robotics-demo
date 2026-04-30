#!/bin/sh
set -eu

: "${PUBLIC_DOMAIN:=robotic-demo.eu-north1.osmo.nebius.cloud}"
: "${ACME_EMAIL:=ops@osmo.nebius.cloud}"
: "${SERVER_PORT:=8787}"

export PUBLIC_DOMAIN ACME_EMAIL SERVER_PORT

node server/index.js &
node_pid="$!"

caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
caddy_pid="$!"

trap 'kill "$node_pid" "$caddy_pid" 2>/dev/null || true; wait' INT TERM

while :; do
	if ! kill -0 "$node_pid" 2>/dev/null; then
		wait "$node_pid"
		status="$?"
		kill "$caddy_pid" 2>/dev/null || true
		wait 2>/dev/null || true
		exit "$status"
	fi

	if ! kill -0 "$caddy_pid" 2>/dev/null; then
		wait "$caddy_pid"
		status="$?"
		kill "$node_pid" 2>/dev/null || true
		wait 2>/dev/null || true
		exit "$status"
	fi

	sleep 1
done
