import multer from "multer";
import os from "os";
import { Request } from "express";
import { v4 as uuid } from 'uuid';
import { BadRequestException } from "../response/error.response.js";

export enum storageTypeEnum {
    memory = 'memory',
    disk = 'disk'
}

export const ALLOWED_MIME_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    // video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    // audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
}

export const cloudMulter = ({allowedMimeTypes= ALLOWED_MIME_TYPES.image, type= storageTypeEnum.memory, maxSize = 10}:{allowedMimeTypes?: string[], type?: storageTypeEnum, maxSize?: number}) => {
    const storage = type === storageTypeEnum.memory ? multer.memoryStorage() : multer.diskStorage({
        destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
            cb(null, os.tmpdir());
        },
        filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
            cb(null, `${uuid()}-${file.originalname}`);
        }
    });

    function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new BadRequestException('Invalid mime type', { validationErrors: [{ key: 'file', issues: [{ path: 'file', message: `Allowed mime types: ${allowedMimeTypes.join(', ')}` }] }] } ))
        }
    }

    return multer({ fileFilter, limits: { fieldSize: maxSize * 1024 * 1024 }, storage });
}