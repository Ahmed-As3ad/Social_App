import { Request, Response } from "express";
import { ISignInBodyInputsDTO, ISignUpBodyInputsDTO, IVerifyOtpBodyInputsDTO } from "./auth.DTO";
import UserModel from "../../DB/model/User.model.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import { BadRequestException, ConflictException } from "../../utils/response/error.response.js";
import { compareData, hashData } from "../../utils/security/hash.utils.js";
import { emailEvent } from "../../utils/events/email.event.js";
import { html } from "../../utils/Email/email.template.js";
import { generateOtp } from "../../utils/Email/Otp.js";
import { generateCredentialsToken, revokeToken } from "../../utils/security/token.security.js";
import { JwtPayload } from "jsonwebtoken";


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
        const newUser = await this.userModel.createUser({ data: [{ firstName, lastName, email, password: await hashData(password), DOB, confirmedEmailOtp: await hashData(String(otp)) }] });

        // Send welcome email
        const emailData = { to: email, subject: 'Confirm your email✉️', html: html(firstName, otp) };
        emailEvent.emit('sendEmail', emailData);

        return res.status(201).json({
            message: 'Registered Successfully',
            data: { newUser }
        });
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
        await this.userModel.updateOne({ filter: { email }, update: { confirmedAt: new Date().toLocaleString(), $unset: { confirmedEmailOtp: 1 } } });
        return res.json({ message: 'Email verified successfully' });
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
        const user = await this.userModel.findOne({ filter: { email }, select: 'email firstName lastName DOB confirmedAt role password' });

        if (!user) {
            throw new ConflictException('Invalid credentials');
        }
        if (!(await compareData(password, user.password))) {
            throw new ConflictException('Invalid credentials');
        }
        if (!user.confirmedAt) {
            throw new BadRequestException('Please verify your email to login');
        }

        const { accessToken, refreshToken } = await generateCredentialsToken(user);

        return res.json({
            message: 'Login successful',
            tokens: { accessToken, refreshToken }
        });
    }
    refreshToken = async (req: Request, res: Response): Promise<Response> => {
        const { accessToken, refreshToken } = await generateCredentialsToken(req.user!);
        await revokeToken(req.decoded as JwtPayload);
        return res.json({
            message: 'Token refreshed successfully',
            tokens: { accessToken, refreshToken }
        });
    }
}
export default new AuthService();