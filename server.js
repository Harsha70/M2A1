import express from 'express';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.post('/shorten', async (req, res) => {
  const { longUrl } = req.body;
  
  const existing = await prisma.url.findUnique({ where: { longUrl } });
  if (existing) return res.json({ code: existing.shortCode });

  const shortCode = nanoid(6);
  const newUrl = await prisma.url.create({
    data: { longUrl, shortCode }
  });
  res.status(201).json({ code: newUrl.shortCode });
});

app.get('/redirect', async (req, res) => {
  const { code } = req.query;
  const entry = await prisma.url.findUnique({ where: { shortCode: String(code) } });
  
  if (!entry) return res.status(404).json({ error: "Short code not found" });
  res.redirect(entry.longUrl);
});

app.delete('/shorten/:code', async (req, res) => {
  try {
    await prisma.url.delete({ where: { shortCode: req.params.code } });
    res.status(204).send();
  } catch (e) {
    res.status(404).json({ error: "Code not found" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));