#!/usr/bin/env bash
# Verifica las cabeceras de seguridad HTTP del frontend desplegado (prueba dinamica).
# Uso: bash scripts/verificar-cabeceras.sh http://localhost:8080
set -u
URL="${1:-http://localhost:8080}"
CAB=$(curl -s -D - -o /dev/null "$URL/")
FALLAS=0; TOTAL=0
echo "| ID | Verificacion | Resultado |"
echo "|---|---|---|"
revisar() { TOTAL=$((TOTAL+1)); if echo "$CAB" | grep -qi "$2"; then echo "| $1 | $3 | APROBADA |"; else echo "| $1 | $3 | FALLIDA |"; FALLAS=$((FALLAS+1)); fi; }
revisar FE-DAST-01 "^content-security-policy:.*script-src 'self'" "CSP restringe scripts a origen propio"
revisar FE-DAST-02 "^content-security-policy:.*frame-ancestors 'none'" "CSP impide embeber en iframes (clickjacking)"
revisar FE-DAST-03 "^x-content-type-options: nosniff" "X-Content-Type-Options nosniff"
revisar FE-DAST-04 "^x-frame-options: DENY" "X-Frame-Options DENY"
revisar FE-DAST-05 "^referrer-policy: no-referrer" "Referrer-Policy no-referrer"
revisar FE-DAST-06 "^strict-transport-security:" "HSTS"
TOTAL=$((TOTAL+1))
if echo "$CAB" | grep -qiE "^server: nginx/[0-9]"; then echo "| FE-DAST-07 | Version del servidor oculta | FALLIDA |"; FALLAS=$((FALLAS+1)); else echo "| FE-DAST-07 | Version del servidor oculta | APROBADA |"; fi
TOTAL=$((TOTAL+1)); c=$(curl -s -o /dev/null -w "%{http_code}" "$URL/.env")
if [ "$c" = 404 ] || [ "$c" = 403 ]; then echo "| FE-DAST-08 | Archivos ocultos (.env) no accesibles | APROBADA |"; else echo "| FE-DAST-08 | Archivos ocultos (.env) no accesibles ($c) | FALLIDA |"; FALLAS=$((FALLAS+1)); fi
echo; echo "**Total: $TOTAL | Aprobadas: $((TOTAL-FALLAS)) | Fallidas: $FALLAS**"
[ "$FALLAS" -eq 0 ]
