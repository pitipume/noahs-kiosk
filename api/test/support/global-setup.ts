import { execSync } from 'child_process';
import './env'; // sets DATABASE_URL to the test database

// Runs once before all tests: bring the test database schema up to date.
export default function globalSetup() {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
