const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const mode = process.argv[2]; // 'dev' or 'prod'

if (!['dev', 'prod'].includes(mode)) {
  console.log('Usage: node toggle-db.js <dev|prod>');
  process.exit(1);
}

let content = fs.readFileSync(schemaPath, 'utf8');

if (mode === 'dev') {
  content = content.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
  content = content.replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url = env("DATABASE_FILE")');
  console.log('Switched Prisma to SQLite (dev mode)');
} else {
  content = content.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  content = content.replace(/url\s*=\s*"file:\.\/dev\.db"/, 'url = env("DATABASE_URL")');
  console.log('Switched Prisma to PostgreSQL (prod mode)');
}

fs.writeFileSync(schemaPath, content);
