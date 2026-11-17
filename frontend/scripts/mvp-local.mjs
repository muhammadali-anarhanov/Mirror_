// Isolated, persisted local demo. Never loads remote database or provider secrets.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const backend = join(root, '../backend');
const suffix = createHash('sha256').update(root).digest('hex').slice(0, 10);
const stateDir = join(tmpdir(), `mirror-mvp-${process.getuid?.() ?? 'user'}-${suffix}`);
mkdirSync(stateDir, { recursive: true, mode: 0o700 });
const statePath = join(stateDir, 'credentials.json');
const fresh = !existsSync(statePath);
const state = fresh ? {
  tenant: randomUUID(), branch: randomUUID(), brandUser: randomUUID(), staffUser: randomUUID(),
  brandEmail: 'brand@mvp.mirror.test', staffEmail: 'staff@mvp.mirror.test',
  password: randomBytes(12).toString('hex'), jwt: randomBytes(32).toString('hex'),
} : JSON.parse(readFileSync(statePath, 'utf8'));
if (fresh) writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
const env = { ...process.env,
  DATABASE_URL: 'postgres://mvp@127.0.0.1:55440/postgres?sslmode=disable',
  JWT_SECRET: state.jwt, PORT: '8081', FRONTEND_URL: 'http://localhost:3000', APP_ENV: 'development',
  SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_PRODUCT_BUCKET: 'mvp-products',
  DECART_API_KEY: '', DECART_ENABLE_REALTIME: 'false', DB_MAX_CONNS: '5',
  BACKEND_URL: 'http://127.0.0.1:8081', NEXT_PUBLIC_API_BASE_URL: '/api/v1', NODE_ENV: 'production',
};
delete env.TURBOPACK;
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed (${result.status ?? result.error?.code})`);
  return result;
}
const dbDir = join(stateDir, 'postgres');
if (!existsSync(join(dbDir, 'PG_VERSION'))) run('initdb', ['-D', dbDir, '-U', 'mvp', '--auth-local=trust', '--auth-host=trust', '--no-locale', '-E', 'UTF8'], { stdio: 'ignore' });
const running = spawnSync('pg_ctl', ['-D', dbDir, 'status'], { stdio: 'ignore' }).status === 0;
if (!running) run('pg_ctl', ['-D', dbDir, '-l', join(stateDir, 'postgres.log'), '-o', `-h 127.0.0.1 -p 55440 -k ${stateDir}`, '-w', 'start']);
const binary = join(stateDir, 'mirror-api');
run('go', ['build', '-o', binary, './cmd/api'], { cwd: backend, env: { ...env, GOCACHE: join(tmpdir(), 'mirror-mvp-go-cache') } });
run(binary, ['migrate'], { cwd: backend });
const sql = (value) => "'" + String(value).replaceAll("'", "''") + "'";
if (!existsSync(join(stateDir, 'seeded'))) {
  const statements = [
    'BEGIN; CREATE EXTENSION IF NOT EXISTS pgcrypto;',
    `INSERT INTO mirror.tenants(id,name) VALUES(${sql(state.tenant)},'MIRROR MVP — SAMPLE DATA');`,
    `INSERT INTO mirror.branches(id,tenant_id,name) VALUES(${sql(state.branch)},${sql(state.tenant)},'MVP Demo Showroom');`,
    `INSERT INTO mirror.users(id,tenant_id,branch_id,email,password_hash,role) VALUES
      (${sql(state.brandUser)},${sql(state.tenant)},NULL,${sql(state.brandEmail)},crypt(${sql(state.password)},gen_salt('bf',12)),'BRAND_ADMIN'),
      (${sql(state.staffUser)},${sql(state.tenant)},${sql(state.branch)},${sql(state.staffEmail)},crypt(${sql(state.password)},gen_salt('bf',12)),'STAFF');`,
    `INSERT INTO mirror.subscriptions(tenant_id,plan_id) VALUES(${sql(state.tenant)},'starter');`,
  ];
  const categories = { top: 'Top Body', pants: 'Pants', footwear: 'Footwear', head: 'Head', full: 'Full Body' };
  for (const file of readdirSync(join(root, 'public/products')).filter(f => /^demo-.*\.png$/.test(f))) {
    const id = randomUUID(), stem = file.replace(/^demo-/, '').replace(/\.png$/, '');
    const category = categories[stem.split('-')[0]];
    if (!category) continue;
    statements.push(`INSERT INTO mirror.products(id,tenant_id,name,description,category,price_cents,sku,status) VALUES(${sql(id)},${sql(state.tenant)},${sql('DEMO — ' + stem.replaceAll('-', ' '))},'Sample garment for local MVP presentation.',${sql(category)},4900,${sql(stem)},'Published');`);
    statements.push(`INSERT INTO mirror.images(id,tenant_id,owner_id,product_id,bucket,object_path,mime_type,size_bytes,width,height,approved,kind) VALUES(${sql(randomUUID())},${sql(state.tenant)},${sql(state.brandUser)},${sql(id)},'mvp-products',${sql(file)},'image/png',1,1,1,true,'product');`);
    for (const size of ['S', 'M', 'L']) {
      const variant = randomUUID();
      statements.push(`INSERT INTO mirror.variants(id,tenant_id,product_id,size,color,sku) VALUES(${sql(variant)},${sql(state.tenant)},${sql(id)},${sql(size)},'Original',${sql(stem + '-' + size)});`);
      statements.push(`INSERT INTO mirror.inventory(tenant_id,branch_id,variant_id,quantity) VALUES(${sql(state.tenant)},${sql(state.branch)},${sql(variant)},10);`);
    }
  }
  statements.push('COMMIT;');
  run('psql', [env.DATABASE_URL, '-X', '-v', 'ON_ERROR_STOP=1', '-q'], { input: statements.join('\n'), stdio: ['pipe', 'inherit', 'inherit'] });
  writeFileSync(join(stateDir, 'seeded'), new Date().toISOString());
}
if (!process.argv.includes('--skip-build')) run(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack']);
console.log(`\nMIRROR local MVP: http://localhost:3000\nPrivate demo login details: ${statePath}\nSample data only. AI fitting and remote storage uploads are disabled.\nCtrl+C stops the frontend/backend; local database is retained for restart.\n`);
const children = [
  spawn(binary, [], { cwd: backend, env, stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', 'localhost', '--port', '3000'], { cwd: root, env, stdio: 'inherit' }),
];
let stopping = false;
function stop() { if (stopping) return; stopping = true; for (const child of children) child.kill('SIGTERM'); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
for (const child of children) {
  child.on('error', error => { console.error(error.message); process.exitCode = 1; stop(); });
  child.on('exit', (code, signal) => { if (!stopping) { process.exitCode = code || (signal ? 1 : 0); stop(); } });
}
