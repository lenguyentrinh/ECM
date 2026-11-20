# 02. Backend sâu: Spring Boot (Tuần 6–13)

## Tuần 6–8: Java & Spring cốt lõi
- Java hiện đại: record, sealed, Optional, stream, concurrency cơ bản.
- IoC/DI, bean lifecycle, proxy. Vì sao `@Transactional` không chạy khi gọi nội bộ cùng class (self-invocation).
- JPA/Hibernate: lazy vs eager, persistence context, dirty checking, `LazyInitializationException`.
- N+1 và cách xử lý: `join fetch`, `EntityGraph`, batch size.
- Flyway: không sửa migration đã apply, đổi schema bằng `V<n>__*.sql` mới, đồng bộ entity.
- Đọc: `UserServiceImpl.changeRole` (transaction + nhiều bước nghiệp vụ).

## Tuần 9–11: Bảo mật & thiết kế
- Spring Security: filter chain, `AuthenticationEntryPoint` (vì sao trả 401), method security.
- JWT vs session; refresh token rotation + reuse detection (đọc `RefreshTokenServiceImpl`).
- OTP: HMAC hash, TTL, giới hạn thử, cooldown, rate limit (`AuthRateLimitFilter`).
- OWASP Top 10, user enumeration, IDOR, mass assignment.
- Authorization: `#id == authentication.principal.id`, vai trò đọc lại từ DB mỗi request (đánh đổi?).

## Tuần 12–13: Chất lượng
- Test pyramid: unit, slice (`@DataJpaTest`, `@WebMvcTest`), integration.
- H2 vs MySQL thật: vì sao trigger chỉ test được ở `RoutinesMySqlTest`.
- Xử lý lỗi tập trung (`@ControllerAdvice`), validation tại DTO.
- Pagination, logging có cấu trúc, metrics cơ bản.

## Bài tập thực chiến
- [ ] Thêm module `invoice` hoàn chỉnh: migration, entity, repository, service, controller, DTO, mapper.
- [ ] Phân quyền: ADMIN ghi, STUDENT chỉ đọc hóa đơn của mình (test IDOR).
- [ ] Viết tay service + test; AI chỉ được review.
- [ ] Viết 1 test chứng minh N+1, rồi sửa nó.

## Câu tự kiểm tra
- Điều gì xảy ra nếu hai request refresh cùng token đến cùng lúc? Vì sao có grace window 10s?
- Vì sao `forgot-password` luôn trả cùng một câu trả lời?
- Rate limit in-memory hỏng thế nào khi chạy 2 instance?
- `@Transactional` mặc định rollback với exception nào?
