const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const dotenv = require('../backend/node_modules/dotenv');

process.chdir(path.resolve(__dirname, '..'));
process.umask(0o077);

function readEnv(file) {
    return dotenv.parse(fs.readFileSync(file));
}

function run(command, args, env = {}, options = {}) {
    const result = spawnSync(command, args, {
        env: { ...process.env, ...env },
        stdio: 'inherit',
        ...options,
    });
    if (result.error || result.status !== 0) {
        throw new Error(`${command} failed${result.error ? `: ${result.error.code}` : ''}`);
    }
    return result.stdout?.toString().trim();
}

function pgEnv(connectionString) {
    const url = new URL(connectionString);
    return {
        PGHOST: url.hostname,
        PGPORT: url.port || '5432',
        PGUSER: decodeURIComponent(url.username),
        PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
        PGPASSWORD: decodeURIComponent(url.password),
        PGSSLMODE: url.searchParams.get('sslmode') || 'prefer',
        PGCONNECT_TIMEOUT: '10',
    };
}

function backup(connectionString) {
    fs.mkdirSync('backups', { recursive: true, mode: 0o700 });
    const file = path.resolve('backups', `mariposa-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
    run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', `${file}.partial`], pgEnv(connectionString));
    run('pg_restore', ['--list', `${file}.partial`], {}, { stdio: 'pipe' });
    if (!fs.statSync(`${file}.partial`).size) throw new Error('The backup is empty.');
    fs.renameSync(`${file}.partial`, file);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    fs.writeFileSync(`${file}.sha256`, `${hash}  ${path.basename(file)}\n`);
    console.log(`Backup verified: ${file} (${fs.statSync(file).size} bytes)`);
    return file;
}

function compose(args, envFile = '.env.docker') {
    return run('docker', ['compose', '-f', 'docker-compose.yml', ...args], { DOCKER_DB_ENV_FILE: envFile });
}

function move() {
    if (fs.existsSync('.env.docker')) throw new Error('Docker database already configured. Refusing to overwrite it.');
    const file = backup(readEnv('backend/.env').DATABASE_URL);
    run('docker', ['info'], {}, { stdio: 'pipe' });
    const pending = '.env.docker.pending';
    if (!fs.existsSync(pending)) {
        const password = crypto.randomBytes(32).toString('hex');
        fs.writeFileSync(pending, [
            'POSTGRES_USER=mariposa',
            'POSTGRES_DB=mariposa',
            `POSTGRES_PASSWORD=${password}`,
            `DATABASE_URL=postgresql://mariposa:${password}@127.0.0.1:5434/mariposa`,
            '',
        ].join('\n'), { flag: 'wx', mode: 0o600 });
    }
    compose(['up', '-d', '--wait', 'db'], pending);
    const target = pgEnv(readEnv(pending).DATABASE_URL);
    const tables = run('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c',
        "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','S','f');"], target, { stdio: 'pipe' });
    if (tables !== '0') throw new Error('The target database is not empty. Refusing to overwrite it.');
    run('pg_restore', ['--dbname', target.PGDATABASE, '--single-transaction', '--exit-on-error', '--no-owner', '--no-acl', file], target);
    run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-c', 'SELECT count(*) AS restored_tables FROM information_schema.tables WHERE table_schema = \'public\';'], target);
    fs.renameSync(pending, '.env.docker');
    console.log('Restore completed. The original database and backend/.env are unchanged. Run pnpm docker:launch to switch the app.');
}

function launch() {
    if (!fs.existsSync('.env.docker')) throw new Error('Run pnpm db:move first. The Docker database has not been restored yet.');
    compose(['up', '-d', '--wait', 'db']);
    run('corepack', ['pnpm@10.34.3', '--filter', 'backend', 'db:migrate'], {
        ...readEnv('backend/.env'),
        DATABASE_URL: readEnv('.env.docker').DATABASE_URL,
        COREPACK_ENABLE_PROJECT_SPEC: '0',
    });
    compose(['up', '-d', '--build', '--wait']);
}

try {
    const command = process.argv[2];
    if (command === 'backup') backup(readEnv(fs.existsSync('.env.docker') ? '.env.docker' : 'backend/.env').DATABASE_URL);
    else if (command === 'move') move();
    else if (command === 'launch') launch();
    else throw new Error('Use backup, move, or launch.');
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
