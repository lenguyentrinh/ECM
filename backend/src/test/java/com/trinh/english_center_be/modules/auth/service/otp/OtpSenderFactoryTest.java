package com.trinh.english_center_be.modules.auth.service.otp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.trinh.english_center_be.modules.auth.service.MailService;
import com.trinh.english_center_be.modules.user.entity.User;
import org.junit.jupiter.api.Test;

class OtpSenderFactoryTest {

    final MailService mailService = mock(MailService.class);
    final OtpSenderFactory factory = new OtpSenderFactory(mailService);
    final User user = User.builder().id("u1").email("a@b.com").fullName("A B").build();

    @Test
    void createsTheSenderMatchingTheChannel() {
        assertThat(factory.create(OtpChannel.EMAIL)).isInstanceOf(EmailOtpSender.class);
        assertThat(factory.create(OtpChannel.SMS)).isInstanceOf(SmsOtpSender.class);
    }

    @Test
    void emailSenderMapsEachPurposeToTheMatchingMailServiceMethod() {
        OtpSender sender = factory.create(OtpChannel.EMAIL);

        sender.send(OtpPurpose.VERIFY_EMAIL, user, "111111");
        sender.send(OtpPurpose.RESET_PASSWORD, user, "222222");
        sender.send(OtpPurpose.ACCOUNT_INVITE, user, "333333");

        verify(mailService).sendEmailVerificationOtp("a@b.com", "A B", "111111");
        verify(mailService).sendPasswordResetOtp("a@b.com", "A B", "222222");
        verify(mailService).sendAccountInviteOtp("a@b.com", "A B", "333333");
    }

    @Test
    void smsSenderFailsLoudlyWhileThereIsNoProvider() {
        OtpSender sender = factory.create(OtpChannel.SMS);

        assertThatThrownBy(() -> sender.send(OtpPurpose.VERIFY_EMAIL, user, "111111"))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
