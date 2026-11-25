package com.trinh.english_center_be.modules.academic.repository;

import com.trinh.english_center_be.modules.academic.entity.Course;
import com.trinh.english_center_be.modules.teacher.entity.Teacher;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseRepository extends JpaRepository<Course, String> {

    /** SELECT ... FOR UPDATE: request khác cùng khóa học phải chờ tới khi transaction này xong (dùng cho enroll). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Course c where c.id = :id")
    Optional<Course> findByIdForUpdate(@Param("id") String id);

    List<Course> findByTeacher(Teacher teacher);

    boolean existsByCode(String code);

    /** Live = active is not explicitly false (legacy rows carry no flag). */
    boolean existsByCategoryIdAndActiveNot(String categoryId, Boolean active);

}
