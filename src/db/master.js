const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../../data/master.sqlite');
let db;

function getDb() {
if (!db) {
db = new Database(dbPath);
db.pragma('journal_mode = WAL');
}
return db;
}

function initMasterDb() {
const database = getDb();

database.exec(`
 CREATE TABLE IF NOT EXISTS tenants (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 slug TEXT UNIQUE NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('master','demo','paid')),
 status TEXT NOT NULL DEFAULT 'active',
 expires_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );

 CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 tenant_id INTEGER,
 username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('master_admin','demo_user','paid_user')),
 is_active INTEGER NOT NULL DEFAULT 1,
 expires_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );

 CREATE TABLE IF NOT EXISTS audit_logs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_user_id INTEGER,
 tenant_id INTEGER,
 action TEXT NOT NULL,
 details TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
`);
}

function ensureSeedData() {
const database = getDb();

const masterTenant = database.prepare('SELECT * FROM tenants WHERE slug = ?').get('solutecno-master');
if (!masterTenant) {
database.prepare(`INSERT INTO tenants (name, slug, type) VALUES (?, ?, ?)`)
.run('Solutecno Master', 'solutecno-master', 'master');
}

const adminUser = database.prepare('SELECT * FROM users WHERE username = ?').get(process.env.MASTER_ADMIN_USER);
if (!adminUser) {
const hash = bcrypt.hashSync(process.env.MASTER_ADMIN_PASS, 10);
database.prepare(`INSERT INTO users (tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?)`)
.run(1, process.env.MASTER_ADMIN_USER, hash, 'master_admin');
}

const demos = [
{ username: 'demo1', slug: 'demo-1', name: 'Demo 1' },
{ username: 'demo2', slug: 'demo-2', name: 'Demo 2' },
{ username: 'demo3', slug: 'demo-3', name: 'Demo 3' }
];

for (const item of demos) {
let tenant = database.prepare('SELECT * FROM tenants WHERE slug = ?').get(item.slug);

if (!tenant) {
const expiresAt = new Date(Date.now() + Number(process.env.DEMO_DAYS || 7) * 86400000).toISOString();
const result = database.prepare(`INSERT INTO tenants (name, slug, type, expires_at) VALUES (?, ?, ?, ?)`)
.run(item.name, item.slug, 'demo', expiresAt);
tenant = { id: result.lastInsertRowid };
}

const existsUser = database.prepare('SELECT * FROM users WHERE username = ?').get(item.username);
if (!existsUser) {
const hash = bcrypt.hashSync('demo123456', 10);
const expiresAt = new Date(Date.now() + Number(process.env.DEMO_DAYS || 7) * 86400000).toISOString();
database.prepare(`INSERT INTO users (tenant_id, username, password_hash, role, expires_at) VALUES (?, ?, ?, ?, ?)`)
.run(tenant.id, item.username, hash, 'demo_user', expiresAt);
}
}
}

module.exports = { getDb, initMasterDb, ensureSeedData };
