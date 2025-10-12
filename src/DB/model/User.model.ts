import mongoose, { HydratedDocument, Schema, Types } from "mongoose";
import { emailEvent } from "../../utils/events/email.event.js";
import { html } from "../../utils/Email/email.template.js";
import { hashData } from "../../utils/security/hash.utils.js";

export enum GenderEnum {
    male = "male",
    female = "female"
}

export enum RoleEnum {
    user = "user",
    admin = "admin",
    superAdmin = "superAdmin"
}
export enum providerEnum {
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
    tempAvatar?: string,
    covers: string[],
    password: string,
    resetPasswordOtp: string,
    otpExpire: Date,
    changeCredentialsTime: Date,
    DOB: string,
    age: number,
    phone?: string,
    address?: string,
    gender: GenderEnum,
    role: RoleEnum,
    friends?: Types.ObjectId[];
    provider: providerEnum,
    freezeAt?: Date,
    freezeReason?: string,
    freezeBy?: Types.ObjectId,
    restoredAt?: Date,
    restoredBy?: Types.ObjectId,
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
    tempAvatar: { type: String, trim: true },
    covers: { type: [String], default: [] },
    password: { type: String, required: function () { return this.provider === providerEnum.system ? true : false }, trim: true },
    resetPasswordOtp: { type: String, trim: true },
    otpExpire: { type: Date },
    changeCredentialsTime: { type: Date },
    DOB: { type: String, required: function () { return this.provider === providerEnum.system ? true : false }, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    gender: { type: String, enum: Object.values(GenderEnum), default: GenderEnum.male },
    role: { type: String, enum: Object.values(RoleEnum), default: RoleEnum.user },
    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    provider: { type: String, enum: Object.values(providerEnum), default: providerEnum.system },
    freezeAt: { type: Date },
    freezeReason: { type: String },
    freezeBy: { type: Schema.Types.ObjectId, ref: 'User' },
    restoredAt: { type: Date },
    restoredBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictQuery: true
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

userSchema.virtual('formattedJoinDate').get(function () {
    return new Date(this.createdAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
})

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

export type HUserDocument = HydratedDocument<IUser>;

userSchema.pre('save', async function (this: HUserDocument & { wasNew: boolean, confirmEmailPlainOtp: string }, next) {
    this.wasNew = this.isNew
    if (this.isModified('password')) {
        this.password = await hashData(this.password);
    }
    if (this.confirmedEmailOtp) {
        this.confirmEmailPlainOtp = this.confirmedEmailOtp;
        this.confirmedEmailOtp = await hashData(this.confirmedEmailOtp);
    }
    next();
});
userSchema.post('save', function (doc, next) {
    const that = this as HUserDocument & { wasNew: boolean, confirmEmailPlainOtp?: string };
    if (that.wasNew) {
        emailEvent.emit('sendEmail', { to: that.email, subject: 'Confirm your email✉️', html: html(that.firstName, Number(that.confirmEmailPlainOtp)) });
    }
    console.log('User has been saved:', doc);
    next();
})

userSchema.pre(['findOne', 'find'], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query })
    } else {
        this.setQuery({ ...query, freezeAt: { $exists: false } })
    }
    next();
})

const UserModel = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export default UserModel;