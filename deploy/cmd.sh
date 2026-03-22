#!/bin/bash

# --- 스크립트 설정 ---
set -eu -o pipefail

# [설정] 관리할 systemd 서비스 이름
readonly TARGET_SERVICE="across-relayer.service"

# --- 1. 도움말 함수 ---
print_usage() {
    echo "오류: 액션(action)이 필요합니다."
    echo ""
    echo "사용법: $0 <action>"
    echo "액션 목록:"
    echo "  start    - 서비스 시작 및 로그 표시 (sudo 필요)"
    echo "  stop     - 서비스 중지 (sudo 필요)"
    echo "  restart  - 서비스 재시작 (sudo 필요)"
    echo "  status   - 서비스 상태 확인"
    echo "  enable   - 부팅 시 자동 시작 활성화 (sudo 필요)"
    echo "  disable  - 부팅 시 자동 시작 비활성화 (sudo 필요)"
    echo "  log      - 실시간 로그 보기 (Ctrl+C로 종료)"
    echo "  edit     - 서비스 설정 파일 편집 (sudo 필요)"
}

# --- 2. 파라미터 확인 ---
if [[ -z "${1-}" ]]; then
    print_usage
    exit 1
fi

readonly ACTION=$1

# --- 3. 액션 실행 ---
case "$ACTION" in
    start)
        echo "--- '${ACTION}' 실행: ${TARGET_SERVICE} (sudo 필요) ---"
        sudo systemctl "$ACTION" "$TARGET_SERVICE"
        echo "--- 완료 ---"
        echo "--- 서비스 시작됨, 실시간 로그를 표시합니다 (Ctrl+C로 종료) ---"
        journalctl -f -u "$TARGET_SERVICE" -n 50 --no-pager
        ;;

    stop|restart|enable|disable)
        echo "--- '${ACTION}' 실행: ${TARGET_SERVICE} (sudo 필요) ---"
        sudo systemctl "$ACTION" "$TARGET_SERVICE"
        echo "--- 완료 ---"
        ;;

    status)
        echo "--- 상태 확인: ${TARGET_SERVICE} ---"
        systemctl status "$TARGET_SERVICE" || true
        ;;

    log)
        echo "--- 실시간 로그: ${TARGET_SERVICE} (Ctrl+C로 종료) ---"
        journalctl -fu "$TARGET_SERVICE"
        ;;

    edit)
        echo "--- 서비스 파일 편집: ${TARGET_SERVICE} (sudo 필요) ---"
        sudo systemctl edit --full "$TARGET_SERVICE"
        echo "--- 서비스 파일이 업데이트되었습니다. ---"
        ;;

    *)
        echo "알 수 없는 액션입니다: $ACTION"
        print_usage
        exit 1
        ;;
esac
