import { EventEmitter } from 'node:events'
import { AWS_GetFileStream } from '../multer/s3.config.js';
import { UserRepository } from '../../DB/repository/user.repository.js';
import UserModel, { HUserDocument } from '../../DB/model/User.model.js';
import { Types, UpdateQuery } from 'mongoose';
import { NotFoundException } from '../response/error.response.js';

export const AWSEvent = new EventEmitter();
AWSEvent.on('checkFileExists', async ({ data, expiresIn }: { data: { url: string, Key: string, id: Types.ObjectId }, expiresIn: number }) => {
    const userModel = new UserRepository(UserModel);
    setTimeout(async () => {
        try {
            const exists = await AWS_GetFileStream({ key: data.Key, Bucket: process.env.AWS_BUCKET_NAME as string });
            if (exists) {
                const user = await userModel.findOne({ filter: { _id: data.id } });
                if (!user) throw new NotFoundException('User not found while confirming avatar');
                await userModel.updateOne({ filter: { _id: data.id }, update: { $unset: { tempAvatar: 1 } } });
            }
        } catch (error: any) {
            if (error.Code === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
                let unSetData: UpdateQuery<HUserDocument> = { tempAvatar: 1 };
                if (!data.Key) {
                    unSetData = { tempAvatar: 1, avatar: 1 };
                }
                const user = await userModel.findOne({ filter: { _id: data.id } });
                if (!user) throw new NotFoundException('User not found while re-uploading avatar');
                await userModel.updateOne({ filter: { _id: data.id }, update: { avatar: user.tempAvatar || '', $unset: unSetData } });
                return;
            }
        }

    }, expiresIn * 1000);
})