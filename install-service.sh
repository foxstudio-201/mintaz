#!/bin/bash

# Script để cài đặt Mintaz như một systemd service
# Tự động chạy khi máy khởi động

set -e

# Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Vui lòng chạy script này với sudo"
  echo "   sudo $0"
  exit 1
fi

INSTALL_DIR="/media/D/mintaz"
SERVICE_USER="${SUDO_USER:-$USER}"
SERVICE_NAME="mintaz-api"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
TEMPLATE_FILE="${INSTALL_DIR}/deploy/systemd/mintaz-api.service"

echo "🚀 Cài đặt Mintaz systemd service..."
echo ""

# Kiểm tra template có tồn tại không
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "❌ Không tìm thấy template: $TEMPLATE_FILE"
  exit 1
fi

# Kiểm tra backend/.env có tồn tại không
if [ ! -f "${INSTALL_DIR}/backend/.env" ]; then
  echo "❌ Không tìm thấy file cấu hình: ${INSTALL_DIR}/backend/.env"
  echo "   Vui lòng chạy setup.sh trước"
  exit 1
fi

echo "📝 Tạo systemd service file..."
# Thay thế placeholders trong template
sed -e "s|__USER__|${SERVICE_USER}|g" \
    -e "s|__INSTALL_DIR__|${INSTALL_DIR}|g" \
    "$TEMPLATE_FILE" > "$SERVICE_FILE"

echo "✅ Đã tạo service file: $SERVICE_FILE"
echo ""

echo "🔄 Reload systemd daemon..."
systemctl daemon-reload
echo "✅ Đã reload systemd"
echo ""

echo "⚙️  Enable service để tự động chạy khi khởi động..."
systemctl enable "$SERVICE_NAME"
echo "✅ Đã enable $SERVICE_NAME"
echo ""

echo "🚀 Start service..."
systemctl start "$SERVICE_NAME"
echo "✅ Đã start $SERVICE_NAME"
echo ""

# Kiểm tra trạng thái
echo "📊 Trạng thái service:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "✅ Service đang CHẠY"
else
  echo "❌ Service KHÔNG chạy"
  echo ""
  echo "Xem logs với lệnh:"
  echo "   journalctl -u $SERVICE_NAME -n 50 --no-pager"
  exit 1
fi

if systemctl is-enabled --quiet "$SERVICE_NAME"; then
  echo "✅ Service đã được ENABLE (tự động chạy khi boot)"
else
  echo "❌ Service CHƯA được enable"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Hoàn tất! Mintaz sẽ tự động chạy khi máy khởi động."
echo ""
echo "📋 Các lệnh hữu ích:"
echo "   Xem logs:        journalctl -u $SERVICE_NAME -f"
echo "   Restart:         sudo systemctl restart $SERVICE_NAME"
echo "   Stop:            sudo systemctl stop $SERVICE_NAME"
echo "   Status:          systemctl status $SERVICE_NAME"
echo ""
