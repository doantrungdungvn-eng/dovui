# Đố Vui Online Free

Ứng dụng quiz trực tiếp phong cách Kahoot: MC/TV, người chơi trên điện thoại, bảng xếp hạng TOP 10, quản lý câu hỏi và nhập Excel/CSV.

## Tính năng
- Next.js 14 + TypeScript, giao diện responsive desktop/mobile.
- Supabase Postgres + Realtime.
- Tạo phòng có mã riêng; người chơi tham gia bằng mã.
- MC bắt đầu câu hỏi, khóa câu hỏi, công bố đáp án, chuyển câu và kết thúc.
- Tính điểm dựa trên câu đúng và tốc độ.
- Bảng xếp hạng TOP 10, lưu điểm vào database.
- Nhập Excel/CSV; mẫu cột: `question, A, B, C, D, correct, seconds, points`.
- RPC `submit_quiz_answer` kiểm tra phòng/câu hỏi/thời hạn và unique constraint chống trả lời hai lần.

## Chạy local
1. Cài Node.js 20+.
2. Sao chép `.env.example` thành `.env.local`.
3. Điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` từ Supabase Project Settings → API.
4. Trong Supabase SQL Editor, chạy toàn bộ `supabase/schema.sql`.
5. Cài và chạy:
   ```bash
   npm install
   npm run dev
   ```
6. Mở `http://localhost:3000`.

## Deploy Vercel
1. Đưa thư mục dự án lên GitHub.
2. Vercel → Add New → Project → Import repository.
3. Project Settings → Environment Variables, thêm:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Mỗi lần sửa mã, push GitHub để Vercel tự build lại.

## Kiểm tra sau triển khai
- Mở website trên máy tính và điện thoại.
- Admin/MC tạo phòng; dùng mã trên điện thoại để tham gia.
- MC bắt đầu câu, người chơi trả lời; kiểm tra điểm TOP 10 và refresh trang.
- Nếu Realtime không cập nhật, kiểm tra `supabase_realtime` publication và table replication.

## Lưu ý bảo mật quan trọng trước khi dùng sự kiện thật
Bản khởi tạo này là MVP mẫu để dễ cài đặt và thử nghiệm. Các chính sách RLS trong `schema.sql` cho phép truy cập công khai để người chơi có thể vào phòng không cần tài khoản. Để sử dụng với dữ liệu nhạy cảm hoặc giải thưởng giá trị:
- Bắt buộc đăng nhập Supabase Auth cho admin; giới hạn quyền quản lý bằng role/owner.
- Chuyển thao tác MC (tạo phòng, sửa trạng thái) qua API server có xác thực.
- Không cho client đọc `correct_index` trước khi MC công bố; tách đáp án đúng vào bảng riêng hoặc chỉ trả câu hỏi qua server API.
- Không cho client tự quyết định `p_score`; tính điểm hoàn toàn trong RPC dựa trên `question_started_at`, `question_ends_at`, đáp án và `clock_timestamp()`.
- Cần xác thực quyền sở hữu `player_id` với phiên người chơi, giới hạn rate và chống giả mạo ID.
- Không bao giờ đưa `service_role` key vào biến `NEXT_PUBLIC_*` hay frontend.


## Mật khẩu trang quản trị

Trong Vercel, mở **Project → Settings → Environment Variables** và thêm biến server-only `ADMIN_PASSWORD` với mật khẩu dài, khó đoán. Không đặt tên biến này có tiền tố `NEXT_PUBLIC_`. Sau khi lưu, redeploy project. Khi mở tab **Quản trị**, nhập mật khẩu này để mở khóa giao diện; nút **Khóa trang** sẽ khóa lại.

Lưu ý bảo mật: đây là lớp khóa giao diện quản trị, còn quyền ghi dữ liệu phải được bảo vệ riêng bằng Supabase Row Level Security (RLS) và xác thực phía máy chủ. Không dùng giao diện khóa mật khẩu thay cho chính sách RLS khi triển khai công khai.

## Nhóm câu hỏi theo chủ đề
- Trong **Quản trị**, tạo nhóm như Đố vui tổng hợp, Khoa học, Lịch sử, Tiếng Anh, Âm nhạc hoặc chủ đề sự kiện.
- Nhập/tạo câu hỏi rồi lưu nhóm; các nhóm được lưu trong bảng `quiz_topics` của Supabase và có thể dùng lại.
- Mỗi nhóm có mã tiền tố 2–5 ký tự do quản trị thiết lập. Khi tạo phòng, hệ thống dùng tiền tố đó cộng thêm 3 ký tự ngẫu nhiên để tạo mã phòng duy nhất (ví dụ `KHOA7F2`), tránh trùng với phòng cũ.
- Ở màn hình **MC / TV**, chọn chủ đề trước khi tạo phòng. Mã phòng và QR được tạo theo chủ đề đã chọn.
- Nếu đã cài bản cũ, chạy lại toàn bộ `supabase/schema.sql` trong Supabase SQL Editor để tạo bảng `quiz_topics` và các policy liên quan trước khi dùng tính năng này.


## Chủ đề Prudential
1. Trong Supabase SQL Editor, chạy `supabase/setup_prudential_topics.sql` để tạo bảng `quiz_topics` (nếu thiếu), bật RLS policies và thêm/cập nhật 20 câu hỏi Prudential.
2. Deploy phiên bản source mới lên Vercel.
3. Mở lại tab MC / TV; danh sách chủ đề sẽ tải từ `quiz_topics`.


## Kiểm thử tự động 20 người

Các lệnh dưới đây dùng Playwright để mở 20 trình duyệt độc lập. Bài kiểm thử không thay thế việc quan sát Vercel/Supabase và không thể tự khẳng định hệ thống ổn định nếu chỉ chạy một lần.

### Cài đặt

```bash
npm install
npx playwright install chromium
```

### 1. Kiểm tra 20 lượt truy cập trang chủ

Windows PowerShell:

```powershell
$env:BASE_URL="https://dovui-nu.vercel.app"
$env:USERS="20"
npm run test:load
```

Kết quả được ghi vào `test-results/report.json`. Bài test ghi nhận HTTP status, thời gian tải, lỗi JavaScript và các mốc thời gian min/median/p95/max.

### 2. Kiểm tra 20 người cùng tham gia một phòng

**Chỉ dùng mã phòng thử nghiệm**, không dùng phòng sự kiện thật vì script tạo 20 người chơi trong Supabase.

1. Mở website, vào màn hình MC/TV và tạo một phòng thử nghiệm.
2. Đảm bảo phòng đang ở trạng thái chờ (lobby), chưa bắt đầu câu hỏi.
3. Chạy lệnh PowerShell, thay `ABC123` bằng mã phòng vừa tạo:

```powershell
$env:BASE_URL="https://dovui-nu.vercel.app"
$env:USERS="20"
$env:ROOM_CODE="ABC123"
$env:JOIN_ROOM="true"
npm run test:load
```

Bài test cố gắng tạo 20 người chơi tên `TEST-01` đến `TEST-20`, rồi kiểm tra giao diện báo đã vào phòng. Sau đó kiểm tra màn hình MC xem số người chơi có tăng lên 20 không. Xóa dữ liệu thử nghiệm sau khi hoàn tất nếu cần.

### Cách đọc kết quả

- `successfulLoads`: số lượt có HTTP 2xx/3xx và trang tải được.
- `failedLoads`: lượt tải lỗi hoặc timeout.
- `successfulJoins`: số người test nhìn thấy giao diện đã vào phòng; kiểm tra thêm danh sách người chơi ở MC để xác nhận trên database.
- `p95`: 95% lượt tải hoàn tất trong khoảng thời gian này hoặc nhanh hơn.
- `errors`: lỗi JavaScript/console hoặc lỗi thao tác.

### Giới hạn cần biết

- Đây là kiểm thử trình duyệt mức cơ bản; không tự động bấm đáp án và xác nhận tính điểm.
- 20 context chạy trên cùng một máy tính không hoàn toàn tương đương 20 điện thoại/mạng độc lập.
- Bài test có thể tạo dữ liệu người chơi thật trong dự án Supabase cấu hình hiện tại. Dùng phòng thử nghiệm, không chạy lặp trên phòng sự kiện thật.
- Không chạy số lượng lớn trên production nếu chưa được phép; tăng tải từ từ và theo dõi Vercel Logs/Observability cùng Supabase Database/Realtime.
