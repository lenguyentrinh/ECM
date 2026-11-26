package com.trinh.english_center_be.modules.auth.service.otp;

/** The ways an OTP can reach a user. Only EMAIL has a provider today. */
public enum OtpChannel {
    EMAIL,
    SMS
}
