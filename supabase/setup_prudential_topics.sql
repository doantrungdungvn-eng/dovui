-- Đố Vui Online Miễn Phí: tạo bảng lưu các bộ chủ đề nếu chưa tồn tại.
-- Chạy đoạn này một lần trong Supabase SQL Editor trước khi mở chủ đề trên website.
create extension if not exists pgcrypto;

create table if not exists public.quiz_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  code_prefix text not null check (code_prefix ~ '^[A-Z0-9]{2,5}$'),
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions)='array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quiz_topics_code_prefix_idx
  on public.quiz_topics(code_prefix);

alter table public.quiz_topics enable row level security;

drop policy if exists "topics readable" on public.quiz_topics;
create policy "topics readable" on public.quiz_topics
  for select to anon, authenticated using (true);

drop policy if exists "topics create" on public.quiz_topics;
create policy "topics create" on public.quiz_topics
  for insert to anon, authenticated with check (true);

drop policy if exists "topics update" on public.quiz_topics;
create policy "topics update" on public.quiz_topics
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "topics delete" on public.quiz_topics;
create policy "topics delete" on public.quiz_topics
  for delete to anon, authenticated using (true);


-- Thêm/cập nhật bộ câu hỏi Prudential (20 câu).
-- UPDATE TOPIC: PRUDENTIAL
-- Đố Vui Online Miễn Phí schema: public.quiz_topics(name, code_prefix, questions)
-- Chạy trong Supabase Dashboard > SQL Editor.
-- Script chỉ thêm/cập nhật chủ đề Prudential; không xóa phòng chơi hay kết quả hiện có.
-- Nếu đã có chủ đề code_prefix = 'PRU', questions sẽ được thay bằng bộ 20 câu bên dưới.

insert into public.quiz_topics (name, code_prefix, questions, updated_at)
values (
  'Prudential',
  'PRU',
  '[{"prompt": "Prudential Việt Nam chính thức hoạt động từ năm nào?", "options": ["1995", "1999", "2005", "2010"], "correct_index": 1, "seconds": 15, "points": 1000}, {"prompt": "Khẩu hiệu của Prudential Việt Nam là gì?", "options": ["Sống vui mỗi ngày", "Lắng nghe. Thấu hiểu. Hành động.", "Vươn tới thành công", "Bảo vệ mọi ước mơ"], "correct_index": 1, "seconds": 15, "points": 1000}, {"prompt": "Tập đoàn Prudential được thành lập tại thành phố nào?", "options": ["Paris", "New York", "London", "Singapore"], "correct_index": 2, "seconds": 15, "points": 1000}, {"prompt": "Prudential Việt Nam hoạt động chủ yếu trong lĩnh vực nào?", "options": ["Bất động sản", "Bảo hiểm nhân thọ và đầu tư tài chính", "Du lịch", "Sản xuất ô tô"], "correct_index": 1, "seconds": 15, "points": 1000}, {"prompt": "Cổng thông tin khách hàng Prudential hỗ trợ việc gì?", "options": ["Quản lý thông tin hợp đồng và theo dõi yêu cầu", "Đặt vé máy bay", "Mua sắm siêu thị", "Làm hộ chiếu"], "correct_index": 0, "seconds": 15, "points": 1000}, {"prompt": "Mục đích chính của bảo hiểm nhân thọ là gì?", "options": ["Đảm bảo mọi người đều giàu có", "Hỗ trợ bảo vệ tài chính trước rủi ro theo hợp đồng", "Thay thế hoàn toàn mọi khoản tiết kiệm", "Cam kết lợi nhuận cao trong mọi trường hợp"], "correct_index": 1, "seconds": 15, "points": 1000}, {"prompt": "Trước khi ký hợp đồng bảo hiểm, khách hàng nên làm gì?", "options": ["Chỉ xem quà tặng", "Đọc và hiểu quyền lợi, phí, điều khoản loại trừ", "Chỉ nghe giới thiệu rồi ký ngay", "Bỏ qua tài liệu hợp đồng"], "correct_index": 1, "seconds": 15, "points": 1000}, {"prompt": "Phí bảo hiểm là gì?", "options": ["Khoản tiền đóng theo thỏa thuận trong hợp đồng", "Tiền thưởng luôn được nhận", "Khoản vay không cần hoàn trả", "Phí chỉ đóng khi có yêu cầu bồi thường"], "correct_index": 0, "seconds": 15, "points": 1000}, {"prompt": "Người thụ hưởng là ai?", "options": ["Người bán hợp đồng", "Người được chỉ định nhận quyền lợi bảo hiểm khi đáp ứng điều kiện hợp đồng", "Bất kỳ người nào biết mã hợp đồng", "Luôn là tư vấn viên"], "correct_index": 1, "seconds": 15, "points": 1000}, {"prompt": "Khi thay đổi số điện thoại hoặc địa chỉ, khách hàng nên làm gì?", "options": ["Không cần thông báo", "Cập nhật với Prudential theo quy trình chính thức", "Chỉ báo cho bạn bè", "Tạo hợp đồng mới ngay lập tức"], "correct_index": 1, "seconds": 15, "points": 1000}, {"prompt": "Khi yêu cầu giải quyết quyền lợi bảo hiểm, khách hàng nên làm gì?", "options": ["Chuẩn bị hồ sơ theo hướng dẫn chính thức", "Gửi thông tin không liên quan", "Chỉ gửi tin nhắn cho người quen", "Không cần cung cấp giấy tờ"], "correct_index": 0, "seconds": 15, "points": 1000}, {"prompt": "Điều khoản loại trừ trong hợp đồng có ý nghĩa gì?", "options": ["Liệt kê các trường hợp không thuộc phạm vi chi trả theo hợp đồng", "Cam kết mọi yêu cầu đều được chi trả", "Cho biết quà tặng của khách hàng", "Là danh sách nhân viên công ty"], "correct_index": 0, "seconds": 15, "points": 1000}, {"prompt": "Sản phẩm bảo hiểm liên kết đầu tư thường kết hợp yếu tố nào?", "options": ["Bảo hiểm và đầu tư theo điều khoản sản phẩm", "Du lịch và mua sắm", "Vay mua xe và vé máy bay", "Chỉ có tiền thưởng cố định"], "correct_index": 0, "seconds": 15, "points": 1000}, {"prompt": "Khi tìm hiểu sản phẩm bảo hiểm sức khỏe, khách hàng cần xem gì?", "options": ["Phạm vi bảo hiểm, hạn mức, điều kiện và loại trừ", "Chỉ màu sắc tài liệu", "Chỉ tên tư vấn viên", "Chỉ quà tặng đi kèm"], "correct_index": 0, "seconds": 15, "points": 1000}, {"prompt": "Nếu khách hàng chưa hiểu quyền lợi sản phẩm, tư vấn viên nên làm gì?", "options": ["Giải thích rõ ràng và hướng dẫn đọc điều khoản", "Thúc giục ký ngay", "Bỏ qua câu hỏi", "Hứa chắc chắn mọi trường hợp đều được chi trả"], "correct_index": 0, "seconds": 15, "points": 1000}, {"prompt": "Khi khách hỏi mức chi trả cụ thể, cách trả lời phù hợp là gì?", "options": ["Tự đưa ra con số chắc chắn", "Kiểm tra hợp đồng và quy định áp dụng trước khi tư vấn", "Nói mọi hợp đồng đều giống nhau", "Đoán theo kinh nghiệm"], "correct_index": 1, "seconds": 15, "points": 1000}, {"prompt": "Điều gì giúp xây dựng niềm tin với khách hàng?", "options": ["Minh bạch, lắng nghe và hỗ trợ có trách nhiệm", "Chỉ tập trung bán hàng", "Đưa ra lời hứa không có căn cứ", "Che giấu điều khoản"], "correct_index": 0, "seconds": 15, "points": 1000}, {"prompt": "Khi khách hàng gặp khó khăn với dịch vụ trực tuyến, nên làm gì?", "options": ["Hướng dẫn sử dụng và chỉ đến kênh hỗ trợ chính thức", "Yêu cầu gửi mật khẩu cho người lạ", "Bỏ mặc khách hàng", "Đăng thông tin cá nhân lên mạng"], "correct_index": 0, "seconds": 15, "points": 1000}, {"prompt": "Cách xử lý thông tin hợp đồng khách hàng đúng là gì?", "options": ["Chia sẻ công khai để tiện trao đổi", "Bảo mật và chỉ sử dụng đúng mục đích được phép", "Gửi cho bất kỳ ai hỏi", "Lưu mật khẩu ở nơi công cộng"], "correct_index": 1, "seconds": 15, "points": 1000}, {"prompt": "Nếu khách muốn hủy hợp đồng vì chưa hiểu quyền lợi, tư vấn viên nên làm gì?", "options": ["Lắng nghe, giải thích lựa chọn và hệ quả để khách tự quyết", "Gây áp lực để khách không được hủy", "Tự ý giữ giấy tờ của khách", "Hứa hoàn tiền trong mọi trường hợp"], "correct_index": 0, "seconds": 15, "points": 1000}]'::jsonb,
  now()
)
on conflict (code_prefix)
do update set
  name = excluded.name,
  questions = excluded.questions,
  updated_at = now();

-- Kiểm tra chủ đề sau khi cập nhật:
select id, name, code_prefix, jsonb_array_length(questions) as total_questions, updated_at
from public.quiz_topics
where code_prefix = 'PRU';
