# 04. Tư duy Senior (Tuần 21–26)

## System design cơ bản
- Cache, queue, rate limit phân tán (thay in-memory bằng Redis?), scale ngang, stateless.
- Khi nào tách service, khi nào giữ monolith modular (như repo này).
- Bài tập: thiết kế thêm thông báo email bất đồng bộ; vẽ sơ đồ, nêu điểm lỗi.

## Ra quyết định: ADR
Viết 3 ADR ngắn (bối cảnh, lựa chọn, đánh đổi, hậu quả):
- [ ] Flyway thay vì để Hibernate tự tạo schema.
- [ ] Cookie HttpOnly thay vì token trong JSON.
- [ ] Redux `resources` slice thay vì thư viện fetch riêng.

## Vận hành
- Health check, cấu hình theo môi trường, secrets, backup/restore DB.
- Rollback migration: vì sao khó, cách giảm rủi ro (expand/contract).
- Log và metric: một sự cố cần những dữ liệu nào để điều tra?

## Code review & giao tiếp
- Review PR của người khác: nêu lý do, phân biệt "phải sửa" và "gợi ý".
- Viết PR description: vì sao, thay đổi gì, cách test, rủi ro.

## Debug có hệ thống
Tái hiện → cô lập → giả thuyết → kiểm chứng → sửa → thêm test chống lặp lại.
- [ ] Chọn 1 bug cũ trong lịch sử git, tự điều tra lại theo quy trình trên.

## Câu tự kiểm tra
- Nếu lượng người dùng tăng 100 lần, thành phần nào của hệ thống này hỏng đầu tiên?
- Một migration đã chạy ở production bị sai, bạn làm gì?
