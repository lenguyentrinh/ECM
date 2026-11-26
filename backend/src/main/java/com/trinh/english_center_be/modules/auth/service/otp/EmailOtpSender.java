package com.trinh.english_center_be.modules.auth.service.otp;

import com.trinh.english_center_be.modules.auth.service.MailService;
import com.trinh.english_center_be.modules.user.entity.User;
import lombok.RequiredArgsConstructor;

/** Sends the OTP by email through {@link MailService}. */
@RequiredArgsConstructor
public class EmailOtpSender implements OtpSender {

    private final MailService mailService;

    @Override
    public void send(OtpPurpose purpose, User user, String otp) {
        switch (purpose) {
            case VERIFY_EMAIL -> mailService.sendEmailVerificationOtp(user.getEmail(), user.getFullName(), otp);
            case RESET_PASSWORD -> mailService.sendPasswordResetOtp(user.getEmail(), user.getFullName(), otp);
            case ACCOUNT_INVITE -> mailService.sendAccountInviteOtp(user.getEmail(), user.getFullName(), otp);
        }
    }
}
