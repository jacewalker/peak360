import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('backup module', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('runBackup() creates a .db file in the backups directory with timestamped name', async () => {
    // Create a source DB to back up
    const Database = (await import('better-sqlite3')).default;
    const srcDb = new Database(path.join(tmpDir, 'local.db'));
    srcDb.pragma('journal_mode = WAL');
    srcDb.close();

    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const { runBackup } = await import('./backup');
    const dest = await runBackup(path.join(tmpDir, 'local.db'));
    const filename = path.basename(dest);

    expect(filename).toMatch(/^peak360-.*\.db$/);
    expect(dest).toContain(path.join(tmpDir, 'backups'));
    expect(fs.existsSync(dest)).toBe(true);
  });

  it('runBackup() returns the full path to the created backup file', async () => {
    const Database = (await import('better-sqlite3')).default;
    const srcDb = new Database(path.join(tmpDir, 'local.db'));
    srcDb.pragma('journal_mode = WAL');
    srcDb.close();

    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const { runBackup } = await import('./backup');
    const dest = await runBackup(path.join(tmpDir, 'local.db'));

    expect(path.isAbsolute(dest)).toBe(true);
    expect(dest).toContain('backups');
    expect(dest).toMatch(/\.db$/);
  });

  it('cleanOldBackups() deletes files older than 30 days and keeps newer files', async () => {
    const backupDir = path.join(tmpDir, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    // Create an "old" file (35 days ago)
    const oldFile = path.join(backupDir, 'peak360-old.db');
    fs.writeFileSync(oldFile, 'old');
    const oldTime = Date.now() - 35 * 24 * 60 * 60 * 1000;
    fs.utimesSync(oldFile, new Date(oldTime), new Date(oldTime));

    // Create a "new" file (today)
    const newFile = path.join(backupDir, 'peak360-new.db');
    fs.writeFileSync(newFile, 'new');

    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const { cleanOldBackups } = await import('./backup');
    cleanOldBackups();

    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(newFile)).toBe(true);
  });

  it('runBackup() creates the backups/ directory if it does not exist', async () => {
    const Database = (await import('better-sqlite3')).default;
    const srcDb = new Database(path.join(tmpDir, 'local.db'));
    srcDb.pragma('journal_mode = WAL');
    srcDb.close();

    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const backupDir = path.join(tmpDir, 'backups');
    expect(fs.existsSync(backupDir)).toBe(false);

    const { runBackup } = await import('./backup');
    await runBackup(path.join(tmpDir, 'local.db'));

    expect(fs.existsSync(backupDir)).toBe(true);
  });

  it('backup file is a valid SQLite database', async () => {
    const Database = (await import('better-sqlite3')).default;
    const srcDb = new Database(path.join(tmpDir, 'local.db'));
    srcDb.pragma('journal_mode = WAL');
    const createStmt = srcDb.prepare('CREATE TABLE test (id INTEGER)');
    createStmt.run();
    const insertStmt = srcDb.prepare('INSERT INTO test VALUES (42)');
    insertStmt.run();
    srcDb.close();

    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const { runBackup } = await import('./backup');
    const dest = await runBackup(path.join(tmpDir, 'local.db'));

    // Open the backup and verify it is a valid SQLite database
    const backupDb = new Database(dest, { readonly: true });
    const rows = backupDb.prepare('SELECT * FROM test').all();
    backupDb.close();

    expect(rows).toEqual([{ id: 42 }]);
  });

  it('startBackupScheduler() calls cron.schedule with default schedule', async () => {
    const scheduleFn = vi.fn();
    vi.doMock('node-cron', () => ({
      default: { schedule: scheduleFn },
    }));

    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const { startBackupScheduler } = await import('./backup');
    startBackupScheduler();

    expect(scheduleFn).toHaveBeenCalledWith(
      '0 2 * * *',
      expect.any(Function)
    );
  });

  it('startBackupScheduler() skips when DATABASE_URL is set (PostgreSQL mode)', async () => {
    const scheduleFn = vi.fn();
    vi.doMock('node-cron', () => ({
      default: { schedule: scheduleFn },
    }));

    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

    const { startBackupScheduler } = await import('./backup');
    startBackupScheduler();

    expect(scheduleFn).not.toHaveBeenCalled();
  });
});
