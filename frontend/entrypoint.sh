#!/usr/bin/env sh
set -e

: "${API_BASE:=http://localhost:4000/api}"
: "${WHATSAPP_NUMBER:=}"

if [ -f /usr/share/nginx/html/config.template.js ]; then
  envsubst '$API_BASE $WHATSAPP_NUMBER' < /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js
fi

exec nginx -g 'daemon off;'
