import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';

const blacklistPath = path.join(__dirname, 'blacklist.json');
const defaultBlacklist = {
  blockedKeys: [
    "notorious_key_123",
    "bot_attacker_999",
    "spam_user_abc"
  ]
};
if (!fs.existsSync(blacklistPath)) {
  fs.writeFileSync(blacklistPath, JSON.stringify(defaultBlacklist, null, 2), 'utf-8');
  console.log('Created blacklist.json with default keys');
} else {
  console.log('blacklist.json already exists');
}
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