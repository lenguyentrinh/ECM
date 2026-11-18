-- =====================================================================================================================
-- TRIGGER của hệ thống English Center (MySQL 8)
-- =====================================================================================================================
--
-- FILE NÀY LÀ GÌ?
--   Đây là migration LẶP LẠI của Flyway (tên bắt đầu bằng "R__", không có số version).
--   - Flyway chạy các file V1, V2, ... đúng một lần, rồi mới chạy file R__ này.
--   - Mỗi lần backend khởi động, Flyway so checksum của file. Nếu bạn SỬA file này thì nó tự chạy lại; nếu không sửa
--     thì bỏ qua. => Muốn đổi trigger: sửa thẳng trong file này, KHÔNG tạo file V mới.
--   - Vì có thể chạy lại nhiều lần nên mọi object đều "DROP ... IF EXISTS" rồi "CREATE" lại (idempotent).
--
-- DELIMITER LÀ GÌ?
--   Thân trigger chứa nhiều dấu ";" nên phải đổi dấu kết thúc câu lệnh thành "$$" để MySQL (và Flyway)
--   không cắt nhầm giữa chừng. Cuối file đặt lại về ";".
--
-- CÁC OBJECT TRONG FILE:
--   trg_enrollments_before_insert   TRIGGER    chặn 1 học viên có 2 ghi danh ACTIVE trong cùng 1 lớp
--   trg_enrollments_after_update    TRIGGER    ghi lịch sử đổi status ghi danh vào bảng enrollment_audit (tạo ở V2)
--   trg_attendance_before_insert    TRIGGER    status điểm danh chỉ được là PRESENT / ABSENT / LATE (khi thêm mới)
--   trg_attendance_before_update    TRIGGER    như trên, khi cập nhật
--
-- QUY ƯỚC BÁO LỖI:
--   Trigger dùng SIGNAL SQLSTATE '45000' + MESSAGE_TEXT để hủy câu lệnh vi phạm. Java đã kiểm tra các luật này trước
--   (ví dụ ghi danh trùng), nên trigger chỉ là lớp bảo vệ thêm ở tầng database cho các nguồn ghi dữ liệu khác (xem giới hạn ở từng trigger).
--
-- QUYỀN KHI CHẠY MIGRATION NÀY:
--   MySQL 8 bật binary log mặc định. Với user KHÔNG phải root/SUPER, CREATE TRIGGER sẽ lỗi 1419 trừ khi
--   server đặt log_bin_trust_function_creators=1 (hoặc cấp quyền SUPER cho user chạy app). Dev dùng root nên không sao;
--   khi deploy hãy kiểm tra điều này, nếu không backend sẽ không khởi động được.
-- =====================================================================================================================

DELIMITER $$

-- ---------------------------------------------------------------------------------------------------------------------
-- 1) TRIGGER trg_enrollments_before_insert: một học viên chỉ có 1 ghi danh ACTIVE trong mỗi lớp
-- ---------------------------------------------------------------------------------------------------------------------
-- Chạy TỰ ĐỘNG trước mỗi INSERT vào enrollments, bất kể ai insert (API, script, gõ tay).
-- Lý do cần: MySQL không có partial unique index (chỉ unique cho các dòng ACTIVE), nên luật này trước đây chỉ do
-- code Java giữ. Trigger chặn được ghi danh trùng do script / người gõ tay / code quên kiểm tra. Ghi danh đã HỦY
-- (CANCELLED) thì được phép trùng.
-- GIỚI HẠN: đây là "kiểm tra rồi mới insert", không khóa gì. Với InnoDB (REPEATABLE READ) hai giao dịch chạy ĐỒNG THỜI
-- không thấy dòng chưa commit của nhau nên cả hai vẫn có thể qua => KHÔNG chống được race. Muốn chặn tuyệt đối cần
-- unique index trên cột sinh (generated column) chỉ có giá trị khi status = 'ACTIVE' (thêm bằng một file V<n> mới).
-- NEW = dòng sắp được insert.
DROP TRIGGER IF EXISTS trg_enrollments_before_insert$$

CREATE TRIGGER trg_enrollments_before_insert
BEFORE INSERT ON enrollments
FOR EACH ROW
BEGIN
    IF NEW.status = 'ACTIVE' AND EXISTS (
        SELECT 1 FROM enrollments
        WHERE course_id = NEW.course_id AND student_id = NEW.student_id AND status = 'ACTIVE') THEN
        -- SIGNAL hủy luôn câu INSERT đang chạy
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student is already enrolled in this course';
    END IF;
END$$


-- ---------------------------------------------------------------------------------------------------------------------
-- 2) TRIGGER trg_enrollments_after_update: ghi lịch sử đổi trạng thái ghi danh
-- ---------------------------------------------------------------------------------------------------------------------
-- Chạy TỰ ĐỘNG sau mỗi UPDATE trên enrollments (ví dụ hủy ghi danh: ACTIVE -> CANCELLED, hoặc hủy hàng loạt khi đổi
-- role / xóa học viên). Mỗi lần status đổi sẽ thêm 1 dòng vào enrollment_audit (bảng tạo ở V2__enrollment_audit.sql).
-- OLD = dòng trước khi sửa, NEW = dòng sau khi sửa.
-- Giới hạn: DB không biết "ai" đổi (không có user của app), chỉ biết "cái gì đổi và lúc nào".
-- Bảng enrollment_audit (V2) cố ý KHÔNG có khóa ngoại tới enrollments: dòng audit phải sống lâu hơn dòng nó mô tả.
DROP TRIGGER IF EXISTS trg_enrollments_after_update$$

CREATE TRIGGER trg_enrollments_after_update
AFTER UPDATE ON enrollments
FOR EACH ROW
BEGIN
    -- "<=>" là so sánh an toàn với NULL; chỉ ghi khi status THỰC SỰ đổi (update các cột khác thì bỏ qua).
    IF NOT (OLD.status <=> NEW.status) THEN
        INSERT INTO enrollment_audit (enrollment_id, old_status, new_status)
        VALUES (OLD.id, OLD.status, NEW.status);
    END IF;
END$$


-- ---------------------------------------------------------------------------------------------------------------------
-- 3) TRIGGER trg_attendance_before_insert / trg_attendance_before_update: kiểm tra status điểm danh
-- ---------------------------------------------------------------------------------------------------------------------
-- Cột attendance.status là chuỗi tự do (Attendance.java dùng String, không có enum/constraint), nên gõ sai như
-- "PRESNT" vẫn lưu được và làm báo cáo chuyên cần sai. Hai trigger này chặn mọi giá trị ngoài PRESENT / ABSENT / LATE,
-- cả khi thêm mới lẫn khi sửa. status NULL vẫn được phép (chưa điểm danh).
DROP TRIGGER IF EXISTS trg_attendance_before_insert$$

CREATE TRIGGER trg_attendance_before_insert
BEFORE INSERT ON attendance
FOR EACH ROW
BEGIN
    IF NEW.status IS NOT NULL AND NEW.status NOT IN ('PRESENT', 'ABSENT', 'LATE') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid attendance status';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_attendance_before_update$$

CREATE TRIGGER trg_attendance_before_update
BEFORE UPDATE ON attendance
FOR EACH ROW
BEGIN
    IF NEW.status IS NOT NULL AND NEW.status NOT IN ('PRESENT', 'ABSENT', 'LATE') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid attendance status';
    END IF;
END$$

-- Trả dấu kết thúc câu lệnh về mặc định.
DELIMITER ;
