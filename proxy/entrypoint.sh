#!/usr/bin/env sh
set -e

CERT_DIR=/etc/nginx/ssl
CERT_FILE="$CERT_DIR/dev-cert.pem"
KEY_FILE="$CERT_DIR/dev-key.pem"
SSL_CN="${SSL_CN:-localhost}"
SSL_ALT_NAMES="${SSL_ALT_NAMES:-DNS:localhost,IP:127.0.0.1}"
SSL_DAYS="${SSL_DAYS:-3650}"

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  openssl req -x509 -nodes -days "$SSL_DAYS" -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=$SSL_CN" \
    -addext "subjectAltName=$SSL_ALT_NAMES"
fi

exec nginx -g "daemon off;"
