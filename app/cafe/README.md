# Cafe Đầu Hẻm — giao diện gọn và nhân vật riêng biệt

- Nền quán cà phê sân vườn được vẽ riêng, không còn người, tên nhân vật hoặc các khung giao diện dính sẵn trong ảnh nền.
- Giao diện HTML hiển thị một lần, tránh cảm giác bị phóng to/chồng UI.
- Khách quen được render thành sprite riêng trên các ghế; người chơi cũng xuất hiện như một nhân vật riêng.
- Có thể nhấn vào khách để mở trò chuyện nhóm và chọn tối đa 3 khách.
- Giữ chức năng gọi món, âm thanh, bảng khách quen và chuyển động nhân vật.

## Chạy thử
Mở `index.html` bằng trình duyệt hiện đại hoặc deploy toàn bộ thư mục lên Vercel. Giữ nguyên thư mục `assets` và `live`.

## Lưu ý
Chat vẫn là mô phỏng cục bộ; để nhiều thiết bị nhìn thấy nhau theo thời gian thực cần kết nối backend/Realtime.


## Cafe Đầu Hẻm — giao diện sân vườn

- `index.html` là màn hình quán cà phê tương tác.
- `assets/hall.svg` là phông nền sân vườn sạch, không có người hoặc bàn ghế được vẽ sẵn.
- Bàn tròn và bốn ghế mỗi bàn được vẽ bằng canvas để nhân vật có thể ngồi đúng vị trí.
- Khung hiển thị 9:16 được thu nhỏ nhẹ trên màn hình desktop để không chiếm hết chiều cao.
- Trò chuyện trong phiên bản hiện tại là demo phía trình duyệt; chưa phải chat realtime giữa nhiều người dùng.
