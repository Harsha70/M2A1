import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';

const blacklistPath = path.join(__dirname, 'blacklist.json');
const blacklist = JSON.parse(fs.readFileSync(blacklistPath, 'utf-8'));

export const blacklistMiddleware = (req: Request, res:Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) return next();
    try{
    if (blacklist.blockedKeys.includes(apiKey)) {
        return res.status(403).json({ error: "API key is blacklisted" });
    }
    next();
    }catch(error){
        console.error("Blacklist error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}