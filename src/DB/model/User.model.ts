import mongoose, { HydratedDocument, Schema } from "mongoose";

export enum GenderEnum {
    male = "male",
    female = "female"
}

export enum RoleEnum {
    user = "user",
    admin = "admin"
}
export enum providerEnum{
    google = "google",
    system = "system"
}

export interface IUser {
    firstName: string,
    lastName: string,
    fullName: string,
    email: string,
    confirmedEmailOtp?: string,
    confirmedAt: Date,
    avatar?: string,
    password: string,
    resetPasswordOtp: string,
    changeCredentialsTime: Date,
    DOB: string,
    age: number,
    phone?: string,
    address?: string,
    gender: GenderEnum,
    role: RoleEnum,
    provider: providerEnum,
    createdAt: Date,
    updatedAt?: Date
}

const userSchema = new Schema<IUser>({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true },
    confirmedEmailOtp: { type: String, trim: true },
    confirmedAt: { type: Date },
    avatar: { type: String, trim: true },
    password: { type: String, required: function(){ return this.provider === providerEnum.system? true : false }, trim: true },
    resetPasswordOtp: { type: String, trim: true },
    changeCredentialsTime: { type: Date },
    DOB: { type: String, required: function(){ return this.provider === providerEnum.system? true : false }, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    gender: { type: String, enum: Object.values(GenderEnum), default: GenderEnum.male },
    role: { type: String, enum: Object.values(RoleEnum), default: RoleEnum.user },
    provider: { type: String, enum: Object.values(providerEnum), default: providerEnum.system },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

userSchema.virtual('fullName').set(function (value: string) {
    if (!value || typeof value !== 'string') return;

    const names = value.trim().split(/\s+/);

    if (names.length === 1) {
        this.set({ firstName: names[0], lastName: '' });
    } else if (names.length === 2) {
        this.set({ firstName: names[0], lastName: names[1] });
    } else {
        this.set({
            firstName: names[0],
            lastName: names[names.length - 1]
        });
    }
}).get(function () {
    return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.virtual('age').get(function () {
    const birthDate = new Date(this.DOB);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // If birthday hasn't occurred this year yet, subtract 1 from age
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
})

const UserModel = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export type HUserDocument = HydratedDocument<IUser>;
export default UserModel;