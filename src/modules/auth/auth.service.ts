import { Request, Response } from "express";
import { ISignInBodyInputsDTO, ISignUpBodyInputsDTO } from "./auth.DTO";
import UserModel from "../../DB/model/User.model.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import { ConflictException } from "../../utils/response/error.response.js";
import { hashData } from "../../utils/security/hash.utils.js";
import { emailEvent } from "../../utils/events/email.event.js";
import { html } from "../../utils/Email/email.template.js";
import { generateOtp } from "../../utils/Email/Otp.js";


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
    login = (req: Request, res: Response): Response => {
        const { email, password }: ISignInBodyInputsDTO = req.body;
        return res.json({ message: 'Login route', data: { email, password } });
    }
}
export default new AuthService();