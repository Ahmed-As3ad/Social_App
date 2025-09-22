import { createTransport } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer/index.js';

interface IMailData extends Mail.Options {
    otp: number;
}

export const sendMail = async (data: IMailData): Promise<void> => {
    try {
        const transporter = createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const info = await transporter.sendMail({
            from: `"Social App💌" <${process.env.EMAIL_USER}>`,
            ...data
        });
        console.log("✅ Email sent:", info.messageId);

    } catch (error) {
        console.error("❌ Failed to send email:", error);
        throw error;
    }
}

