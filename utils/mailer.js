const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendVerificationEmail = async (to, firstName, token) => {
    const verifyUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;

    const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f5f9ff;font-family:Arial,sans-serif">
        <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;margin:40px auto;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
            <tr>
                <td style="background:linear-gradient(135deg,#0D47A1,#2196F3);padding:30px;text-align:center;border-radius:16px 16px 0 0">
                    <h1 style="color:#fff;margin:0;font-size:22px">🐾 Симба</h1>
                    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Ветеринарная клиника</p>
                </td>
            </tr>
            <tr>
                <td style="padding:32px 30px">
                    <h2 style="color:#1A202C;margin:0 0 8px;font-size:18px">Здравствуйте, ${firstName}!</h2>
                    <p style="color:#718096;font-size:14px;line-height:1.6;margin:0 0 20px">
                        Спасибо за регистрацию в ВетКлинике «Симба». 
                        Для подтверждения email перейдите по кнопке ниже:
                    </p>
                    <table align="center" cellpadding="0" cellspacing="0">
                        <tr>
                            <td align="center" style="background:#2196F3;border-radius:50px;padding:0">
                                <a href="${verifyUrl}" target="_blank" style="display:inline-block;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 40px;letter-spacing:0.3px">
                                    Подтвердить email
                                </a>
                            </td>
                        </tr>
                    </table>
                    <p style="color:#718096;font-size:12px;line-height:1.6;margin:24px 0 0;text-align:center">
                        Если кнопка не работает, скопируйте ссылку:<br>
                        <a href="${verifyUrl}" style="color:#2196F3;word-break:break-all;font-size:11px">${verifyUrl}</a>
                    </p>
                    <p style="color:#A0AEC0;font-size:11px;line-height:1.6;margin:20px 0 0;text-align:center;border-top:1px solid #E2E8F0;padding-top:16px">
                        Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте письмо.
                    </p>
                </td>
            </tr>
            <tr>
                <td style="background:#1A202C;padding:16px 30px;text-align:center;border-radius:0 0 16px 16px">
                    <p style="color:#718096;font-size:11px;margin:0">&copy; 2024 ВетКлиника «Симба». Все права защищены.</p>
                </td>
            </tr>
        </table>
    </body>
    </html>`;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject: 'Подтверждение регистрации — ВетКлиника Симба',
            html
        });

        if (process.env.NODE_ENV === 'development') {
            console.log('Письмо с подтверждением отправлено');
        }

        return { success: true };
    } catch (error) {
        console.error('Ошибка отправки письма:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { sendVerificationEmail };