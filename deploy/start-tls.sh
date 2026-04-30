#!/bin/sh
set -eu

: "${PUBLIC_DOMAIN:=robotic-demo.eu-north1.osmo.nebius.cloud}"
: "${ACME_EMAIL:=ops@osmo.nebius.cloud}"
: "${SERVER_PORT:=8787}"

export PUBLIC_DOMAIN ACME_EMAIL SERVER_PORT

if [ -n "${TLS_CERT_PEM_B64:-}" ] && [ -n "${TLS_KEY_PEM_B64:-}" ]; then
	mkdir -p /tmp/caddy-certs
	printf '%s' "$TLS_CERT_PEM_B64" | base64 -d > /tmp/caddy-certs/cert.pem
	printf '%s' "$TLS_KEY_PEM_B64" | base64 -d > /tmp/caddy-certs/key.pem
	chmod 600 /tmp/caddy-certs/key.pem

	cat > /tmp/Caddyfile <<EOF
{
	email ${ACME_EMAIL}
}

${PUBLIC_DOMAIN} {
	tls /tmp/caddy-certs/cert.pem /tmp/caddy-certs/key.pem
	encode gzip zstd
	reverse_proxy 127.0.0.1:${SERVER_PORT}
}

http://${PUBLIC_DOMAIN} {
	redir https://{host}{uri} 308
}

:80 {
	encode gzip zstd
	reverse_proxy 127.0.0.1:${SERVER_PORT}
}
EOF
	CADDY_CONFIG=/tmp/Caddyfile
else
	CADDY_CONFIG=/etc/caddy/Caddyfile
fi

node server/index.js &
node_pid="$!"

caddy run --config "$CADDY_CONFIG" --adapter caddyfile &
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
