import type { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { sign, verify } from 'jsonwebtoken';
import { BadRequestException, ForbiddenException } from '../response/error.response.js';
import UserModel, { HUserDocument, RoleEnum } from '../../DB/model/User.model.js';
import { UserRepository } from '../../DB/repository/user.repository.js';
import { v4 as uuid } from 'uuid';
import { TokenRepository } from '../../DB/repository/token.repository.js';
import TokenModel from '../../DB/model/Token.model.js';

export enum TokenTypeEnum {
    Bearer = 'Bearer',
    Admin = 'Admin'
}
export enum TokenEnum {
    access = 'access',
    refresh = 'refresh'
}

export enum LogoutEnum {
    only = 'only',
    all = 'all'
}


export const generateToken = async ({ payload, secret = process.env.JWT_SECRET_ACCESS_USER, options = { expiresIn: Number(process.env.JWT_EXPIRES_IN_ACCESS) || 3600 } }: { payload: object, secret?: Secret, options?: SignOptions }): Promise<string> => {
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
    console.log('Generated secrets:', secrets);
    return secrets;
}

export const generateCredentialsToken = async (user: HUserDocument): Promise<{ accessToken: string, refreshToken: string }> => {
    const detected = detectCredentialTokenType(user.role);
    const secrets = generateSecretToken(detected);
    const jti = uuid();
    const accessToken = await generateToken({ payload: { id: user._id, role: user.role, jti }, secret: secrets.access, options: { expiresIn: Number(process.env.JWT_EXPIRES_IN_ACCESS) || 3600 } });
    const refreshToken = await generateToken({ payload: { id: user._id, role: user.role, jti }, secret: secrets.refresh, options: { expiresIn: Number(process.env.JWT_EXPIRES_IN_REFRESH) || 1209600 } });

    return { accessToken, refreshToken };
}

export const revokeToken = async (decoded: JwtPayload) => {
    const tokenModel = new TokenRepository(TokenModel);
    const result = await tokenModel.create({
        data: [{
            jti: decoded?.jti as string,
            expiresIn: decoded?.iat as number + Number(process.env.JWT_EXPIRES_IN_REFRESH),
            userId: decoded?.id
        }]
    })
    if (!result || result.length === 0) {
        throw new BadRequestException('Failed to revoke token');
    }
    return result;
}

export const decodedToken = async ({ authorization, tokenType = TokenEnum.access }: { authorization: string, tokenType?: TokenEnum }): Promise<JwtPayload> => {
    const userModel = new UserRepository(UserModel);
    const tokenModel = new TokenRepository(TokenModel);
    const [bearerKey, token] = authorization.split(' ');
    if (!bearerKey || !token) {
        throw new BadRequestException('Invalid token format');
    }
    const signatures = await generateSecretToken(bearerKey as TokenTypeEnum);
    const decoded = await verify(token, tokenType === TokenEnum.refresh ? signatures.refresh : signatures.access) as JwtPayload;
    if (!decoded.id || !decoded.iat) {
        throw new BadRequestException('Invalid token payload');
    }
    if (await tokenModel.findOne({ filter: { jti: decoded?.jti } })) {
        throw new ForbiddenException('Token is revoked, please login again');
    }

    const user = await userModel.findOne({ filter: { _id: decoded?.id } });
    if (!user) {
        throw new BadRequestException('User not found');
    }
    if ((user?.changeCredentialsTime?.getTime() || 0) > decoded?.iat * 1000) {
        throw new ForbiddenException('Token is expired, please login again');
    }
    return { user, decoded };
}