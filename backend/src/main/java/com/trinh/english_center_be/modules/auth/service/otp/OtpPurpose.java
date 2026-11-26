package com.trinh.english_center_be.modules.auth.service.otp;

/** Why the OTP is being sent. Decides the wording of the message, not how it is delivered. */
public enum OtpPurpose {
    VERIFY_EMAIL,
    RESET_PASSWORD,
    ACCOUNT_INVITE
}
