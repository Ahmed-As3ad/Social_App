import { EventEmitter } from 'node:events';
import { sendMail } from '../Email/email.utils.js';
import { BadRequestException } from '../response/error.response.js';

export const emailEvent = new EventEmitter();

emailEvent.on('sendEmail', async (emailData: { to: string; html: string; subject: string, otp: number }) => {
    try {
        await sendMail({
            to: emailData.to,
            html: emailData.html,
            subject: emailData.subject,
            otp: emailData.otp
        });
    } catch (error) {
        throw new BadRequestException('Failed to send email');
    }
})