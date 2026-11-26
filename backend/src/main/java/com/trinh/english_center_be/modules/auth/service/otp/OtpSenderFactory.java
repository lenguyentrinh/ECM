package com.trinh.english_center_be.modules.auth.service.otp;

import com.trinh.english_center_be.modules.auth.service.MailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Factory Method: callers ask for a channel and get the matching {@link OtpSender}, without knowing the concrete
 * class. Adding a channel means a new sender class and one {@code case} here.
 */
@Component
@RequiredArgsConstructor
public class OtpSenderFactory {

    private final MailService mailService;

    public OtpSender create(OtpChannel channel) {
        return switch (channel) {
            case EMAIL -> new EmailOtpSender(mailService);
            case SMS -> new SmsOtpSender();
        };
    }
}
