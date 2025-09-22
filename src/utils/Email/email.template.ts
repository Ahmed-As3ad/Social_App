export const html = (name: string, otp: number): string => {
    return `
            <div style="padding: 20px 25px 10px; text-align: center;">
                        <div style="font-size: 20px; color: #512d0b; font-weight: bold; margin: 10px 0;">
                            <strong>Hey ${name || 'User'}!</strong>
                        </div>
                        
                        <div style="color: #489BDA; font-size: 25px; font-weight: bold; line-height: 35px; margin: 20px 0;">
                            Your OTP IS:<br>
                            <span style="font-size: 18px; color: #489BDA;">${otp}</span>
                        </div>
                        
                        <div style="color: #000000; font-size: 14px; margin-top: 40px;">
                            Best,<br>
                            The Social App Team
                        </div>
            `
}