package com.trinh.english_center_be.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.function.Executable;

/**
 * Tests of {@code db/migration/R__routines.sql} (the four triggers) against a REAL MySQL, because H2 cannot run them. This is the only place the SQL itself is tested.
 *
 * <p>How it works: it creates a scratch database {@value #DB} (dropped first and again at the end; the real
 * {@code english_center_db} is never touched), runs the Flyway migrations (V1, V2, R__routines) into it, then checks each
 * case with plain JDBC. When no MySQL is reachable every test is SKIPPED and the reason is printed to the console
 * ({@code [RoutinesMySqlTest] SKIPPED: ...}), so the normal build on a machine or CI without MySQL stays green.
 *
 * <p>Connection settings (environment variables, same defaults as application.yml): {@code MYSQL_TEST_URL} (server URL
 * without a database, default {@code jdbc:mysql://localhost:3306/}), {@code MYSQL_USER} (root), {@code MYSQL_PASSWORD}
 * (root). The account needs CREATE/DROP DATABASE rights. Run it with
 * {@code ./mvnw test "-Dtest=RoutinesMySqlTest*"}.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class RoutinesMySqlTest {

    /** Scratch database; fixed name on purpose so this test can never drop anything else. */
    static final String DB = "english_center_routines_test";

    private static final String PARAMS = "?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8";
    private static final Timestamp STAMP = Timestamp.valueOf("2026-03-04 05:06:07");

    private String serverUrl;
    private String user;
    private String password;
    private Connection conn;
    private boolean created;

    // ------------------------------------------------------------------------------------------------------------
    // Setup / teardown
    // ------------------------------------------------------------------------------------------------------------

    @BeforeAll
    void migrateScratchDatabase() throws SQLException {
        String base = env("MYSQL_TEST_URL", "jdbc:mysql://localhost:3306/");
        serverUrl = base + PARAMS;
        user = env("MYSQL_USER", "root");
        password = env("MYSQL_PASSWORD", "root");

        try (Connection admin = DriverManager.getConnection(serverUrl, user, password);
             Statement st = admin.createStatement()) {
            st.execute("DROP DATABASE IF EXISTS " + DB);
            st.execute("CREATE DATABASE " + DB);
            created = true;
        } catch (SQLException e) {
            String reason = "MySQL not reachable at " + base + " as '" + user + "' (" + e.getMessage()
                    + "). Start MySQL (docker compose up -d mysql) and/or set the environment variables MYSQL_USER and "
                    + "MYSQL_PASSWORD (and MYSQL_TEST_URL if it is not localhost:3306) to run these tests.";
            System.err.println("[RoutinesMySqlTest] SKIPPED: " + reason); // surefire hides assumption messages
            assumeTrue(false, reason);
        }

        String dbUrl = base + DB + PARAMS;
        Flyway.configure()
                .dataSource(dbUrl, user, password)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        conn = DriverManager.getConnection(dbUrl, user, password);
    }

    @AfterAll
    void dropScratchDatabase() throws SQLException {
        if (conn != null) conn.close();
        if (!created) return;
        try (Connection admin = DriverManager.getConnection(serverUrl, user, password);
             Statement st = admin.createStatement()) {
            st.execute("DROP DATABASE IF EXISTS " + DB);
        }
    }

    @BeforeEach
    void cleanTables() throws SQLException {
        // children first, so the foreign keys never block
        for (String table : new String[] {"attendance", "enrollment_audit", "enrollments", "course_sessions",
                "course_days_of_week", "teacher_categories", "courses", "students", "teachers", "users"}) {
            exec("DELETE FROM " + table);
        }
    }

    @Test
    @DisplayName("migration: all four triggers exist")
    void migrationCreatesTheRoutines() throws SQLException {
        assertEquals(4, count("SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ? AND TRIGGER_NAME IN "
                + "('trg_enrollments_before_insert', 'trg_enrollments_after_update', "
                + "'trg_attendance_before_insert', 'trg_attendance_before_update')", DB));
    }

    // ------------------------------------------------------------------------------------------------------------
    // trg_enrollments_before_insert
    // ------------------------------------------------------------------------------------------------------------

    @Nested
    @DisplayName("trg_enrollments_before_insert")
    class DuplicateEnrollmentTrigger {

        @Test
        @DisplayName("rejects a second ACTIVE enrollment of the same student in the same course")
        void rejectsDuplicateActive() throws SQLException {
            student("s1");
            course("c1");
            enrollment("e1", "c1", "s1", "ACTIVE");

            assertRejected(() -> enrollment("e2", "c1", "s1", "ACTIVE"), "already enrolled");
            assertEquals(1, count("SELECT COUNT(*) FROM enrollments WHERE course_id = 'c1' AND student_id = 's1'"));
        }

        @Test
        @DisplayName("allows the same student in another course, and another student in the same course")
        void allowsOtherCombinations() throws SQLException {
            student("s1");
            student("s2");
            course("c1");
            course("c2");
            enrollment("e1", "c1", "s1", "ACTIVE");

            enrollment("e2", "c2", "s1", "ACTIVE");
            enrollment("e3", "c1", "s2", "ACTIVE");

            assertEquals(3, count("SELECT COUNT(*) FROM enrollments"));
        }

        @Test
        @DisplayName("CANCELLED rows are history: they may repeat, and a new ACTIVE one is allowed after a cancel")
        void cancelledRowsMayRepeat() throws SQLException {
            student("s1");
            course("c1");
            enrollment("e1", "c1", "s1", "CANCELLED");
            enrollment("e2", "c1", "s1", "CANCELLED");

            enrollment("e3", "c1", "s1", "ACTIVE");

            assertEquals(3, count("SELECT COUNT(*) FROM enrollments WHERE course_id = 'c1' AND student_id = 's1'"));
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // trg_enrollments_after_update
    // ------------------------------------------------------------------------------------------------------------

    @Nested
    @DisplayName("trg_enrollments_after_update")
    class EnrollmentAuditTrigger {

        @Test
        @DisplayName("logs a status change with the old and the new status")
        void logsAStatusChange() throws SQLException {
            student("s1");
            course("c1");
            enrollment("e1", "c1", "s1", "ACTIVE");

            exec("UPDATE enrollments SET status = 'CANCELLED' WHERE id = 'e1'");

            assertEquals(1, count("SELECT COUNT(*) FROM enrollment_audit WHERE enrollment_id = 'e1' "
                    + "AND old_status = 'ACTIVE' AND new_status = 'CANCELLED'"));
            assertTrue(one("SELECT changed_at FROM enrollment_audit WHERE enrollment_id = 'e1'") != null,
                    "changed_at must be filled");
        }

        @Test
        @DisplayName("does not log an update that leaves the status unchanged")
        void ignoresOtherUpdates() throws SQLException {
            student("s1");
            course("c1");
            enrollment("e1", "c1", "s1", "ACTIVE");

            exec("UPDATE enrollments SET age_eligible = 1 WHERE id = 'e1'");
            exec("UPDATE enrollments SET status = 'ACTIVE' WHERE id = 'e1'");

            assertEquals(0, count("SELECT COUNT(*) FROM enrollment_audit"));
        }

        @Test
        @DisplayName("keeps one row per change when the status changes twice")
        void logsEveryChange() throws SQLException {
            student("s1");
            course("c1");
            enrollment("e1", "c1", "s1", "ACTIVE");

            exec("UPDATE enrollments SET status = 'CANCELLED' WHERE id = 'e1'");
            exec("UPDATE enrollments SET status = 'ACTIVE' WHERE id = 'e1'");

            assertEquals(2, count("SELECT COUNT(*) FROM enrollment_audit WHERE enrollment_id = 'e1'"));
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // trg_attendance_before_insert / trg_attendance_before_update
    // ------------------------------------------------------------------------------------------------------------

    @Nested
    @DisplayName("attendance status triggers")
    class AttendanceTriggers {

        @Test
        @DisplayName("accepts PRESENT, ABSENT, LATE and NULL on insert")
        void acceptsValidStatuses() throws SQLException {
            student("s1");
            course("c1");
            session("ss1", "c1");

            attendance("a1", "ss1", "s1", "PRESENT");
            attendance("a2", "ss1", "s1", "ABSENT");
            attendance("a3", "ss1", "s1", "LATE");
            attendance("a4", "ss1", "s1", null);

            assertEquals(4, count("SELECT COUNT(*) FROM attendance"));
        }

        @Test
        @DisplayName("rejects an unknown, mistyped or lower-case status on insert")
        void rejectsInvalidStatusOnInsert() throws SQLException {
            student("s1");
            course("c1");
            session("ss1", "c1");

            assertRejected(() -> attendance("a1", "ss1", "s1", "PRESNT"), "Invalid attendance status");
            assertRejected(() -> attendance("a2", "ss1", "s1", "EXCUSED"), "Invalid attendance status");
            assertRejected(() -> attendance("a3", "ss1", "s1", "present"), "Invalid attendance status");
            assertEquals(0, count("SELECT COUNT(*) FROM attendance"));
        }

        @Test
        @DisplayName("rejects changing an existing row to an invalid status, and allows a valid change")
        void rejectsInvalidStatusOnUpdate() throws SQLException {
            student("s1");
            course("c1");
            session("ss1", "c1");
            attendance("a1", "ss1", "s1", "PRESENT");

            assertRejected(() -> exec("UPDATE attendance SET status = 'SKIPPED' WHERE id = 'a1'"),
                    "Invalid attendance status");
            assertEquals("PRESENT", one("SELECT status FROM attendance WHERE id = 'a1'"));

            exec("UPDATE attendance SET status = 'LATE' WHERE id = 'a1'");
            assertEquals("LATE", one("SELECT status FROM attendance WHERE id = 'a1'"));
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Fixtures (only the columns the routines care about; every row gets the audit columns of BaseEntity)
    // ------------------------------------------------------------------------------------------------------------

    private void user(String id) throws SQLException {
        exec("INSERT INTO users (id, username, email, status, active, created_at, update_at) "
                + "VALUES (?, ?, ?, 'ACTIVE', 1, NOW(6), NOW(6))", id, "user-" + id, id + "@example.com");
    }

    private void student(String id) throws SQLException {
        user("u-" + id);
        exec("INSERT INTO students (id, user_id, active, created_at, update_at) VALUES (?, ?, 1, NOW(6), NOW(6))",
                id, "u-" + id);
    }

    private void teacher(String id) throws SQLException {
        user("u-" + id);
        exec("INSERT INTO teachers (id, user_id, active, created_at, update_at) VALUES (?, ?, 1, NOW(6), NOW(6))",
                id, "u-" + id);
    }

    private void course(String id) throws SQLException {
        course(id, null);
    }

    private void course(String id, String teacherId) throws SQLException {
        exec("INSERT INTO courses (id, code, name, max_student, status, teacher_id, active, created_at, update_at) "
                + "VALUES (?, ?, ?, 10, 'OPEN', ?, 1, NOW(6), NOW(6))", id, "code-" + id, "Course " + id, teacherId);
    }

    private void enrollment(String id, String courseId, String studentId, String status) throws SQLException {
        exec("INSERT INTO enrollments (id, course_id, student_id, enroll_date, status, active, created_at, update_at) "
                + "VALUES (?, ?, ?, CURDATE(), ?, 1, NOW(6), NOW(6))", id, courseId, studentId, status);
    }

    private void session(String id, String courseId) throws SQLException {
        exec("INSERT INTO course_sessions (id, course_id, session_no, active, created_at, update_at) "
                + "VALUES (?, ?, 1, 1, NOW(6), NOW(6))", id, courseId);
    }

    private void attendance(String id, String sessionId, String studentId, String status) throws SQLException {
        exec("INSERT INTO attendance (id, session_id, student_id, status, active, created_at, update_at) "
                + "VALUES (?, ?, ?, ?, 1, NOW(6), NOW(6))", id, sessionId, studentId, status);
    }

    // ------------------------------------------------------------------------------------------------------------
    // JDBC helpers
    // ------------------------------------------------------------------------------------------------------------

    private void exec(String sql, Object... args) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            bind(ps, args);
            ps.executeUpdate();
        }
    }

    /** First column of the first row as text, or null when there is no row (or the value is NULL). */
    private String one(String sql, Object... args) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            bind(ps, args);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString(1) : null;
            }
        }
    }

    private Timestamp timestamp(String sql, Object... args) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            bind(ps, args);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getTimestamp(1) : null;
            }
        }
    }

    private int count(String sql, Object... args) throws SQLException {
        return Integer.parseInt(one(sql, args));
    }

    private String enrollmentStatus(String id) throws SQLException {
        return one("SELECT status FROM enrollments WHERE id = ?", id);
    }

    private static void bind(PreparedStatement ps, Object... args) throws SQLException {
        for (int i = 0; i < args.length; i++) {
            ps.setObject(i + 1, args[i]);
        }
    }

    /** The statement must fail with a trigger/procedure SIGNAL (SQLSTATE 45000) carrying the given text. */
    private static void assertRejected(Executable statement, String messagePart) {
        SQLException e = assertThrows(SQLException.class, statement);
        assertEquals("45000", e.getSQLState(), "expected a SIGNAL from the database, got: " + e.getMessage());
        assertTrue(e.getMessage().toLowerCase().contains(messagePart.toLowerCase()),
                "message should mention '" + messagePart + "' but was: " + e.getMessage());
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : value;
    }
}
