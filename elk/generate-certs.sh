#!/bin/sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ELK TLS certificate generation — container-native, no host tooling.
#
# The previous setup-certificates.sh relied on `mkcert`, a host-side tool
# that installs a trusted CA into the developer's OS trust store. That
# script was never wired into anything and never actually run, which is
# why elk/certs/ never existed and the whole ELK stack silently failed to
# start (Elasticsearch/Kibana/Logstash all mount certs from a directory
# that isn't there).
#
# This script runs *inside* the elk-cert-init one-shot container (see
# docker-compose.yml) using plain openssl, so it needs nothing on the host
# and regenerates certs automatically on first boot of the "observability"
# profile. It's idempotent — if certs already exist it does nothing.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -e

CERTS_DIR="${CERTS_DIR:-/certs}"
DAYS="${CERT_DAYS:-3650}"

if [ -f "$CERTS_DIR/elasticsearch/ca.crt" ] && \
   [ -f "$CERTS_DIR/kibana/ca.crt" ] && \
   [ -f "$CERTS_DIR/logstash/ca.crt" ]; then
    echo "✓ ELK certificates already present in $CERTS_DIR — skipping."
    exit 0
fi

echo "Generating a local CA + per-service TLS certs for the ELK stack..."

mkdir -p "$CERTS_DIR/ca" "$CERTS_DIR/elasticsearch" "$CERTS_DIR/kibana" "$CERTS_DIR/logstash"

# ── Root CA (self-signed, local-only trust — not for public use) ──────────
openssl req -x509 -newkey rsa:2048 -sha256 -days "$DAYS" -nodes \
    -keyout "$CERTS_DIR/ca/ca.key" \
    -out "$CERTS_DIR/ca/ca.crt" \
    -subj "/CN=Fleetmark ELK Local CA"

gen_leaf() {
    service="$1"
    outdir="$CERTS_DIR/$service"

    openssl req -newkey rsa:2048 -sha256 -nodes \
        -keyout "$outdir/$service.key" \
        -out "$outdir/$service.csr" \
        -subj "/CN=$service"

    openssl x509 -req -sha256 -days "$DAYS" \
        -in "$outdir/$service.csr" \
        -CA "$CERTS_DIR/ca/ca.crt" -CAkey "$CERTS_DIR/ca/ca.key" -CAcreateserial \
        -out "$outdir/$service.crt" \
        -extfile /dev/stdin <<EOF
subjectAltName=DNS:localhost,DNS:$service,IP:127.0.0.1,IP:::1
EOF

    rm -f "$outdir/$service.csr"
    cp "$CERTS_DIR/ca/ca.crt" "$outdir/ca.crt"
}

gen_leaf elasticsearch
gen_leaf kibana
gen_leaf logstash

chmod 644 "$CERTS_DIR"/*/*.crt
chmod 600 "$CERTS_DIR"/*/*.key

echo "✓ ELK certificates generated in $CERTS_DIR/{elasticsearch,kibana,logstash}"
