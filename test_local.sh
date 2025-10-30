#!/usr/bin/env bash
set -euo pipefail

# === CONFIG ===
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:8000"
LOG_DIR="logs"
LOG_FILE="${LOG_DIR}/test_local.log"
DB_SERVICE="db"
DB_USER="admin"
DB_NAME="population_db"

mkdir -p "${LOG_DIR}"
echo "==== LOCAL TEST STARTED at $(date) ====" > "${LOG_FILE}"

RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
RESET="\033[0m"

log() {
  local message="$1"
  echo -e "${message}"
  # Strip potential color codes for log file
  echo -e "$(echo -e "${message}" | sed 's/\x1b\[[0-9;]*m//g')" >> "${LOG_FILE}"
}

success() {
  local message="$1"
  log "${GREEN}${message}${RESET}"
}

warn() {
  local message="$1"
  log "${YELLOW}${message}${RESET}"
}

fail() {
  local message="$1"
  log "${RED}❌ ${message}${RESET}"
  exit 1
}

run_or_fail() {
  local description="$1"
  shift
  if ! "$@" >> "${LOG_FILE}" 2>&1; then
    fail "${description} (see ${LOG_FILE})"
  fi
}

wait_for_http() {
  local url="$1"
  local name="$2"
  local attempts=0
  while (( attempts < 30 )); do
    if curl -sf "${url}" > /dev/null 2>&1; then
      success "✅ ${name} responding at ${url}"
      return 0
    fi
    sleep 2
    ((attempts++))
  done
  fail "${name} did not respond at ${url}"
}

wait_for_backend_ready() {
  wait_for_http "${BACKEND_URL}/api/health" "Backend health endpoint"
}

wait_for_frontend_ready() {
  wait_for_http "${FRONTEND_URL}" "Frontend"
}

wait_for_database() {
  local attempts=0
  while (( attempts < 30 )); do
    local container_id
    container_id=$(docker-compose ps -q "${DB_SERVICE}" 2>/dev/null || true)
    if [[ -z "${container_id}" ]]; then
      sleep 2
      ((attempts++))
      continue
    fi
    if docker-compose exec -T "${DB_SERVICE}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >> "${LOG_FILE}" 2>&1; then
      success "✅ PostgreSQL ready"
      return 0
    fi
    sleep 2
    ((attempts++))
  done
  fail "PostgreSQL not ready"
}

echo "[1/6] 🧹 Stopping old containers..." | tee -a "${LOG_FILE}"
if ! docker-compose down >> "${LOG_FILE}" 2>&1; then
  warn "⚠️ docker-compose down returned a non-zero status (continuing)"
fi

echo "[2/6] 🏗️  Building and starting containers..." | tee -a "${LOG_FILE}"
run_or_fail "Failed to build and start containers" docker-compose up -d --build

echo "[3/6] ⏳ Waiting for backend & DB to be ready..." | tee -a "${LOG_FILE}"
sleep 15
wait_for_backend_ready
wait_for_database


echo "[4/6] 🔍 Checking services..." | tee -a "${LOG_FILE}"
if curl -sf "${BACKEND_URL}/docs" > /dev/null; then
  success "✅ Backend docs available"
else
  fail "Backend docs endpoint unavailable"
fi
wait_for_frontend_ready


echo "[5/6] 🧪 Testing API endpoints..." | tee -a "${LOG_FILE}"
LOGIN_TMP=$(mktemp)
REGISTER_TMP=$(mktemp)
trap 'rm -f "${LOGIN_TMP}" "${REGISTER_TMP}"' EXIT

LOGIN_STATUS=$(curl -s -o "${LOGIN_TMP}" -w "%{http_code}" -X POST "${BACKEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@123"}')

echo "Admin login status: ${LOGIN_STATUS}" >> "${LOG_FILE}"
if [[ "${LOGIN_STATUS}" != "200" ]]; then
  fail "Unable to log in with default admin user"
fi

ADMIN_TOKEN=$(python3 - <<'PY'
import json, sys
with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    data = json.load(fh)
print(data.get('access_token', ''))
PY
"${LOGIN_TMP}")

if [[ -z "${ADMIN_TOKEN}" ]]; then
  fail "Could not extract admin access token"
fi

REGISTER_STATUS=$(curl -s -o "${REGISTER_TMP}" -w "%{http_code}" -X POST "${BACKEND_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"username": "testuser", "password": "Test1234", "full_name": "Test User", "role": "ke_toan"}')

echo "Register status: ${REGISTER_STATUS}" >> "${LOG_FILE}"
if [[ "${REGISTER_STATUS}" != "201" && "${REGISTER_STATUS}" != "400" ]]; then
  fail "Register endpoint returned unexpected status ${REGISTER_STATUS}"
fi

if curl -sf "${BACKEND_URL}/api/nhankhau" > /dev/null; then
  success "✅ API /nhankhau reachable"
else
  fail "API /nhankhau check failed"
fi


echo "[6/6] 🚀 Opening frontend..." | tee -a "${LOG_FILE}"
if command -v open >/dev/null 2>&1; then
  open "${FRONTEND_URL}" >> "${LOG_FILE}" 2>&1 || warn "⚠️ Could not auto-open browser with open"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${FRONTEND_URL}" >> "${LOG_FILE}" 2>&1 || warn "⚠️ Could not auto-open browser with xdg-open"
else
  warn "⚠️ No known browser opening command available"
fi

echo "==== LOCAL TEST COMPLETED SUCCESSFULLY ====" >> "${LOG_FILE}"
success "✅ All services healthy! Logs saved in ${LOG_FILE}"
