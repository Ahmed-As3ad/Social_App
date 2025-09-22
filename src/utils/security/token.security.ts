import type { Secret, SignOptions } from 'jsonwebtoken';
import { sign } from 'jsonwebtoken';
import { BadRequestException } from '../response/error.response.js';
import { HUserDocument, RoleEnum } from '../../DB/model/User.model.js';

export const enum TokenTypeEnum {
    Bearer = 'Bearer',
    Admin = 'Admin'
}

export const generateToken = async ({ payload, secret = process.env.JWT_SECRET_ACCESS_USER, options = { expiresIn: 3600 } }: { payload: object, secret?: Secret, options?: SignOptions }): Promise<string> => {
    if (!secret) {
        throw new BadRequestException('Secret is required for token generation');
    }
    return sign(payload, secret, options);
}

export const detectCredentialTokenType = (role: RoleEnum): TokenTypeEnum => {
    let detected = TokenTypeEnum.Bearer
    switch (role) {
        case RoleEnum.admin:
            detected = TokenTypeEnum.Admin
            break;
        default:
            detected = TokenTypeEnum.Bearer;
            break;
    }
    return detected;
}


export const generateSecretToken = (detected: TokenTypeEnum): { access: string, refresh: string } => {
    let secrets: { access: string, refresh: string } = { access: '', refresh: '' };
    switch (detected) {
        case TokenTypeEnum.Admin:
            secrets = { access: process.env.JWT_SECRET_ACCESS_ADMIN!, refresh: process.env.JWT_SECRET_REFRESH_ADMIN! };
            break;
        default:
            secrets = { access: process.env.JWT_SECRET_ACCESS_USER!, refresh: process.env.JWT_SECRET_REFRESH_USER! };
            break;
    }
    // console.log('Generated secrets:', secrets);
    return secrets;
}

export const generateCredentialsToken = async (user: HUserDocument): Promise<{ accessToken: string, refreshToken: string }> => {
    const detected = detectCredentialTokenType(user.role);
    const secrets = generateSecretToken(detected);

    const accessToken = await generateToken({ payload: { id: user._id, role: user.role }, secret: secrets.access, options: { expiresIn: '1h' } });
    const refreshToken = await generateToken({ payload: { id: user._id, role: user.role }, secret: secrets.refresh, options: { expiresIn: '1h' } });

    return { accessToken, refreshToken };
}