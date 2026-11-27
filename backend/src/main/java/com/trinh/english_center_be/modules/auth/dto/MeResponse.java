package com.trinh.english_center_be.modules.auth.dto;

import java.util.List;
import lombok.Builder;

@Builder
public record MeResponse(
        String id,
        String username,
        String fullName,
        String email,
        String phone,
        List<String> roles
) {}
