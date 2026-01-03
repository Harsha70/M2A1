import express, { Request, Response } from 'express';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db"
})

const prisma = new PrismaClient({adapter});
const app = express();
app.use(express.json());

app.post('/shorten', async (req: Request, res: Response): Promise<any> => {
  const { longUrl } = req.body;

//   console.log('longUrl------------------',longUrl);
  
  const existing = await prisma.url.findUnique({ where: { longUrl } });
  if (existing) return res.json({ code: existing.shortCode });

  const shortCode = nanoid(6);
  const newUrl = await prisma.url.create({
    data: { longUrl, shortCode }
  });
  res.status(201).json({ code: newUrl.shortCode });
});

app.get('/redirect', async (req: Request, res: Response): Promise<any> => {
  const { code } = req.query;
  const entry = await prisma.url.findUnique({ where: { shortCode: String(code) } });
  
  if (!entry) return res.status(404).json({ error: "Short code not found" });
  res.redirect(entry.longUrl);
});

app.delete('/shorten/:code', async (req: Request, res: Response) => {
  try {
    await prisma.url.delete({ where: { shortCode: req.params.code } });
    res.status(204).send();
  } catch (e) {
    res.status(404).json({ error: "Code not found" });
  }
});

export default app;
