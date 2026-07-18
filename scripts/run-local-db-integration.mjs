import { spawnSync } from 'node:child_process';

const requireRuntime = process.argv.includes('--require-runtime');
const onWindows = process.platform === 'win32';

function runSupabase(args, { inherit = false } = {}) {
  return spawnSync('supabase', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: onWindows,
    stdio: inherit ? 'inherit' : 'pipe',
  });
}

const cli = runSupabase(['--version']);
const status = cli.status === 0 ? runSupabase(['status', '--output', 'json']) : null;

if (cli.status !== 0 || status?.status !== 0) {
  const reason = cli.status !== 0
    ? 'Supabase CLI is not available.'
    : 'The isolated local Supabase stack is not running (Docker/Postgres unavailable).';
  const prefix = requireRuntime ? '[FAIL]' : '[SKIP]';
  console.log(`${prefix} Local PostgreSQL integration tests: ${reason}`);
  console.log('Start an isolated local stack with `supabase start`, then rerun `npm run test:db:require`.');
  process.exit(requireRuntime ? 1 : 0);
}

const tests = runSupabase(['test', 'db'], { inherit: true });
process.exit(tests.status ?? 1);
