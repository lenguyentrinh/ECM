package com.trinh.english_center_be.modules.auth.service.otp;

import com.trinh.english_center_be.modules.user.entity.User;

/** Product of {@link OtpSenderFactory}: one way to deliver an OTP. Implementations must not log the code. */
public interface OtpSender {

    void send(OtpPurpose purpose, User user, String otp);
}
