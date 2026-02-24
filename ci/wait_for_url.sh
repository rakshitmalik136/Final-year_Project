#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 4 ]; then
  echo "Usage: $0 <url> [max_attempts=30] [sleep_seconds=2] [--insecure]" >&2
  exit 2
fi

url="$1"
max_attempts="${2:-30}"
sleep_seconds="${3:-2}"
tls_flag="${4:-}"

if ! [[ "$max_attempts" =~ ^[0-9]+$ ]] || [ "$max_attempts" -lt 1 ]; then
  echo "max_attempts must be a positive integer." >&2
  exit 2
fi

if ! [[ "$sleep_seconds" =~ ^[0-9]+$ ]] || [ "$sleep_seconds" -lt 1 ]; then
  echo "sleep_seconds must be a positive integer." >&2
  exit 2
fi

curl_args=(--silent --show-error --fail "$url")
if [ "$tls_flag" = "--insecure" ]; then
  curl_args=(--insecure "${curl_args[@]}")
elif [ -n "$tls_flag" ]; then
  echo "Unsupported fourth argument: $tls_flag" >&2
  exit 2
fi

attempt=1
while [ "$attempt" -le "$max_attempts" ]; do
  if curl "${curl_args[@]}" > /dev/null; then
    echo "Endpoint healthy: $url"
    exit 0
  fi

  echo "Waiting for $url (attempt $attempt/$max_attempts)..."
  attempt=$((attempt + 1))
  sleep "$sleep_seconds"
done

echo "Timeout waiting for endpoint: $url" >&2
exit 1
