/**
 * Test Database Connection
 * =========================
 * Script để test kết nối PostgreSQL
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log('🔍 Testing PostgreSQL Connection...\n');

console.log('📋 Current Configuration:');
console.log(`   Host:     ${process.env.DB_HOST || 'localhost'}`);
console.log(`   Port:     ${process.env.DB_PORT || '5432'}`);
console.log(`   Database: ${process.env.DB_NAME || 'school_dashboard'}`);
console.log(`   User:     ${process.env.DB_USER || 'postgres'}`);
console.log(`   Password: ${process.env.DB_PASSWORD ? `***${process.env.DB_PASSWORD.slice(-3)}` : 'NOT SET'}\n`);

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'school_dashboard',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: false,
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection successful!');
    console.log('✅ Database is ready to use.\n');

    // Test query
    const [results] = await sequelize.query('SELECT version();');
    console.log('📊 PostgreSQL Version:');
    console.log(`   ${results[0].version}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ PostgreSQL connection failed!');
    console.error(`   Error: ${error.message}\n`);

    console.log('🔧 Troubleshooting Steps:\n');

    if (error.message.includes('password authentication failed')) {
      console.log('1️⃣ PASSWORD AUTHENTICATION FAILED');
      console.log('   → Check your PostgreSQL password\n');
      console.log('   📝 To find/reset password on Windows:');
      console.log('   1. Open pgAdmin');
      console.log('   2. Right-click on PostgreSQL server → Properties');
      console.log('   3. Use the password you set during installation\n');
      console.log('   📝 To reset password:');
      console.log('   1. Open Command Prompt as Administrator');
      console.log('   2. Run: psql -U postgres');
      console.log('   3. Run: ALTER USER postgres PASSWORD \'your_new_password\';');
      console.log('   4. Update backend/.env with new password\n');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('2️⃣ CONNECTION REFUSED');
      console.log('   → PostgreSQL is not running\n');
      console.log('   📝 To start PostgreSQL on Windows:');
      console.log('   1. Press Win + R');
      console.log('   2. Type: services.msc');
      console.log('   3. Find "postgresql-x64-15" (or similar)');
      console.log('   4. Right-click → Start\n');
    } else if (error.message.includes('does not exist')) {
      console.log('3️⃣ DATABASE DOES NOT EXIST');
      console.log('   → Create the database first\n');
      console.log('   📝 To create database:');
      console.log('   1. Open pgAdmin or Command Prompt');
      console.log('   2. Run: createdb -U postgres school_dashboard');
      console.log('   OR in psql:');
      console.log('   3. CREATE DATABASE school_dashboard;\n');
    }

    console.log('📖 For more help, see: backend/seeders/README.md\n');

    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

testConnection();
