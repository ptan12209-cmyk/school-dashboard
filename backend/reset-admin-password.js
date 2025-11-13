/**
 * Reset Admin Password Script
 */

const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/database');
const { User } = require('./models');

async function resetAdminPassword() {
  try {
    const email = 'admin@school.edu.vn';
    const newPassword = 'Admin@123';

    console.log(`🔍 Finding admin: ${email}...\n`);

    const admin = await User.findOne({ where: { email } });

    if (!admin) {
      console.log(`❌ Admin not found: ${email}\n`);
      console.log('💡 Available options:');
      console.log('1. Create new admin via /api/auth/register');
      console.log('2. Check if email is correct\n');
      return;
    }

    console.log(`✅ Found admin: ${email}`);
    console.log(`📝 Resetting password to: ${newPassword}\n`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await admin.update({ password_hash: hashedPassword });

    console.log('✅ Password reset successfully!\n');
    console.log('🔐 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

resetAdminPassword();
