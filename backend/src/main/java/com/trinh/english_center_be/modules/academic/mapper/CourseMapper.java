package com.trinh.english_center_be.modules.academic.mapper;

import com.trinh.english_center_be.modules.academic.dto.CourseResponse;
import com.trinh.english_center_be.modules.academic.entity.Course;
import com.trinh.english_center_be.modules.category.entity.Category;

public final class CourseMapper {
    private CourseMapper() {}

    public static CourseResponse toResponse(Course course) {
        return toResponse(course, null, null);
    }

    /** @param category the course's category when resolved (nullable); @param enrolled active enrollments (nullable). */
    public static CourseResponse toResponse(Course course, Category category, Long enrolled) {
        if (course == null) return null;
        return CourseResponse.builder()
                .id(course.getId())
                .code(course.getCode())
                .name(course.getName())
                .startDate(course.getStartDate())
                .endDate(course.getEndDate())
                .maxStudent(course.getMaxStudent())
                .status(course.getStatus())
                .minimumAge(course.getMinimumAge())
                .requiredEntryLevel(course.getRequiredEntryLevel())
                .prerequisitesRequired(course.getPrerequisitesRequired())
                .teacherId(course.getTeacher() != null ? course.getTeacher().getId() : null)
                .teacherFullName(course.getTeacher() != null && course.getTeacher().getUser() != null ? course.getTeacher().getUser().getFullName() : null)
                .categoryId(course.getCategoryId())
                .categoryName(category != null ? category.getName() : null)
                .categoryColor(category != null ? category.getColor() : null)
                .room(course.getRoom())
                .daysOfWeek(course.getDaysOfWeek())
                .startTime(course.getStartTime())
                .endTime(course.getEndTime())
                .enrolledCount(enrolled)
                .build();
    }
}
