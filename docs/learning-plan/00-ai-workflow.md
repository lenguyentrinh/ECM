# 00. Làm việc với AI như một engineer (Tuần 1–2)

## Học gì

### 1. Context files cho AI
- Đọc `CLAUDE.md` và `.claude/rules/security.md`. Phân biệt:
  - Nên ghi: quy ước, ràng buộc, quyết định không hiển nhiên, lệnh chạy/test.
  - Không nên ghi: thứ code đã tự thể hiện, thông tin dễ lỗi thời.
- Hiểu vì sao rule bảo mật đặt riêng (áp dụng mọi nơi) còn domain rule nằm trong `CLAUDE.md`.
- Hiểu skills (`review-change`, `verify`) và agents: khi nào dùng cái nào.

### 2. Cách giao việc (prompt tốt)
Một yêu cầu gồm đủ 4 phần:
- **Mục tiêu:** làm gì, vì sao.
- **Ràng buộc:** không đụng gì, theo pattern nào.
- **Phạm vi:** file/module liên quan.
- **Tiêu chí xong:** test nào phải xanh, hành vi nào phải đúng.

### 3. Review code AI
Với mỗi diff, hỏi 5 câu:
1. Ai được gọi endpoint này? (authorization)
2. Input xấu thì sao? (validation)
3. Có N+1 query / query không index không?
4. Lỗi giữa chừng thì dữ liệu ra sao? (transaction)
5. Có test cho nhánh lỗi chưa?

## Bài tập
- [ ] Tự viết 1 skill mới: "checklist thêm module backend".
- [ ] Chọn 1 tính năng nhỏ, giao AI làm, rồi viết bản review ≥ 5 điểm bạn tự tìm ra.
- [ ] Sửa 1 chỗ trong `CLAUDE.md` mà bạn thấy chưa rõ, giải thích lý do.

## Câu tự kiểm tra
- Vì sao không nên nhét toàn bộ cấu trúc thư mục vào `CLAUDE.md`?
- Khi AI sinh code chạy được nhưng bạn không hiểu, bước tiếp theo là gì?
