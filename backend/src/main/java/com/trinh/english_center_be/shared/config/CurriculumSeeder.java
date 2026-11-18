package com.trinh.english_center_be.shared.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trinh.english_center_be.modules.academic.entity.Course;
import com.trinh.english_center_be.modules.academic.entity.CourseSession;
import com.trinh.english_center_be.modules.academic.entity.Enrollment;
import com.trinh.english_center_be.modules.academic.repository.CourseRepository;
import com.trinh.english_center_be.modules.academic.repository.CourseSessionRepository;
import com.trinh.english_center_be.modules.academic.repository.EnrollmentRepository;
import com.trinh.english_center_be.modules.category.entity.Category;
import com.trinh.english_center_be.modules.category.repository.CategoryRepository;
import com.trinh.english_center_be.modules.student.entity.Student;
import com.trinh.english_center_be.modules.student.repository.StudentRepository;
import com.trinh.english_center_be.modules.teacher.entity.Teacher;
import com.trinh.english_center_be.modules.teacher.repository.TeacherRepository;
import com.trinh.english_center_be.modules.user.Repository.UserRepository;
import com.trinh.english_center_be.shared.enums.CourseStatus;
import com.trinh.english_center_be.shared.enums.EntryLevel;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Creates one course per grade (1-12) from {@code seed/curriculum.json}, the repo's source of truth for the
 * curriculum. Opt-in ({@code SEED_CURRICULUM=true}), dev profile only, idempotent by course code. Teachers are
 * not assigned here; an admin does that afterwards, except for grade 1 (below).
 *
 * <p>Grade 1 also gets demo data for the default accounts when they exist: the "Tiếng Anh tiểu học" category on the
 * default teacher, a weekly schedule, one session per Global Success unit, and the default student enrolled.
 */
@Slf4j
@Component
@Profile("dev")
@ConditionalOnProperty(name = "SEED_CURRICULUM", havingValue = "true")
@Order(200)
@RequiredArgsConstructor
public class CurriculumSeeder implements ApplicationRunner {

    private static final String RESOURCE = "seed/curriculum.json";
    private static final String GRADE_ONE_CATEGORY = "Tiếng Anh tiểu học";

    private final CourseRepository courseRepository;
    private final CourseSessionRepository sessionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final ObjectMapper objectMapper;

    @Value("${TEACHER_USERNAME:teacher}")
    private String teacherUsername;

    @Value("${STUDENT_USERNAME:student}")
    private String studentUsername;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        JsonNode root;
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            root = objectMapper.readTree(in);
        }
        String textbook = root.path("textbook").asText("Global Success");
        LocalDate start = LocalDate.now();
        int created = 0;
        for (JsonNode g : root.path("grades")) {
            int grade = g.path("grade").asInt();
            String code = String.format("GS-G%02d", grade);
            if (grade == 1) {
                seedGradeOne(code, textbook, start, g.path("units"));
                continue;
            }
            if (courseRepository.existsByCode(code)) continue;
            courseRepository.save(Course.builder()
                    .code(code)
                    .name("Tiếng Anh lớp " + grade + " (" + textbook + ")")
                    .startDate(start)
                    .endDate(start.plusMonths(9))
                    .maxStudent(30)
                    .status(CourseStatus.OPEN)
                    .minimumAge(grade + 5)
                    .requiredEntryLevel("Lớp " + grade)
                    .prerequisitesRequired(false)
                    .build());
            created++;
        }
        log.info("Curriculum seed: created {} course(s) from {}", created, RESOURCE);
    }

    /** Course, schedule, unit sessions and enrollment for grade 1. Each part is skipped when it already exists. */
    private void seedGradeOne(String code, String textbook, LocalDate start, JsonNode units) {
        Teacher teacher = userRepository.findByUsername(teacherUsername)
                .flatMap(teacherRepository::findByUser).orElse(null);
        Student student = userRepository.findByUsername(studentUsername)
                .flatMap(studentRepository::findByUser).orElse(null);

        Course course = courseRepository.findAll().stream()
                .filter(c -> code.equals(c.getCode())).findFirst().orElse(null);
        if (course == null) {
            Category category = gradeOneCategory();
            course = courseRepository.save(Course.builder()
                    .code(code)
                    .name("Tiếng Anh lớp 1 (" + textbook + ")")
                    .startDate(start)
                    .endDate(start.plusMonths(9))
                    .maxStudent(30)
                    .status(CourseStatus.OPEN)
                    .minimumAge(6)
                    .requiredEntryLevel("Lớp 1")
                    .prerequisitesRequired(false)
                    .categoryId(category.getId())
                    .room("P.101")
                    .daysOfWeek(List.of(2, 4))
                    .startTime(LocalTime.of(16, 0))
                    .endTime(LocalTime.of(17, 0))
                    .build());
            log.info("Curriculum seed: created grade 1 course {}", code);
        }

        if (teacher != null && course.getTeacher() == null) {
            Category category = gradeOneCategory();
            if (!teacher.getCategoryIds().contains(category.getId())) {
                teacher.getCategoryIds().add(category.getId());
                teacherRepository.save(teacher);
            }
            course.setTeacher(teacher);
            courseRepository.save(course);
        }

        if (units.size() > 0 && sessionRepository.findByCourseOrderBySessionNoAsc(course).isEmpty()) {
            List<Integer> days = course.getDaysOfWeek();
            LocalDate date = course.getStartDate();
            List<CourseSession> sessions = new ArrayList<>();
            for (JsonNode unit : units) {
                while (!days.contains(date.getDayOfWeek().getValue())) date = date.plusDays(1);
                int no = unit.path("no").asInt();
                StringBuilder topic = new StringBuilder(textbook + " - Tiếng Anh 1, Unit " + no);
                if (unit.path("cards").size() > 0) {
                    List<String> words = new ArrayList<>();
                    unit.path("cards").forEach(w -> words.add(w.asText()));
                    topic.append(". Từ vựng: ").append(String.join(", ", words));
                }
                sessions.add(CourseSession.builder()
                        .course(course).sessionNo(no).title("Unit " + no + ": " + unit.path("title").asText())
                        .sessionDate(date).startTime(course.getStartTime()).endTime(course.getEndTime())
                        .topic(topic.toString()).build());
                date = date.plusDays(1);
            }
            sessionRepository.saveAll(sessions);
            log.info("Curriculum seed: created {} session(s) for {}", sessions.size(), code);
        }

        if (student != null
                && enrollmentRepository.findByCourseAndStudentAndStatus(course, student, Enrollment.ACTIVE).isEmpty()) {
            if (student.getEntryLevel() == null) {
                student.setEntryLevel(EntryLevel.PRE_A1);
                student.setDateOfBirth(start.minusYears(6));
                studentRepository.save(student);
            }
            enrollmentRepository.save(Enrollment.builder()
                    .student(student).course(course).enrollDate(start).status(Enrollment.ACTIVE)
                    .ageEligible(true).entryLevelEligible(true).prerequisitesEligible(true).build());
            log.info("Curriculum seed: enrolled '{}' in {}", studentUsername, code);
        }
    }

    private Category gradeOneCategory() {
        String key = GRADE_ONE_CATEGORY.toLowerCase();
        return categoryRepository.findByNameKey(key).orElseGet(() -> categoryRepository.save(
                Category.builder().name(GRADE_ONE_CATEGORY).nameKey(key).color("#16a34a").build()));
    }
}
