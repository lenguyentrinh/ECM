-- V1: baseline schema, generated from the JPA entities (Hibernate 6.6, MySQL dialect, Spring Boot naming).
-- A fresh database gets every table from here. A database Hibernate created earlier is baselined at version 1
-- (spring.flyway.baseline-on-migrate), so this script is skipped for it and only V2+ and the R__ scripts run.
-- Schema changes from now on are new V<n>__*.sql files, never edits of this one.
--
-- Layout: 1) tables  2) unique constraints and indexes  3) foreign keys.
-- Every table starts with its own columns; the audit columns (active, created_at, update_at) come from BaseEntity.


-- =====================================================================================================================
-- 1) TABLES
-- =====================================================================================================================

CREATE TABLE attendance (
    active     BIT,
    created_at DATETIME(6),
    update_at  DATETIME(6),
    id         VARCHAR(36) NOT NULL,
    session_id VARCHAR(36),
    student_id VARCHAR(36),
    note       VARCHAR(255),
    status     VARCHAR(255),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE categories (
    active     BIT,
    created_at DATETIME(6),
    update_at  DATETIME(6),
    id         VARCHAR(36) NOT NULL,
    color      VARCHAR(255),
    name       VARCHAR(255),
    name_key   VARCHAR(255),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE course_days_of_week (
    day_of_week INTEGER,
    course_id   VARCHAR(36) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE course_sessions (
    active       BIT,
    end_time     TIME(6),
    session_date DATE,
    session_no   INTEGER,
    start_time   TIME(6),
    created_at   DATETIME(6),
    update_at    DATETIME(6),
    course_id    VARCHAR(36),
    id           VARCHAR(36) NOT NULL,
    topic        VARCHAR(1000),
    title        VARCHAR(255),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE courses (
    active                 BIT,
    end_date               DATE,
    end_time               TIME(6),
    max_student            INTEGER,
    minimum_age            INTEGER,
    prerequisites_required BIT,
    start_date             DATE,
    start_time             TIME(6),
    created_at             DATETIME(6),
    update_at              DATETIME(6),
    id                     VARCHAR(36) NOT NULL,
    teacher_id             VARCHAR(36),
    category_id            VARCHAR(255),
    code                   VARCHAR(255),
    name                   VARCHAR(255),
    required_entry_level   VARCHAR(255),
    room                   VARCHAR(255),
    status                 ENUM ('ACTIVE', 'CLOSE', 'OPEN'),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE email_verification_otps (
    attempts     INTEGER NOT NULL,
    expires_at   DATETIME(6),
    last_sent_at DATETIME(6),
    id           VARCHAR(36) NOT NULL,
    otp_hash     VARCHAR(255),
    user_id      VARCHAR(255),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE enrollments (
    active                 BIT,
    age_eligible           BIT,
    enroll_date            DATE,
    entry_level_eligible   BIT,
    prerequisites_eligible BIT,
    created_at             DATETIME(6),
    eligibility_check_date DATETIME(6),
    update_at              DATETIME(6),
    course_id              VARCHAR(36),
    id                     VARCHAR(36) NOT NULL,
    student_id             VARCHAR(36),
    status                 VARCHAR(255),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE password_reset_otps (
    attempts     INTEGER NOT NULL,
    expires_at   DATETIME(6),
    last_sent_at DATETIME(6),
    id           VARCHAR(36) NOT NULL,
    otp_hash     VARCHAR(255),
    user_id      VARCHAR(255),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
    revoked     BIT NOT NULL,
    created_at  DATETIME(6),
    expires_at  DATETIME(6),
    revoked_at  DATETIME(6),
    id          VARCHAR(32) NOT NULL,
    replaced_by VARCHAR(255),
    token_hash  VARCHAR(255),
    user_id     VARCHAR(255),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE roles (
    active      BIT,
    created_at  DATETIME(6),
    update_at   DATETIME(6),
    id          VARCHAR(36) NOT NULL,
    description VARCHAR(255),
    code        ENUM ('ADMIN', 'STUDENT', 'TEACHER'),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE session_materials (
    active      BIT,
    created_at  DATETIME(6),
    update_at   DATETIME(6),
    id          VARCHAR(36) NOT NULL,
    session_id  VARCHAR(36),
    file_url    VARCHAR(1000),
    file_name   VARCHAR(255),
    file_type   VARCHAR(255),
    uploaded_by VARCHAR(255),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE students (
    active                  BIT,
    date_of_birth           DATE,
    prerequisites_completed BIT,
    created_at              DATETIME(6),
    update_at               DATETIME(6),
    id                      VARCHAR(36) NOT NULL,
    user_id                 VARCHAR(36),
    address                 VARCHAR(255),
    parent_name             VARCHAR(255),
    parent_phone            VARCHAR(255),
    entry_level             ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'PRE_A1'),
    gender                  ENUM ('FEMALE', 'MALE', 'OTHER'),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE teacher_categories (
    category_id VARCHAR(36),
    teacher_id  VARCHAR(36) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE teachers (
    active     BIT,
    salary     DECIMAL(15, 2),
    created_at DATETIME(6),
    update_at  DATETIME(6),
    id         VARCHAR(36) NOT NULL,
    user_id    VARCHAR(36),
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE users (
    active         BIT,
    email_verified BIT,
    created_at     DATETIME(6),
    update_at      DATETIME(6),
    id             VARCHAR(36) NOT NULL,
    role_id        VARCHAR(36),
    email          VARCHAR(255),
    full_name      VARCHAR(255),
    password       VARCHAR(255),
    phone          VARCHAR(255),
    username       VARCHAR(255),
    status         ENUM ('ACTIVE', 'INACTIVE', 'LOCKED'),
    PRIMARY KEY (id)
) ENGINE=InnoDB;


-- =====================================================================================================================
-- 2) UNIQUE CONSTRAINTS AND INDEXES (constraint names are the ones Hibernate generates; keep them as they are)
-- =====================================================================================================================

ALTER TABLE categories
    ADD CONSTRAINT UK4ak3f139p59huebqwq3jm2346 UNIQUE (name_key);

CREATE INDEX course_session_no_idx ON course_sessions (course_id, session_no);

ALTER TABLE courses
    ADD CONSTRAINT UK61og8rbqdd2y28rx2et5fdnxd UNIQUE (code);

CREATE INDEX idx_email_otp_expires ON email_verification_otps (expires_at);

ALTER TABLE email_verification_otps
    ADD CONSTRAINT UKpkljbx7o0f18kpd2d0qw55omh UNIQUE (user_id);

CREATE INDEX enrollment_course_student_idx ON enrollments (course_id, student_id, status);

CREATE INDEX idx_reset_otp_expires ON password_reset_otps (expires_at);

ALTER TABLE password_reset_otps
    ADD CONSTRAINT UK54nf04xn0b2a3xxlysc84u9d7 UNIQUE (user_id);

CREATE INDEX idx_refresh_user ON refresh_tokens (user_id);

CREATE INDEX idx_refresh_expires ON refresh_tokens (expires_at);

ALTER TABLE roles
    ADD CONSTRAINT UKch1113horj4qr56f91omojv8 UNIQUE (code);

ALTER TABLE students
    ADD CONSTRAINT UKg4fwvutq09fjdlb4bb0byp7t UNIQUE (user_id);

ALTER TABLE teachers
    ADD CONSTRAINT UKcd1k6xwg9jqtiwx9ybnxpmoh9 UNIQUE (user_id);

ALTER TABLE users
    ADD CONSTRAINT UK6dotkott2kjsp8vw4d0m25fb7 UNIQUE (email);

ALTER TABLE users
    ADD CONSTRAINT UKr43af9ap4edm43mmtq01oddj6 UNIQUE (username);


-- =====================================================================================================================
-- 3) FOREIGN KEYS
-- =====================================================================================================================

ALTER TABLE attendance
    ADD CONSTRAINT FKr2n3nei6ic45cmu0javrawe2w FOREIGN KEY (session_id) REFERENCES course_sessions (id);

ALTER TABLE attendance
    ADD CONSTRAINT FK7121lveuhtmu9wa6m90ayd5yg FOREIGN KEY (student_id) REFERENCES students (id);

ALTER TABLE course_days_of_week
    ADD CONSTRAINT FKasybun9fqthg40l8go6v2o9ui FOREIGN KEY (course_id) REFERENCES courses (id);

ALTER TABLE course_sessions
    ADD CONSTRAINT FKl5u4b9l4iem3ma04o48akvn2o FOREIGN KEY (course_id) REFERENCES courses (id);

ALTER TABLE courses
    ADD CONSTRAINT FK468oyt88pgk2a0cxrvxygadqg FOREIGN KEY (teacher_id) REFERENCES teachers (id);

ALTER TABLE enrollments
    ADD CONSTRAINT FKho8mcicp4196ebpltdn9wl6co FOREIGN KEY (course_id) REFERENCES courses (id);

ALTER TABLE enrollments
    ADD CONSTRAINT FK8kf1u1857xgo56xbfmnif2c51 FOREIGN KEY (student_id) REFERENCES students (id);

ALTER TABLE session_materials
    ADD CONSTRAINT FK3jyvnnc06ndin4yt1ktg1lx4t FOREIGN KEY (session_id) REFERENCES course_sessions (id);

ALTER TABLE students
    ADD CONSTRAINT FKdt1cjx5ve5bdabmuuf3ibrwaq FOREIGN KEY (user_id) REFERENCES users (id);

ALTER TABLE teacher_categories
    ADD CONSTRAINT FK2w3ughxvovulre0n6q6lb6fd6 FOREIGN KEY (teacher_id) REFERENCES teachers (id);

ALTER TABLE teachers
    ADD CONSTRAINT FKb8dct7w2j1vl1r2bpstw5isc0 FOREIGN KEY (user_id) REFERENCES users (id);

ALTER TABLE users
    ADD CONSTRAINT FKp56c1712k691lhsyewcssf40f FOREIGN KEY (role_id) REFERENCES roles (id);
