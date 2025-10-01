import { DeleteObjectCommand, DeleteObjectCommandOutput, DeleteObjectsCommand, DeleteObjectsCommandOutput, GetObjectCommand, GetObjectCommandOutput, ListObjectsV2Command, ListObjectsV2CommandOutput, ObjectCannedACL, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuid } from 'uuid'
import { BadRequestException } from '../response/error.response.js'
import { storageTypeEnum } from './cloud.multer.js'
import { createReadStream } from 'node:fs'
import { Upload } from '@aws-sdk/lib-storage'

export const s3 = () => {
    return new S3Client({
        region: process.env.AWS_REGION as string,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
        }
    })
}

// for small files
export const AWS_upload = async ({ Bucket = process.env.AWS_BUCKET_NAME as string, path = "general", ACL = "private", file, storageType = storageTypeEnum.memory }: { Bucket?: string, path?: string, ACL?: ObjectCannedACL, file: Express.Multer.File, storageType?: storageTypeEnum }): Promise<string> => {
    const command = new PutObjectCommand({
        Bucket: Bucket,
        ACL,
        Key: `${Bucket}/${path}/${uuid()}_${file.originalname}`,
        Body: storageType === storageTypeEnum.memory ? file.buffer : createReadStream(file.path),
        ContentType: file.mimetype
    })
    await s3().send(command)
    if (!command.input.Key) throw new BadRequestException('failed uploading file to S3')
    return command.input.Key
}

// for large files
export const AWS_uploadLargeFile = async ({ Bucket = process.env.AWS_BUCKET_NAME as string, path = "general", ACL = "private", file, storageType = storageTypeEnum.disk }: { Bucket?: string, path?: string, ACL?: ObjectCannedACL, file: Express.Multer.File, storageType?: storageTypeEnum }): Promise<string> => {
    const upload = new Upload({
        client: s3(),
        params: {
            Bucket,
            ACL,
            Key: `${Bucket}/${path}/${uuid()}_${file.originalname}`,
            Body: storageType === storageTypeEnum.memory ? file.buffer : createReadStream(file.path),
            ContentType: file.mimetype
        }
    })
    const { Key } = await upload.done();
    if (!Key) throw new BadRequestException('failed uploading file');
    return Key;
}

// for multiple files
export const AWS_UploadFiles = async ({ Bucket = process.env.AWS_BUCKET_NAME as string, ACL = "private", path = "general", files, storageType = storageTypeEnum.disk, useLargeFiles = false }: { Bucket?: string, ACL?: ObjectCannedACL, path?: string, files: Express.Multer.File[], storageType?: storageTypeEnum, useLargeFiles?: boolean }) => {
    let urls: string[] = [];
    if (useLargeFiles) {
        urls = await Promise.all(files.map(file => AWS_uploadLargeFile({ Bucket, ACL, path, file, storageType }))) as unknown as string[];
    } else {
        urls = await Promise.all(files.map(file => AWS_upload({ Bucket, ACL, path, file, storageType }))) as unknown as string[];
    }
    return urls;
}

export const AWS_PreSignedUrl = async ({ Bucket, originalname, expiresIn = Number(process.env.AWS_EXPIRES_IN), path = 'general', contentType }: { Bucket?: string, originalname?: string, expiresIn?: number, path?: string, contentType?: string }) => {
    const command = new PutObjectCommand({
        Bucket,
        Key: `${Bucket}/${path}/${uuid()}_pre_${originalname}`,
        ContentType: contentType
    })
    if (!command.input.Key) throw new BadRequestException('Failed to generate pre-signed URL');
    const url = await getSignedUrl(s3(), command, { expiresIn });
    return { url, Key: command.input.Key };
}

export const AWS_GetFileStream = async ({ key, Bucket = process.env.AWS_BUCKET_NAME as string }: { key: string, Bucket?: string }): Promise<GetObjectCommandOutput> => {
    const command = new GetObjectCommand({
        Bucket,
        Key: key
    })
    return await s3().send(command)
}

export const AWS_DeleteFile = async ({ Key, Bucket = process.env.AWS_BUCKET_NAME as string }: { Key: string, Bucket?: string }): Promise<DeleteObjectCommandOutput> => {
    const command = new DeleteObjectCommand({
        Bucket,
        Key
    })
    return await s3().send(command)
}

export const AWS_DeleteFiles = async ({ Bucket = process.env.AWS_BUCKET_NAME as string, urls }: { Bucket?: string, urls: string[] }): Promise<DeleteObjectsCommandOutput> => {
    const Objects = urls.map((url) => { return { Key: url } });
    const DeleteFiles = new DeleteObjectsCommand({
        Bucket: Bucket,
        Delete: {
            Objects,
            Quiet: false
        }
    })
    return await s3().send(DeleteFiles);
}

export const AWS_ReadFiles = async ({ Bucket = process.env.AWS_BUCKET_NAME as string, path }: { Bucket?: string, path: string }): Promise<ListObjectsV2CommandOutput> => {
    const command = new ListObjectsV2Command({
        Bucket,
        Prefix: `${Bucket}/${path}`
    })
    const listedObjects = await s3().send(command);
    return listedObjects;
}