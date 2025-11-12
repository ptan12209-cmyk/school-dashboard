const { sequelize } = require('./config/database');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    const result = await sequelize.query('SELECT COUNT(*) FROM users');
    console.log('✅ Found', result[0][0].count, 'users in database');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

testConnection();
