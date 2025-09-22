import { hash, compare } from 'bcryptjs'

export const hashData = async (plainText: string, saltRounds: number = process.env.SALT_ROUNDS ? Number(process.env.SALT_ROUNDS) : 10): Promise<string> => {
    const hashed = await hash(plainText, saltRounds);
    return hashed;
}

export const compareData = async (plainText: string, hashed: string): Promise<boolean> => {
    const isMatch = await compare(plainText, hashed);
    return isMatch;
}