import { createTransport } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer/index.js';
import { BadRequestException } from '../response/error.response.js';

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

        await transporter.sendMail({
            from: `"Social App💌" <${process.env.EMAIL_USER}>`,
            ...data
        });

    } catch (error) {
        throw new BadRequestException('Failed to send email');
    }
}

