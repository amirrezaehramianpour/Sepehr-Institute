import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { InstituteDatabase } from './electron/database.ts';
import type { InstituteState, Payment, UserRole } from './src/types/institute.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_PATH = process.env.SEPEHR_DB_PATH
  ? path.resolve(process.env.SEPEHR_DB_PATH)
  : path.resolve(DATA_DIR, 'sepehr.db');
const LEGACY_JSON_PATH = path.resolve(DATA_DIR, 'institute-db.json');

async function startServer() {
  const db = new InstituteDatabase({
    dbPath: DB_PATH,
    legacyJsonPaths: [LEGACY_JSON_PATH],
    isDesktop: false,
  });

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/state', (_req, res) => {
    try {
      res.json(db.getState());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put('/api/state', (req, res) => {
    try {
      const payload = req.body as InstituteState;
      db.saveFullState(payload);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/payments', (req, res) => {
    try {
      const payment = req.body as Payment;
      const updatedState = db.addPaymentTransactional(payment);
      res.json(updatedState);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/students/:id', (req, res) => {
    try {
      const updatedState = db.deleteStudentSafely(req.params.id);
      res.json(updatedState);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/reset-demo', (_req, res) => {
    try {
      res.json(db.resetToSeed());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/db-info', (_req, res) => {
    try {
      res.json(db.getDbInfo());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/backup/download', async (_req, res) => {
    const tmpBackup = path.join(os.tmpdir(), `sepehr-backup-${Date.now()}.db`);
    try {
      const meta = await db.createBackup(tmpBackup);
      const buffer = fs.readFileSync(tmpBackup);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-Backup-Created-At', meta.createdAt);
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    } finally {
      if (fs.existsSync(tmpBackup)) {
        fs.unlinkSync(tmpBackup);
      }
    }
  });

  app.post('/api/backup/restore', (req, res) => {
    const body = req.body as { fileName?: string; base64Content?: string };
    if (!body?.fileName || !body?.base64Content) {
      res.status(400).json({ error: 'فایل پشتیبان ارسال نشده است.' });
      return;
    }

    const ext = path.extname(path.basename(body.fileName)).toLowerCase();
    if (!['.db', '.sqlite', '.json'].includes(ext)) {
      res.status(400).json({ error: 'تنها فایل‌های با پسوند .db، .sqlite یا .json مجاز هستند.' });
      return;
    }

    const tmpRestore = path.join(os.tmpdir(), `sepehr-restore-${Date.now()}${ext}`);
    try {
      const buffer = Buffer.from(body.base64Content, 'base64');
      fs.writeFileSync(tmpRestore, buffer);
      const state = db.restoreFromBackupFile(tmpRestore);
      res.json({ state });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    } finally {
      if (fs.existsSync(tmpRestore)) {
        fs.unlinkSync(tmpRestore);
      }
    }
  });

  app.get('/api/users', (_req, res) => {
    try {
      res.json(db.listUsers());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/users', (req, res) => {
    try {
      const body = req.body as {
        username: string;
        fullName: string;
        role: UserRole;
        password: string;
      };
      const user = db.createUser(body);
      res.json(user);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/users/verify', (req, res) => {
    try {
      const body = req.body as { username: string; password: string };
      const user = db.verifyLogin(body.username ?? '', body.password ?? '');
      if (!user) {
        res.status(401).json({ error: 'نام کاربری یا رمز عبور نادرست است.' });
        return;
      }
      res.json(user);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    try {
      db.deleteUser(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.put('/api/users/require-login', (req, res) => {
    try {
      const body = req.body as { enabled: boolean };
      res.json(db.setRequireLogin(Boolean(body?.enabled)));
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sepehr Institute SQLite Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
