package com.trinh.english_center_be.shared.config;

import com.trinh.english_center_be.modules.user.Repository.RoleRepository;
import com.trinh.english_center_be.modules.user.Repository.UserRepository;
import com.trinh.english_center_be.modules.user.entity.Role;
import com.trinh.english_center_be.modules.user.entity.User;
import com.trinh.english_center_be.modules.user.service.RoleProfileService;
import com.trinh.english_center_be.shared.enums.Roles;
import com.trinh.english_center_be.shared.enums.UserStatus;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Makes a fresh database usable: creates the fixed roles (ADMIN, TEACHER, STUDENT) that are missing (signup needs
 * STUDENT) and, for each of ADMIN_*, TEACHER_*, STUDENT_* whose USERNAME / EMAIL / PASSWORD are all set, a default account.
 * Idempotent; never overwrites existing roles or users.
 */
@Slf4j
@Component
@Order(0) // roles and default accounts must exist before the dev seeders (order 100 and 200) run
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    /** The only roles the system needs. Legacy TEACHER_* enum values are never created; teacher specialties are Categories. */
    private static final List<Roles> FIXED_ROLES = List.of(Roles.ADMIN, Roles.TEACHER, Roles.STUDENT);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleProfileService roleProfileService;

    @Value("${ADMIN_USERNAME:}")
    private String adminUsername;

    @Value("${ADMIN_EMAIL:}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:}")
    private String adminPassword;

    @Value("${TEACHER_USERNAME:}")
    private String teacherUsername;

    @Value("${TEACHER_EMAIL:}")
    private String teacherEmail;

    @Value("${TEACHER_PASSWORD:}")
    private String teacherPassword;

    @Value("${STUDENT_USERNAME:}")
    private String studentUsername;

    @Value("${STUDENT_EMAIL:}")
    private String studentEmail;

    @Value("${STUDENT_PASSWORD:}")
    private String studentPassword;

    @Override
    public void run(ApplicationArguments args) {
        for (Roles code : FIXED_ROLES) {
            if (!roleRepository.existsByCode(code)) {
                roleRepository.save(Role.builder().code(code).description(code.getLabel()).build());
                log.info("Seeded role {}", code);
            }
        }
        seedUser(Roles.ADMIN, "Administrator", adminUsername, adminEmail, adminPassword);
        seedUser(Roles.TEACHER, "Default Teacher", teacherUsername, teacherEmail, teacherPassword);
        seedUser(Roles.STUDENT, "Default Student", studentUsername, studentEmail, studentPassword);
        backfillMissingRoles();
    }

    /**
     * Accounts created before roles became a single {@code users.role_id} column have no role, and login fails for
     * them ("Account has no role assigned"). The configured default accounts get their configured role; any other
     * roleless account gets the least-privileged one (STUDENT). An admin can change it afterwards.
     */
    private void backfillMissingRoles() {
        List<User> roleless = userRepository.findByRoleIsNull();
        if (roleless.isEmpty()) return;
        for (User user : roleless) {
            Roles code = configuredRoleFor(user.getUsername());
            user.setRole(roleRepository.findByCode(code).orElseThrow());
            userRepository.save(user);
            roleProfileService.onAssigned(user, code);
            log.warn("Account '{}' had no role; assigned {}", user.getUsername(), code);
        }
    }

    private Roles configuredRoleFor(String username) {
        if (!adminUsername.isBlank() && adminUsername.trim().equals(username)) return Roles.ADMIN;
        if (!teacherUsername.isBlank() && teacherUsername.trim().equals(username)) return Roles.TEACHER;
        return Roles.STUDENT;
    }

    /** Creates one ACTIVE, email-verified account (and the Teacher/Student profile for its role) unless it already exists. */
    private void seedUser(Roles roleCode, String fullName, String username, String email, String password) {
        if (username.isBlank() || email.isBlank() || password.isBlank()) return;
        if (userRepository.existsByUsername(username.trim())
                || userRepository.findByEmailIgnoreCase(email.trim()).isPresent()) {
            return;
        }
        Role role = roleRepository.findByCode(roleCode).orElseThrow();
        User user = userRepository.save(User.builder()
                .username(username.trim())
                .email(email.trim().toLowerCase())
                .fullName(fullName)
                .password(passwordEncoder.encode(password))
                .status(UserStatus.ACTIVE)
                .emailVerified(true)
                .role(role)
                .build());
        roleProfileService.onAssigned(user, roleCode);
        log.info("Seeded {} account '{}'", roleCode, user.getUsername());
    }
}
