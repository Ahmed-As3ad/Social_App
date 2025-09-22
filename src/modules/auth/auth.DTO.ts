import { z } from 'zod';
import * as validators from './auth.validate'

export type ISignUpBodyInputsDTO = z.infer<typeof validators.signUpValidate.body>
export type ISignInBodyInputsDTO = z.infer<typeof validators.loginValidate.body>