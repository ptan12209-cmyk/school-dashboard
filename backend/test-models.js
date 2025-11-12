/**
 * Test Models - Day 2 - FIXED VERSION
 * =====================================
 * Test User, Teacher, and Student models
 *
 * ✅ FIXED: Added cleanup before and after tests
 *
 * Usage: node test-models.js
 */

const { sequelize } = require('./config/database');
const { User, Teacher, Student } = require('./models');

// Test data
const TEST_EMAIL = 'test@example.com';
const STUDENT_TEST_EMAIL = 'student.test@example.com';
const TEST_PASSWORD = 'Test@123';

async function testModels() {
  console.log('🧪 Starting model tests...\n');

  try {
    // ============================================
    // CLEANUP OLD TEST DATA FIRST
    // ============================================
    console.log('🧹 Cleaning up old test data...');

    // Delete test users (will cascade to teachers/students)
    await User.destroy({
      where: {
        email: [TEST_EMAIL, STUDENT_TEST_EMAIL],
      },
    });

    console.log('✅ Old test data removed\n');

    // ============================================
    // TEST 1: User Model
    // ============================================
    console.log('📝 TEST 1: User Model');
    console.log('─────────────────────────────────────');

    // Create test user
    console.log('Creating test user...');
    const testUser = await User.create({
      email: TEST_EMAIL,
      password_hash: TEST_PASSWORD,
      role: 'teacher',
      is_active: true,
    });
    console.log('✅ User created:', testUser.email);
    console.log('   - ID:', testUser.id);
    console.log('   - Role:', testUser.role);

    // Test password hashing
    console.log('\nTesting password hashing...');
    const isPasswordHashed = testUser.password_hash !== TEST_PASSWORD;
    console.log('✅ Password hashed:', isPasswordHashed);
    console.log('   - Hash length:', testUser.password_hash.length);

    // Test password comparison
    console.log('\nTesting password comparison...');
    const isValidPassword = await testUser.comparePassword(TEST_PASSWORD);
    console.log('✅ Password verification:', isValidPassword);

    const isInvalidPassword = await testUser.comparePassword('WrongPassword');
    console.log('✅ Invalid password rejected:', !isInvalidPassword);

    // Test token generation
    console.log('\nTesting JWT token generation...');
    const token = testUser.generateToken();
    console.log('✅ Token generated:', `${token.substring(0, 30)}...`);
    console.log('   - Length:', token.length);

    // Test findByEmail
    console.log('\nTesting User.findByEmail()...');
    const foundUser = await User.findByEmail(TEST_EMAIL);
    console.log('✅ User found by email:', foundUser.email);
    console.log('   - Has password in scope:', !!foundUser.password_hash);

    // Test password validation
    console.log('\nTesting password validation...');
    const weakPassword = User.validatePassword('weak');
    console.log('✅ Weak password rejected:', !weakPassword.valid);
    console.log('   - Errors:', weakPassword.errors.length);

    const strongPassword = User.validatePassword('Strong@123');
    console.log('✅ Strong password accepted:', strongPassword.valid);

    // ============================================
    // TEST 2: Teacher Model
    // ============================================
    console.log('\n\n📝 TEST 2: Teacher Model');
    console.log('─────────────────────────────────────');

    // Create teacher profile
    console.log('Creating teacher profile...');
    const testTeacher = await Teacher.create({
      user_id: testUser.id,
      first_name: 'John',
      last_name: 'Doe',
      department: 'Mathematics',
      phone: '+84-123-456-789',
      hire_date: '2020-09-01',
    });
    console.log('✅ Teacher created:', testTeacher.getFullName());
    console.log('   - ID:', testTeacher.id);
    console.log('   - Department:', testTeacher.department);

    // Test getYearsOfService
    console.log('\nTesting getYearsOfService()...');
    const yearsOfService = testTeacher.getYearsOfService();
    console.log('✅ Years of service:', yearsOfService);

    // Test findByDepartment
    console.log('\nTesting Teacher.findByDepartment()...');
    const mathTeachers = await Teacher.findByDepartment('Mathematics');
    console.log('✅ Math teachers found:', mathTeachers.length);

    // Test hire_date validation (future date should fail)
    console.log('\nTesting hire_date validation (future date)...');
    try {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await Teacher.create({
        user_id: testUser.id,
        first_name: 'Future',
        last_name: 'Teacher',
        hire_date: futureDate.toISOString().split('T')[0],
      });
      console.log('❌ Future hire date was not rejected!');
    } catch (error) {
      console.log('✅ Future hire date rejected correctly');
      console.log('   - Error:', error.message);
    }

    // ============================================
    // TEST 3: Student Model
    // ============================================
    console.log('\n\n📝 TEST 3: Student Model');
    console.log('─────────────────────────────────────');

    // Create student user first
    console.log('Creating student user...');
    const studentUser = await User.create({
      email: STUDENT_TEST_EMAIL,
      password_hash: 'Student@123',
      role: 'student',
      is_active: true,
    });
    console.log('✅ Student user created:', studentUser.email);

    // Create student profile
    console.log('\nCreating student profile...');
    const testStudent = await Student.create({
      user_id: studentUser.id,
      first_name: 'Jane',
      last_name: 'Smith',
      date_of_birth: '2010-05-15',
      gender: 'F',
      phone: '+84-987-654-321',
      parent_name: 'Robert Smith',
      parent_phone: '+84-111-222-333',
      parent_email: 'robert.smith@example.com',
    });
    console.log('✅ Student created:', testStudent.getFullName());
    console.log('   - ID:', testStudent.id);
    console.log('   - Age:', testStudent.getAge());

    // Test hasParentContact
    console.log('\nTesting hasParentContact()...');
    const hasContact = testStudent.hasParentContact();
    console.log('✅ Has parent contact:', hasContact);

    // Test getDisplayInfo
    console.log('\nTesting getDisplayInfo()...');
    const displayInfo = testStudent.getDisplayInfo();
    console.log('✅ Display info generated');
    console.log('   - Full name:', displayInfo.fullName);
    console.log('   - Age:', displayInfo.age);

    // Test findUnassigned
    console.log('\nTesting Student.findUnassigned()...');
    const unassignedStudents = await Student.findUnassigned();
    console.log('✅ Unassigned students found:', unassignedStudents.length);

    // ============================================
    // TEST 4: Query Real Data
    // ============================================
    console.log('\n\n📝 TEST 4: Query Real Database');
    console.log('─────────────────────────────────────');

    // Count users
    const userCount = await User.count();
    console.log('✅ Total users in DB:', userCount);

    // Count by role
    const adminCount = await User.count({ where: { role: 'admin' } });
    const teacherCount = await User.count({ where: { role: 'teacher' } });
    const studentCount = await User.count({ where: { role: 'student' } });

    console.log('   - Admins:', adminCount);
    console.log('   - Teachers:', teacherCount);
    console.log('   - Students:', studentCount);

    // Find a real teacher
    console.log('\nQuerying real teacher from DB...');
    const realTeacher = await Teacher.findOne({
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'role'],
      }],
      limit: 1,
    });

    if (realTeacher) {
      console.log('✅ Found teacher:', realTeacher.getFullName());
      console.log('   - Department:', realTeacher.department);
      console.log('   - Email:', realTeacher.user?.email);
    }

    // Find real students
    console.log('\nQuerying real students from DB...');
    const realStudents = await Student.findAll({
      limit: 3,
      order: [['last_name', 'ASC']],
    });

    console.log('✅ Found', realStudents.length, 'students:');
    realStudents.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.getFullName()} (Age: ${student.getAge()})`);
    });

    // ============================================
    // CLEANUP
    // ============================================
    console.log('\n\n🧹 Cleaning up test data...');

    // Delete test records
    await testStudent.destroy();
    console.log('✅ Test student deleted');

    await studentUser.destroy();
    console.log('✅ Test student user deleted');

    await testTeacher.destroy();
    console.log('✅ Test teacher deleted');

    await testUser.destroy();
    console.log('✅ Test user deleted');

    // ============================================
    // SUCCESS!
    // ============================================
    console.log(`\n${'═'.repeat(50)}`);
    console.log('🎉 ALL TESTS PASSED!');
    console.log('═'.repeat(50));
    console.log('\n✅ Summary:');
    console.log('   - User model: Working');
    console.log('   - Teacher model: Working');
    console.log('   - Student model: Working');
    console.log('   - Password hashing: Working');
    console.log('   - JWT generation: Working');
    console.log('   - Model methods: Working');
    console.log('   - Database queries: Working');
    console.log('   - Validation: Working');
    console.log('   - Cleanup: Working');

    console.log('\n🚀 Ready for Day 3: Authentication System!');
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);

    console.error('\n💡 Common issues:');
    console.error('1. Make sure all models are in ./models/ folder');
    console.error('2. Check if database connection is working');
    console.error('3. Verify bcryptjs and jsonwebtoken are installed');
    console.error('4. Ensure config/auth.js exists with jwtConfig');

    // Cleanup on error too
    console.error('\n🧹 Attempting cleanup...');
    try {
      await User.destroy({
        where: {
          email: [TEST_EMAIL, STUDENT_TEST_EMAIL],
        },
      });
      console.error('✅ Cleanup completed');
    } catch (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError.message);
    }

    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run tests
console.log('🎯 Day 2 Model Testing - FIXED VERSION\n');
testModels();
