#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 -b <blog-id> -t <blog-title>
  -b BLOG_ID      ブログの識別子 (例: gauss0jp)
  -t BLOG_TITLE   ブログのタイトル (例: "ガウスの旅のブログ")
  -h              このヘルプを表示
Example:
  $0 -b gauss0jp -t "ガウスの旅のブログ"
EOF
  exit 1
}

BLOG_ID=""
BLOG_TITLE=""

while getopts "b:t:h" opt; do
  case "$opt" in
    b) BLOG_ID="$OPTARG" ;;
    t) BLOG_TITLE="$OPTARG" ;;
    h) usage ;;
    *) usage ;;
  esac
done

# 必須チェック
if [[ -z "$BLOG_ID" || -z "$BLOG_TITLE" ]]; then
  echo "Error: -b と -t は必須です。" >&2
  usage
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get project root (2 levels up from scripts/goo-blog/)
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# ignore file in same directory as script
IGNORE_FILE="${SCRIPT_DIR}/ignorelist.blog.goo.ne.jp.txt"

# 動的に組み立てるのは URL と p パラメータだけ
BASE="blog.goo.ne.jp/${BLOG_ID}"
URL="https://${BASE}"

cd "${PROJECT_ROOT}"
npm run start -- \
  -u "${URL}" \
  -s "${BLOG_TITLE}" \
  -i "${IGNORE_FILE}" \
  -p "${BASE}" \
  -q fm -q st

