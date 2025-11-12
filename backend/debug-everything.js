/**
 * ULTIMATE DEBUG SCRIPT
 * =====================
 * Kiểm tra MỌI THỨ có thể gây lỗi password authentication
 *
 * Chạy: node debug-everything.js
 */

console.log('🔍 ULTIMATE DEBUG - CHECKING EVERYTHING...\n');
console.log('='.repeat(60));

// ============================================
// 1. CHECK NODE & NPM VERSIONS
// ============================================
console.log('\n📦 1. Node & NPM Versions:');
console.log('-'.repeat(60));
const { version } = process;
console.log('Node version:', version);
console.log('NPM version: (run: npm --version)');

// ============================================
// 2. CHECK CURRENT DIRECTORY
// ============================================
console.log('\n📁 2. Current Directory:');
console.log('-'.repeat(60));
console.log('Working dir:', process.cwd());

// ============================================
// 3. CHECK .env FILES
// ============================================
console.log('\n📄 3. Environment Files:');
console.log('-'.repeat(60));
const fs = require('fs');
const path = require('path');

const envFiles = ['.env', '.env.test', '_env'];
envFiles.forEach((file) => {
  const exists = fs.existsSync(file);
  console.log(`${file}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);

  if (exists) {
    const content = fs.readFileSync(file, 'utf8');
    const hasPassword = content.includes('DB_PASSWORD');
    console.log(`  Has DB_PASSWORD: ${hasPassword ? '✅' : '❌'}`);

    if (hasPassword) {
      const match = content.match(/DB_PASSWORD=(.+)/);
      if (match) {
        const pwd = match[1].trim();
        console.log(`  Password length: ${pwd.length} chars`);
        console.log(`  Password value: ${pwd.substring(0, 3)}***`);
      }
    }
  }
});

// ============================================
// 4. TRY LOADING .env
// ============================================
console.log('\n🔌 4. Loading Environment Variables:');
console.log('-'.repeat(60));

// Clear any existing env vars
delete process.env.DB_PASSWORD;
delete process.env.DB_USER;
delete process.env.DB_NAME;

// Try loading .env.test first
if (fs.existsSync('.env.test')) {
  console.log('Loading .env.test...');
  require('dotenv').config({ path: '.env.test' });
  console.log('✅ Loaded .env.test');
} else if (fs.existsSync('.env')) {
  console.log('Loading .env...');
  require('dotenv').config({ path: '.env' });
  console.log('✅ Loaded .env');
} else if (fs.existsSync('_env')) {
  console.log('Loading _env...');
  require('dotenv').config({ path: '_env' });
  console.log('✅ Loaded _env');
} else {
  console.log('❌ No environment file found!');
}

// ============================================
// 5. CHECK ENVIRONMENT VARIABLES
// ============================================
console.log('\n🔐 5. Environment Variables After Loading:');
console.log('-'.repeat(60));

const envVars = {
  NODE_ENV: process.env.NODE_ENV,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
};

Object.entries(envVars).forEach(([key, value]) => {
  if (value) {
    if (key === 'DB_PASSWORD') {
      console.log(`${key}: ${value.substring(0, 3)}*** (${value.length} chars)`);
    } else {
      console.log(`${key}: ${value}`);
    }
  } else {
    console.log(`${key}: ❌ NOT SET`);
  }
});

// ============================================
// 6. TEST POSTGRESQL CONNECTION
// ============================================
console.log('\n🗄️  6. Testing PostgreSQL Connection:');
console.log('-'.repeat(60));

const { Client } = require('pg');

const testConnection = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'school_dashboard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  console.log('Attempting connection with:');
  console.log('  Host:', client.host);
  console.log('  Port:', client.port);
  console.log('  Database:', client.database);
  console.log('  User:', client.user);
  console.log('  Password:', client.password ? `${client.password.substring(0, 3)}*** (${client.password.length} chars)` : '❌ EMPTY');
  console.log('');

  try {
    await client.connect();
    console.log('✅ PostgreSQL connection SUCCESSFUL!');

    const res = await client.query('SELECT version()');
    console.log('PostgreSQL version:', res.rows[0].version.split(' ')[0], res.rows[0].version.split(' ')[1]);

    await client.end();
  } catch (error) {
    console.log('❌ PostgreSQL connection FAILED!');
    console.log('Error:', error.message);
    console.log('');
    console.log('💡 Possible issues:');
    console.log('  1. Password is incorrect');
    console.log('  2. PostgreSQL is not running');
    console.log('  3. Database does not exist');
    console.log('  4. User does not have permissions');
  }
};

// ============================================
// 7. CHECK SEQUELIZE CONFIG
// ============================================
console.log('\n⚙️  7. Checking Sequelize Configuration:');
console.log('-'.repeat(60));

if (fs.existsSync('config/database.js')) {
  console.log('✅ config/database.js exists');

  try {
    // Clear cache
    delete require.cache[require.resolve('./config/database')];

    const dbConfig = require('./config/database');
    console.log('Config loaded successfully');
    console.log('Current config:', JSON.stringify(dbConfig.config || dbConfig, null, 2));
  } catch (error) {
    console.log('❌ Error loading config/database.js:');
    console.log(error.message);
  }
} else {
  console.log('❌ config/database.js NOT FOUND');
}

// ============================================
// 8. CHECK JEST SETUP
// ============================================
console.log('\n🧪 8. Checking Jest Setup:');
console.log('-'.repeat(60));

if (fs.existsSync('jest.setup.js')) {
  console.log('✅ jest.setup.js exists');
} else {
  console.log('❌ jest.setup.js NOT FOUND');
  console.log('   This is needed for Jest to load env vars!');
}

if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  if (pkg.jest) {
    console.log('✅ Jest config found in package.json');

    if (pkg.jest.setupFiles) {
      console.log('✅ setupFiles:', pkg.jest.setupFiles);
    } else {
      console.log('❌ setupFiles NOT configured!');
      console.log('   Add: "setupFiles": ["<rootDir>/jest.setup.js"]');
    }

    if (pkg.jest.setupFilesAfterEnv) {
      console.log('✅ setupFilesAfterEnv:', pkg.jest.setupFilesAfterEnv);
    }
  } else {
    console.log('❌ No Jest config in package.json');
  }
}

// ============================================
// 9. RECOMMENDATIONS
// ============================================
console.log('\n💡 9. Recommendations:');
console.log('-'.repeat(60));

const issues = [];

if (!fs.existsSync('.env') && !fs.existsSync('.env.test')) {
  issues.push('Create .env or .env.test file with DB_PASSWORD');
}

if (!process.env.DB_PASSWORD) {
  issues.push('DB_PASSWORD not loaded - check your .env file');
}

if (!fs.existsSync('jest.setup.js')) {
  issues.push('Create jest.setup.js to load env vars');
}

const pkg = fs.existsSync('package.json') ? JSON.parse(fs.readFileSync('package.json', 'utf8')) : {};
if (!pkg.jest?.setupFiles) {
  issues.push('Add setupFiles to package.json jest config');
}

if (issues.length === 0) {
  console.log('✅ No obvious issues found!');
  console.log('   Try running: npm test');
} else {
  console.log('Found', issues.length, 'issue(s):');
  issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`);
  });
}

// ============================================
// RUN TEST CONNECTION
// ============================================
console.log(`\n${'='.repeat(60)}`);
console.log('🔌 TESTING CONNECTION NOW...');
console.log(`${'='.repeat(60)}\n`);

testConnection().then(() => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ DEBUG COMPLETE!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Fix any issues listed above');
  console.log('2. Run: npm test');
  console.log('3. If still failing, send this output for help\n');
}).catch((err) => {
  console.error('\n❌ Error running test connection:', err.message);
  process.exit(1);
});
