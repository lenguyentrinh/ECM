# 03. Frontend sâu: React + TypeScript (Tuần 14–20)

## Tuần 14–15: JS/TS nền
- Event loop, microtask vs macrotask, closure, promise/async-await.
- TypeScript: generics, discriminated union, `unknown` vs `any`, narrowing, utility types (`Pick`, `Omit`, `Partial`, `ReturnType`).
- Strict mode: vì sao bật, lỗi thường gặp.

## Tuần 16–18: React & state
- Render cycle, reconciliation, `key`, stale closure.
- `useEffect`: dùng đúng/sai, cleanup, dependency. `useMemo`/`useCallback` khi nào cần.
- Redux Toolkit: slice, thunk, normalized state.
- Đọc `src/shared/api/resource`: tự giải thích `useResource`, `useAction`, `cache.invalidate`.
- Form: React Hook Form + Zod, validate 2 lớp (FE UX, BE bắt buộc).

## Tuần 19–20: Kiến trúc & hiệu năng
- Feature-based structure; tách logic khỏi UI; `*Api.ts` và `types.ts`.
- Axios interceptor trong `shared/api/client.ts`: một lần refresh dùng chung rồi replay (xử lý race condition).
- `RequireAuth` và `safeReturnPath`: open redirect là gì.
- Code splitting, bundle size, Core Web Vitals, accessibility cơ bản.
- Vì sao reset store khi đổi user (rò rỉ dữ liệu giữa phiên).

## Bài tập
- [ ] Tự viết lại 1 trang (ví dụ lịch dạy) từ đầu, so với bản AI.
- [ ] Viết 1 custom hook có generics và test.
- [ ] Đo bundle bằng analyzer, giảm ít nhất 1 chunk lớn.
- [ ] Giả lập token hết hạn khi 5 request song song, quan sát chỉ có 1 lần refresh.

## Câu tự kiểm tra
- Vì sao dùng cookie HttpOnly thay vì `localStorage` cho token?
- `useEffect` chạy 2 lần trong dev (StrictMode) nói lên điều gì về code của bạn?
- Menu ẩn theo role có phải là bảo mật không?
