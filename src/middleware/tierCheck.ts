import { Request, Response, NextFunction } from 'express';
import prisma from '../db';


export const tierCheck = async(req: Request, res: Response, next: NextFunction): Promise<any> => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    // console.log(user)
    if(user.tier !== 'enterprise') {
        return res.status(403).json({ 
            error: "Bulk creation is an Enterprise feature. Please upgrade your plan." 
        });
    }
    
    next();
    
}    