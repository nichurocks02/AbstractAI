#!/usr/bin/env bash
set -euo pipefail

DOMAIN="otterflow.in"
EMAIL="ceo@otterflow.com"

echo "▶  Starting nginx only (no backend/frontend yet) ..."
docker-compose up -d --no-deps nginx

echo "▶  Asking Let's Encrypt for the first certificate ..."
docker-compose run --rm \
  --entrypoint certbot \
  certbot \
  certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --agree-tos --email "$EMAIL" --no-eff-email

echo "▶  Reloading nginx to use the new certificate ..."
docker-compose exec nginx nginx -s reload

echo "▶  Starting the full stack (backend, frontend, renew-loop) ..."
docker-compose up -d

echo "✅  Done!  Visit https://$DOMAIN"

