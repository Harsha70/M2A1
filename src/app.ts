import express, { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import logMiddleware from './middleware/logger';
import { authenticate } from './middleware/authentication';
import prisma from './db';
import { tierCheck } from './middleware/tierCheck';
import { responseTimeNative } from './middleware/resTimelogging';

const app = express();
app.use(responseTimeNative);
app.use(express.json());

app.use(logMiddleware);

// old shorten
/*
app.post('/shorten', async (req: Request, res: Response): Promise<any> => {
  const { longUrl } = req.body;

  if (!longUrl || longUrl.trim() === "") {
    return res.status(400).json({ 
      error: "URL is required and cannot be empty" 
    });
  }

//   const existing = await prisma.url.findUnique({ where: { longUrl } });
//   if (existing) return res.json({ code: existing.shortCode });

  const shortCode = nanoid(6);
  const newUrl = await prisma.url.create({
    data: { longUrl, shortCode }
  });
  res.status(201).json({ code: newUrl.shortCode });
});
*/

// app.get('/redirect', async (req: Request, res: Response): Promise<any> => {
//   const { code } = req.query;
//   const entry = await prisma.url.findUnique({ where: { shortCode: String(code) } });
  
//   if (!entry) return res.status(404).json({ error: "Short code not found" });
//   res.redirect(entry.longUrl);
// });


app.get('/redirect', async (req: Request, res: Response): Promise<any> => {
  const { code, password } = req.query;
  const entry = await prisma.url.findUnique({ where: { shortCode: String(code) } });

  if (!entry || entry.deletedAt) {
    return res.status(404).json({ error: "Link not found" });
  }

  if (entry.expiresAt && new Date() > entry.expiresAt) {
    console.log('entry----------------',entry, code);
    return res.status(410).json({ error: "This link has expired" });
  }

  if (entry.password && entry.password !== password) {
    return res.status(401).json({ 
      error: "This link is password protected. Please provide the correct password." 
    });
  }

  await prisma.url.update({
    where: { id: entry.id },
    data: { clicks: { increment: 1 }, lastAccessedAt: new Date() }
  });

  res.redirect(entry.longUrl);
});

// old delete
/*
app.delete('/shorten/:code', async (req: Request, res: Response) => {
  try {
    await prisma.url.delete({ where: { shortCode: req.params.code } });
    res.status(204).send();
  } catch (e) {
    res.status(404).json({ error: "Code not found" });
  }
});
*/


app.post('/shorten', authenticate, async (req: Request, res: Response): Promise<any> => {
  const { longUrl, expiresAt, customCode, password } = req.body;
  const user = req.user!; 

  let shortCode = customCode || nanoid(6);
  const existing = await prisma.url.findUnique({ where: { shortCode } });
  if (existing) return res.status(409).json({ error: "Custom code already in use. Please choose another one." });

  const newUrl = await prisma.url.create({
    data: { 
      longUrl, 
      shortCode, 
      password: password || null, 
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      ownerId: user.id 
    }
  });
  res.status(201).json({ code: newUrl.shortCode });
});

app.post('/shorten/bulk', authenticate, tierCheck, async (req: Request, res: Response): Promise<any> => {
  const { urls } = req.body;
  const user = req.user!;

  // if (user.tier !== 'enterprise') {
  //   return res.status(403).json({ 
  //     error: "Bulk creation is an Enterprise feature. Please upgrade your plan." 
  //   });
  // }

  if (!Array.isArray(urls)) {
    return res.status(400).json({ error: "Input must be an array of URLs" });
  }
  const results = [];

  for (const item of urls) {
    try {
      if (!item.longUrl) throw new Error("Missing longUrl");
      
      const shortCode = item.customCode || nanoid(6);
      
      const newUrl = await prisma.url.create({
        data: {
          longUrl: item.longUrl,
          shortCode: shortCode,
          ownerId: user.id
        }
      });
      
      results.push({ longUrl: item.longUrl, code: newUrl.shortCode, status: "success" });
    } catch (error: any) {
      // console.log(error);
      // P2002 is the error code for unique constraint violation
      results.push({ 
        longUrl: item.longUrl, 
        error: error.code === 'P2002' ? "Code already taken" : error.message, 
        status: "error" 
      });
    }
  }
  res.status(207).json(results);
})

app.delete('/shorten/:code', authenticate, async (req: Request, res: Response): Promise<any> => {
  const { code } = req.params;
  const user = req.user!;

  const urlEntry = await prisma.url.findUnique({ where: { shortCode: code } });

  if (!urlEntry || urlEntry.deletedAt) return res.status(404).json({ error: "Link not found" });
  if (urlEntry.ownerId !== user.id) return res.status(403).json({ error: "Forbidden: You don't own this link" });

  await prisma.url.update({
    where: { shortCode: code },
    data: { deletedAt: new Date() }
  });

  res.status(204).send();
});

app.patch('/shorten/:code', authenticate, async (req: Request, res: Response): Promise<any> => {
  const { code } = req.params;
  const { longUrl, expiresAt, password } = req.body;
  const user = req.user!;

  const urlEntry = await prisma.url.findUnique({ where: { shortCode: code } });

  if (!urlEntry || urlEntry.deletedAt) return res.status(404).json({ error: "Link not found" });
  if (urlEntry.ownerId !== user.id) return res.status(403).json({ error: "Forbidden: You don't own this link" });


  const updated = await prisma.url.update({
    where: { shortCode: code },
    data: {
      longUrl: longUrl ?? urlEntry.longUrl,
      password: password !== undefined ? password : urlEntry.password,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : urlEntry.expiresAt
    }
  });
  console.log('updated----------------',updated);
  res.status(200).json(updated);
});

app.get('/urls', authenticate, async (req: Request, res: Response): Promise<any> => {
  const user = req.user!;

  const urls = await prisma.url.findMany({
    where: { 
      ownerId: user.id,
      deletedAt: null 
    },
    orderBy: { createdAt: 'desc' } 
  });

  res.json({
    user: user.email,
    total: urls.length,
    data: urls
  });
});

app.get('/health', async (req, res)=>{
  const healthStatus = {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    message: "OK",
    checks: {
     server: "UP",
     database: "DOWN" 
    }
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.checks.database = "UP";
  } catch (error) {
    healthStatus.message = "ERROR";
    healthStatus.checks.database = "DOWN";
    res.status(503).json(healthStatus);
  }
  res.status(200).json(healthStatus);
});

export default app;
