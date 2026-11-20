# 01. Nền tảng chung (Tuần 3–5)

## Git
- rebase vs merge, `reflog`, `bisect`, `cherry-pick`, `stash`.
- Chiến lược branch, commit message có nghĩa (xem `git log` của repo).
- Bài tập: cố ý làm hỏng một branch rồi cứu lại bằng `reflog`.

## HTTP / REST
- Status code đúng chỗ: 400 / 401 / 403 / 404 / 409 / 422.
- Idempotency (GET, PUT, DELETE vs POST), caching header.
- CORS và preflight; cookie flags: `HttpOnly`, `Secure`, `SameSite`, `Path`.
- Bài tập: dùng browser DevTools theo dõi luồng login → refresh trong app.

## SQL & MySQL
- Index (B-tree), đọc `EXPLAIN`, covering index.
- Transaction, isolation level, deadlock, row lock.
- Bài tập: tạo bảng 1 triệu dòng, so sánh query có/không index.

## Docker & CI
- Đọc `docker-compose` và workflow CI của repo, giải thích từng dòng.
- Biến môi trường, `.env` vs `.env.example`, secrets.

## Setup project từ số 0 (không AI)
- [ ] Dựng Spring Boot rỗng (Web, JPA, Security, Flyway, MySQL), 1 endpoint `/health`.
- [ ] Dựng Vite + React + TS rỗng, gọi được endpoint trên.
- [ ] Đối chiếu với cấu trúc repo này, ghi lại khác biệt và lý do.

## Câu tự kiểm tra
- Vì sao refresh token để path `/auth` còn access token path `/`?
- 401 và 403 khác nhau thế nào? Frontend dựa vào đâu để quyết định refresh?
- Khi nào index làm query chậm hơn?
