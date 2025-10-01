import { Response } from "express";

export const SuccessResponse = <T = any | null>({
    res,
    status = 200,
    message = 'success',
    data
}: {
    res: Response;
    status?: number;
    message?: string;
    data?: T;
}): Response => {
    return res.status(status).json({
        message,
        data: data || null
    });
}