import cron from 'node-cron';
import path from 'path';
import fs from 'fs';

const RETENTION_DAYS = 30;

function getBackupDir(): string {
  return path.resolve(process.cwd(), 'backups');
}

export async function runBackup(dbPath?: string): Promise<string> {
  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `peak360-${timestamp}.db`;
  const dest = path.join(backupDir, filename);

  // Open a SEPARATE readonly connection for backup (do not reuse the app connection)
  const Database = require('better-sqlite3');
  const source = dbPath ?? 'local.db';
  const rawDb = new Database(source, { readonly: true });
  await rawDb.backup(dest);
  rawDb.close();

  // Clean old backups after successful new backup
  cleanOldBackups();

  return dest;
}

export function cleanOldBackups(): void {
  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) return;
  const files = fs.readdirSync(backupDir);
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const file of files) {
    if (!file.startsWith('peak360-') || !file.endsWith('.db')) continue;
    const filepath = path.join(backupDir, file);
    const stat = fs.statSync(filepath);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(filepath);
    }
  }
}

let schedulerStarted = false;

export function startBackupScheduler(): void {
  // Only run for SQLite (not PostgreSQL -- PG has its own backup tools)
  if (process.env.DATABASE_URL) return;
  // Prevent double-start (runMigrations may be called multiple times in dev with HMR)
  if (schedulerStarted) return;
  schedulerStarted = true;

  const schedule = process.env.BACKUP_SCHEDULE ?? '0 2 * * *';
  cron.schedule(schedule, () => {
    runBackup()
      .then((dest) => console.log(`[backup] Created: ${path.basename(dest)}`))
      .catch((err) => console.error('[backup] Failed:', err));
  });
  console.log(`[backup] Scheduler started (${schedule})`);
}
