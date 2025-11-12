/**
 * Check Admin Script
 * Kiểm tra admin users trong database
 */

const { sequelize } = require('./config/database');
const { User } = require('./models');

async function checkAdmin() {
  try {
    console.log('🔍 Checking admin users...\n');

    // Find all admin users
    const admins = await User.findAll({
      where: { role: 'admin' },
      attributes: ['id', 'email', 'role', 'is_active', 'created_at'],
    });

    if (admins.length === 0) {
      console.log('❌ No admin users found!\n');
      console.log('💡 Create one using:');
      console.log('   POST /api/auth/register with role: "admin"\n');
    } else {
      console.log(`✅ Found ${admins.length} admin user(s):\n`);

      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Email: ${admin.email}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Active: ${admin.is_active}`);
        console.log(`   Created: ${admin.created_at}`);
        console.log('');
      });

      console.log('💡 To login, use one of these emails with password:\n');
      console.log('   POST /api/auth/login');
      console.log('   { "email": "admin@...", "password": "..." }\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkAdmin();
