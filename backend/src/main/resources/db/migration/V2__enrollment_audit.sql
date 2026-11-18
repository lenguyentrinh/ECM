-- V2: history of enrollment status changes, filled by trigger trg_enrollments_after_update (see R__routines.sql).
CREATE TABLE enrollment_audit (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id VARCHAR(36) NOT NULL,
    old_status    VARCHAR(20),
    new_status    VARCHAR(20),
    changed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX enrollment_audit_enrollment_idx (enrollment_id)
) ENGINE=InnoDB;
