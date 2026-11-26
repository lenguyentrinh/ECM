package com.trinh.english_center_be.modules.auth.service.otp;

import com.trinh.english_center_be.modules.user.entity.User;

/** SMS channel. There is no SMS provider yet, so sending fails loudly instead of silently dropping the code. */
public class SmsOtpSender implements OtpSender {

    @Override
    public void send(OtpPurpose purpose, User user, String otp) {
        throw new UnsupportedOperationException("SMS provider is not configured");
    }
}
