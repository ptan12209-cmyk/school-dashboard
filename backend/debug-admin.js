const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/database');
const { User } = require('./models');

async function debugAdmin() {
  try {
    // ✅ Use findByEmail which includes password_hash
    const admin = await User.findByEmail('admin@school.edu.vn');

    if (!admin) {
      console.log('❌ Admin not found!');
      console.log('💡 Create new admin using register API\n');
      return;
    }

    console.log('✅ Admin found:');
    console.log('   Email:', `"${admin.email}"`);
    console.log('   Email length:', admin.email.length);
    console.log('   Has password hash:', !!admin.password_hash);
    console.log('');

    // Test password
    const testPassword = 'Admin@123';
    console.log('🔐 Testing password:', testPassword);

    const isValid = await bcrypt.compare(testPassword, admin.password_hash);

    console.log('   Result:', isValid ? '✅ CORRECT' : '❌ WRONG');
    console.log('');

    if (!isValid) {
      console.log('💡 Password is wrong. Resetting now...');
      const newHash = await bcrypt.hash(testPassword, 10);

      await sequelize.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        {
          bind: [newHash, 'admin@school.edu.vn'],
        },
      );

      console.log('✅ Password reset to: Admin@123');
      console.log('🔐 Try login now!\n');
    } else {
      console.log('✅ Password is correct!');
      console.log('🔐 Login should work with: Admin@123\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

debugAdmin();
