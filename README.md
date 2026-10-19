# Quiz Live

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
