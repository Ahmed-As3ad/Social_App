import { Request, Response } from "express";
import { ISignInBodyInputsDTO, ISignUpBodyInputsDTO, ISignUpGmailDTO, IVerifyOtpBodyInputsDTO } from "./auth.DTO";
import UserModel, { providerEnum } from "../../DB/model/User.model.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "../../utils/response/error.response.js";
import { compareData } from "../../utils/security/hash.utils.js";
import { generateOtp } from "../../utils/Email/Otp.js";
import { generateCredentialsToken, revokeToken } from "../../utils/security/token.security.js";
import { JwtPayload } from "jsonwebtoken";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { SuccessResponse } from "../../utils/response/success.response.js";
import { ILogin } from "./auth.entities.js";


class AuthService {
    private userModel = new UserRepository(UserModel);
    constructor() { }

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles user signup
     * @example ({ firstName, lastName, email, password, DOB }: ISignUpBodyInputsDTO)
     * return {message: 'Registered Successfully', statusCode: 201}
     * 
     */
    signUp = async (req: Request, res: Response): Promise<Response> => {

        const { firstName, lastName, email, password, DOB }: ISignUpBodyInputsDTO = req.body;
        const checkUser = await this.userModel.findOne({ filter: { email }, options: { lean: true }, select: 'email' });

        if (checkUser) {
            throw new ConflictException('Email already in use');
        }
        const otp = generateOtp();
        const newUser = await this.userModel.createUser({ data: [{ firstName, lastName, email, password, DOB, confirmedEmailOtp: String(otp), otpExpire: new Date(Date.now() + 3 * 60 * 1000) }] });

        return SuccessResponse({ res, message: 'Registered Successfully', data: { newUser } });
    }
    /**
     * 
     * @param idToken - Google ID Token
     * @returns - Promise<TokenPayload>
     * @description - This function verifies Google ID Token and returns the token payload
     * @example (idToken)
     * return { email: '<email>', name: '<name>', picture: '<picture>' }
     */
    private async verifyGmailToken(idToken: string): Promise<TokenPayload> {
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_ID?.split(',') || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new BadRequestException('Email not verified by Google');
        }
        return payload;
    }

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles user signup with Google
     * @example ({ idToken }: ISignUpGmailDTO)
     * return {message: 'Registered Successfully', statusCode: 201}
     */
    signUpWithGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: ISignUpGmailDTO = req.body;
        const { email, given_name, family_name, picture }: TokenPayload = await this.verifyGmailToken(idToken);
        const user = await this.userModel.findOne({ filter: { email } });
        if (user) {
            if (user.provider === providerEnum.google) {
                return await this.signInWithGmail(req, res);
            }
            throw new ConflictException(`Email already registered with ${user.provider}, please use ${user.provider} to login`);
        }
        const newUser = await this.userModel.createUser({
            data: [{
                firstName: given_name as string,
                lastName: family_name as string,
                email: email as string,
                provider: providerEnum.google,
                avatar: picture as string,
                confirmedAt: new Date()
            }]
        });
        if (!newUser) {
            throw new BadRequestException('Failed to create user with Google');
        }
        const { accessToken, refreshToken } = await generateCredentialsToken(newUser);
        return SuccessResponse<ILogin>({ res, message: "Registered Successfully", data: { tokens: { accessToken, refreshToken } } });
    }

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles user signin with Google
     * @example ({ idToken }: ISignUpGmailDTO)
     * return {message: 'Login successful', statusCode: 200}
     */
    signInWithGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: ISignUpGmailDTO = req.body;
        const { email }: TokenPayload = await this.verifyGmailToken(idToken);
        const user = await this.userModel.findOne({ filter: { email, provider: providerEnum.google } });
        if (!user) {
            throw new NotFoundException('Email not registered, please sign up first');
        }

        const { accessToken, refreshToken } = await generateCredentialsToken(user);
        return SuccessResponse<ILogin>({ res, message: "Login successful", data: { tokens: { accessToken, refreshToken } } });
    }

    /**
     * 
     * @param req 
     * @param res 
     * @returns - Promise<Response>
     * @description - This function handles email verification
     * @example ({ email, otp }: IVerifyOtpBodyInputsDTO)
     * return {message: 'Email verified successfully', statusCode: 200}
     */
    verifyEmail = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp }: IVerifyOtpBodyInputsDTO = req.body;
        const user = await this.userModel.findOne({ filter: { email, confirmedEmailOtp: { $exists: true }, confirmedAt: { $exists: false } } });
        if (!user) {
            throw new ConflictException('Invalid request or Email already verified');
        }
        if (!(await compareData(otp, user.confirmedEmailOtp!))) {
            throw new ConflictException('Invalid OTP');
        }
        if (user.otpExpire && new Date() > user.otpExpire) {
            throw new BadRequestException('OTP has expired, please request a new one');
        }
        await this.userModel.updateOne({ filter: { email }, update: { confirmedAt: new Date().toLocaleString(), $unset: { confirmedEmailOtp: 1, otpExpire: 1 } } });
        return SuccessResponse({ res, message: 'Email verified successfully' });
    }

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles user login
     * @example ({ email, password }: ISignInBodyInputsDTO)
     * return {message: 'Login successful', statusCode: 200, tokens: { accessToken, refreshToken }}
     */
    login = async (req: Request, res: Response): Promise<Response> => {
        const { email, password }: ISignInBodyInputsDTO = req.body;
        const user = await this.userModel.findOne({ filter: { email, provider: providerEnum.system }, select: 'email firstName lastName DOB confirmedAt role password freezeAt' });

        if (!user) {
            throw new ConflictException('Invalid email or password');
        }
        if (!(await compareData(password, user.password))) {
            throw new ConflictException('Invalid email or password');
        }
        if (user.freezeAt) {
            throw new ForbiddenException('Your account is frozen. Please contact support to resolve this issue.');
        }
        if (!user.confirmedAt) {
            throw new BadRequestException('Please verify your email to login');
        }

        const { accessToken, refreshToken } = await generateCredentialsToken(user);

        return SuccessResponse<ILogin>({ res: res, message: 'Login successful', data: { tokens: { accessToken, refreshToken } } });
    }

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles token refresh
     * @example ({ user }: IRefreshTokenBodyInputsDTO)
     * return {message: 'Generated new tokens successfully', statusCode: 200}
     */
    refreshToken = async (req: Request, res: Response): Promise<Response> => {
        const { accessToken, refreshToken } = await generateCredentialsToken(req.user!);
        await revokeToken(req.decoded as JwtPayload);
        return SuccessResponse<ILogin>({ res: res, message: 'Generated new tokens successfully', data: { tokens: { accessToken, refreshToken } } });
    }
}
export default new AuthService();