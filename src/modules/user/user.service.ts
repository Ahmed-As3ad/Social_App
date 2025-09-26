import { Request, Response } from "express";

class userService {
    constructor() { }
    profile = async (req: Request, res: Response): Promise<Response> => {
        return res.json({ message: "user profile", user: req.user, decoded: req.decoded })
    }
}

export default new userService();
