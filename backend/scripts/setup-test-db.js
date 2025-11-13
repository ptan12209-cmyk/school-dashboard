/**
 * Setup Test Database Script
 * ===========================
 * Creates test database and initializes all tables
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Test database configuration
const TEST_DB_NAME = 'school_dashboard_test';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'hotanphat';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;

async function setupTestDatabase() {
  console.log('🔧 Setting up test database...\n');

  // Step 1: Connect to postgres database to create test database
  const sequelizeAdmin = new Sequelize('postgres', DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false,
  });

  try {
    await sequelizeAdmin.authenticate();
    console.log('✅ Connected to PostgreSQL server');

    // Step 2: Drop existing test database if it exists
    console.log(`🗑️  Dropping existing database '${TEST_DB_NAME}' if exists...`);
    await sequelizeAdmin.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    console.log('✅ Dropped existing database');

    // Step 3: Create fresh test database
    console.log(`🆕 Creating database '${TEST_DB_NAME}'...`);
    await sequelizeAdmin.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    console.log('✅ Created test database');

    await sequelizeAdmin.close();

    // Step 4: Connect to test database and sync models
    process.env.NODE_ENV = 'test';
    const { sequelize } = require('../config/database');

    console.log('\n📊 Syncing database models...');
    await sequelize.sync({ force: true });
    console.log('✅ All tables created successfully');

    // Step 5: Verify tables were created
    const [results] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📋 Created tables:');
    results.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });

    await sequelize.close();

    console.log('\n✅ Test database setup completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error setting up test database:', error.message);
    process.exit(1);
  }
}

// Run setup
setupTestDatabase();
