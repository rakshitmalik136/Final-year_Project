#!/usr/bin/env sh
set -e

CERT_DIR=/etc/nginx/ssl
CERT_FILE="$CERT_DIR/dev-cert.pem"
KEY_FILE="$CERT_DIR/dev-key.pem"
HTPASSWD_FILE=/etc/nginx/.htpasswd
SSL_CN="${SSL_CN:-localhost}"
SSL_ALT_NAMES="${SSL_ALT_NAMES:-DNS:localhost,IP:127.0.0.1}"
SSL_DAYS="${SSL_DAYS:-3650}"
ADMIN_VIEW_USER="${ADMIN_VIEW_USER:-${ADMIN_USERNAME:-}}"
ADMIN_VIEW_PASSWORD="${ADMIN_VIEW_PASSWORD:-${ADMIN_PASSWORD:-}}"

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  openssl req -x509 -nodes -days "$SSL_DAYS" -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=$SSL_CN" \
    -addext "subjectAltName=$SSL_ALT_NAMES"
fi

if [ -z "$ADMIN_VIEW_USER" ] || [ -z "$ADMIN_VIEW_PASSWORD" ]; then
  echo "ADMIN_VIEW_USER and ADMIN_VIEW_PASSWORD must be set for admin access."
  exit 1
fi

printf "%s:%s\n" \
  "$ADMIN_VIEW_USER" \
  "$(openssl passwd -apr1 "$ADMIN_VIEW_PASSWORD")" > "$HTPASSWD_FILE"
chmod 644 "$HTPASSWD_FILE"

exec nginx -g "daemon off;"
