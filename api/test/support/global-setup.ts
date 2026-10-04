import { execSync } from 'child_process';

// Runs once before all tests: bring the test database schema up to date.
export default function globalSetup() {
  require('./env');
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
