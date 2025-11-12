/**
 * Demo Data Seeder
 * =================
 * Creates sample data for testing
 *
 * Run with: node backend/seeders/demo-data.js
 */

const { sequelize, User, Student, Teacher, Course, Grade, Attendance, Class } = require('../models');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // ============================================
    // 1. CREATE DEMO USERS & STUDENTS
    // ============================================
    console.log('\n📚 Creating students...');

    const students = [];
    const studentData = [
      { email: 'student1@school.edu.vn', firstName: 'Nguyễn', lastName: 'Văn An', dateOfBirth: '2005-03-15', gender: 'male', targetGPA: 8.5 },
      { email: 'student2@school.edu.vn', firstName: 'Trần', lastName: 'Thị Bình', dateOfBirth: '2005-07-22', gender: 'female', targetGPA: 9.0 },
      { email: 'student3@school.edu.vn', firstName: 'Lê', lastName: 'Hoàng Cường', dateOfBirth: '2005-11-08', gender: 'male', targetGPA: 7.5 },
      { email: 'student4@school.edu.vn', firstName: 'Phạm', lastName: 'Thu Dung', dateOfBirth: '2005-01-30', gender: 'female', targetGPA: 8.0 },
      { email: 'student5@school.edu.vn', firstName: 'Hoàng', lastName: 'Minh Đức', dateOfBirth: '2005-09-12', gender: 'male', targetGPA: 6.5 },
    ];

    for (const data of studentData) {
      // Create user
      const user = await User.create({
        email: data.email,
        password_hash: 'Password123!', // Will be hashed by hook
        role: 'student',
        is_active: true
      });

      // Create student profile
      const student = await Student.create({
        user_id: user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        phone: '0901234567',
        parent_name: `Phụ huynh ${data.lastName}`,
        parent_phone: '0987654321',
        parent_email: `parent_${data.email}`
      });

      students.push({ student, targetGPA: data.targetGPA });
      console.log(`  ✅ Created: ${student.first_name} ${student.last_name}`);
    }

    // ============================================
    // 2. CREATE DEMO TEACHERS
    // ============================================
    console.log('\n👨‍🏫 Creating teachers...');

    const teachers = [];
    const teacherData = [
      { email: 'teacher1@school.edu.vn', firstName: 'Nguyễn', lastName: 'Thị Hoa', department: 'Toán' },
      { email: 'teacher2@school.edu.vn', firstName: 'Trần', lastName: 'Văn Khoa', department: 'Lý' },
      { email: 'teacher3@school.edu.vn', firstName: 'Lê', lastName: 'Thị Lan', department: 'Hóa' }
    ];

    for (const data of teacherData) {
      const user = await User.create({
        email: data.email,
        password_hash: 'Password123!',
        role: 'teacher',
        is_active: true
      });

      const teacher = await Teacher.create({
        user_id: user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        department: data.department,
        phone: '0911234567',
        hire_date: new Date('2020-09-01')
      });

      teachers.push(teacher);
      console.log(`  ✅ Created: ${teacher.first_name} ${teacher.last_name} (${teacher.department})`);
    }

    // ============================================
    // 3. CREATE DEMO COURSES
    // ============================================
    console.log('\n📖 Creating courses...');

    const courses = [];
    const courseData = [
      { name: 'Toán học 10', code: 'MATH10', description: 'Đại số và Hình học', credits: 4, teacher_id: teachers[0].id },
      { name: 'Vật lý 10', code: 'PHY10', description: 'Cơ học và Nhiệt học', credits: 3, teacher_id: teachers[1].id },
      { name: 'Hóa học 10', code: 'CHEM10', description: 'Hóa học cơ bản', credits: 3, teacher_id: teachers[2].id },
      { name: 'Văn học 10', code: 'LIT10', description: 'Ngữ văn Việt Nam', credits: 4, teacher_id: teachers[0].id },
      { name: 'Tiếng Anh 10', code: 'ENG10', description: 'English Communication', credits: 3, teacher_id: teachers[1].id }
    ];

    for (const data of courseData) {
      const course = await Course.create(data);
      courses.push(course);
      console.log(`  ✅ Created: ${course.name} (${course.code})`);
    }

    // ============================================
    // 4. CREATE DEMO GRADES (Realistic distribution)
    // ============================================
    console.log('\n📝 Creating grades...');

    let gradeCount = 0;
    for (const { student, targetGPA } of students) {
      for (const course of courses) {
        // Generate realistic grades around target GPA with some variance
        const variance = Math.random() * 2 - 1; // -1 to +1
        const baseScore = targetGPA + variance;
        const score = Math.max(0, Math.min(100, baseScore * 10)); // 0-100 scale

        await Grade.create({
          student_id: student.id,
          course_id: course.id,
          score: score.toFixed(1),
          grade_type: 'midterm',
          semester: 'HK1',
          academic_year: '2024-2025'
        });

        // Add final exam grade too
        const finalVariance = Math.random() * 2 - 1;
        const finalScore = Math.max(0, Math.min(100, (targetGPA + finalVariance) * 10));

        await Grade.create({
          student_id: student.id,
          course_id: course.id,
          score: finalScore.toFixed(1),
          grade_type: 'final',
          semester: 'HK1',
          academic_year: '2024-2025'
        });

        gradeCount += 2;
      }

      const avgGPA = targetGPA.toFixed(1);
      console.log(`  ✅ Created grades for ${student.first_name} ${student.last_name} (Avg: ${avgGPA})`);
    }

    console.log(`  📊 Total grades created: ${gradeCount}`);

    // ============================================
    // 5. CREATE DEMO ATTENDANCE
    // ============================================
    console.log('\n✅ Creating attendance records...');

    let attendanceCount = 0;
    const statuses = ['present', 'absent', 'late'];
    const weights = [0.85, 0.05, 0.10]; // 85% present, 5% absent, 10% late

    // Create attendance for last 30 days
    const today = new Date();
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (const { student } of students) {
        for (const course of courses) {
          // Weighted random status
          const random = Math.random();
          let status;
          if (random < weights[0]) status = 'present';
          else if (random < weights[0] + weights[1]) status = 'absent';
          else status = 'late';

          await Attendance.create({
            student_id: student.id,
            course_id: course.id,
            date: date,
            status: status,
            notes: status === 'absent' ? 'Không phép' : null
          });

          attendanceCount++;
        }
      }
    }

    console.log(`  ✅ Total attendance records created: ${attendanceCount}`);

    // ============================================
    // 6. CREATE DEMO CLASS
    // ============================================
    console.log('\n🏫 Creating demo class...');

    const demoClass = await Class.create({
      name: 'Lớp 10A1',
      grade_level: 10,
      teacher_id: teachers[0].id,
      academic_year: '2024-2025',
      room_number: 'A101'
    });

    console.log(`  ✅ Created: ${demoClass.name}`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Teachers: ${teachers.length}`);
    console.log(`   - Courses: ${courses.length}`);
    console.log(`   - Grades: ${gradeCount}`);
    console.log(`   - Attendance: ${attendanceCount}`);
    console.log(`   - Classes: 1`);
    console.log('\n📝 Demo accounts:');
    console.log('   Student: student1@school.edu.vn / Password123!');
    console.log('   Teacher: teacher1@school.edu.vn / Password123!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run seeder
seed();
