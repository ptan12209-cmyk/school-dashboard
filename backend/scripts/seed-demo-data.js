/**
 * Demo Data Seeder for School Dashboard
 * ======================================
 * Creates realistic Vietnamese school data for presentation
 *
 * Creates:
 * - 1 Admin user
 * - 10 Teachers (various subjects)
 * - 50 Students (3 classes)
 * - 3 Classes (10A1, 10A2, 10A3)
 * - Courses for each class
 * - Realistic grades (with patterns for AI)
 * - Attendance records
 * - Assignments and submissions
 * - Notifications
 *
 * Usage: node scripts/seed-demo-data.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize, User, Teacher, Student, Class, Course, Grade, Attendance, Assignment, Submission, Notification } = require('../models');
const bcrypt = require('bcrypt');

// Vietnamese names
const firstNames = {
  male: ['Minh', 'Tuấn', 'Hùng', 'Dũng', 'Khoa', 'Phúc', 'Hoàng', 'Long', 'Nam', 'Thành', 'Quân', 'Đạt', 'Hải', 'Tú', 'Việt'],
  female: ['Hương', 'Linh', 'Anh', 'Nhung', 'Mai', 'Lan', 'Hà', 'Thu', 'Trang', 'Huyền', 'Ngọc', 'Thảo', 'My', 'Chi', 'Vy']
};

const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];

const subjects = [
  { name: 'Toán', code: 'MATH', department: 'Toán - Tin' },
  { name: 'Văn', code: 'LIT', department: 'Ngữ Văn' },
  { name: 'Tiếng Anh', code: 'ENG', department: 'Ngoại Ngữ' },
  { name: 'Vật Lý', code: 'PHY', department: 'Khoa Học Tự Nhiên' },
  { name: 'Hóa Học', code: 'CHEM', department: 'Khoa Học Tự Nhiên' },
  { name: 'Sinh Học', code: 'BIO', department: 'Khoa Học Tự Nhiên' },
  { name: 'Lịch Sử', code: 'HIST', department: 'Khoa Học Xã Hội' },
  { name: 'Địa Lý', code: 'GEO', department: 'Khoa Học Xã Hội' },
  { name: 'Tin Học', code: 'IT', department: 'Toán - Tin' },
  { name: 'Thể Dục', code: 'PE', department: 'Thể Chất' }
];

// Helper functions
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName(gender = null) {
  const g = gender || (Math.random() > 0.5 ? 'M' : 'F');
  const firstName = randomElement(firstNames[g === 'M' ? 'male' : 'female']);
  const lastName = randomElement(lastNames);
  return { firstName, lastName, gender: g };
}

function generateEmail(firstName, lastName, role, uniqueId = null) {
  const normalized = `${firstName}${lastName}`.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
  const suffix = uniqueId !== null ? uniqueId.toString().padStart(3, '0') : '';
  return `${normalized}${suffix}.${role}@school.edu.vn`;
}

function generatePhone() {
  return `09${randomInt(10000000, 99999999)}`;
}

function generateDateOfBirth(yearDiff) {
  const year = 2025 - yearDiff;
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return new Date(year, month - 1, day);
}

function generateGrade(studentType, subject) {
  // Student types: 'excellent', 'good', 'average', 'struggling'
  let base, variance;

  switch(studentType) {
    case 'excellent':
      base = 9;
      variance = 1;
      break;
    case 'good':
      base = 7.5;
      variance = 1;
      break;
    case 'average':
      base = 6;
      variance = 1.5;
      break;
    case 'struggling':
      base = 5;
      variance = 1.5;
      break;
    default:
      base = 7;
      variance = 2;
  }

  let score = base + (Math.random() * variance * 2 - variance);
  score = Math.max(0, Math.min(10, score));
  return Math.round(score * 10) / 10;
}

/**
 * Main seeding function
 */
async function seedDemoData() {
  console.log('\n🌱 Starting demo data seeding...\n');

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Clear existing data using TRUNCATE CASCADE (more forceful)
    console.log('🗑️  Clearing existing data...');
    await sequelize.query('SET session_replication_role = replica;');
    await sequelize.query('TRUNCATE TABLE notifications CASCADE;');
    await sequelize.query('TRUNCATE TABLE submissions CASCADE;');
    await sequelize.query('TRUNCATE TABLE assignments CASCADE;');
    await sequelize.query('TRUNCATE TABLE attendance CASCADE;');
    await sequelize.query('TRUNCATE TABLE grades CASCADE;');
    await sequelize.query('TRUNCATE TABLE courses CASCADE;');
    await sequelize.query('TRUNCATE TABLE classes CASCADE;');
    await sequelize.query('TRUNCATE TABLE students CASCADE;');
    await sequelize.query('TRUNCATE TABLE teachers CASCADE;');
    await sequelize.query('TRUNCATE TABLE users CASCADE;');
    await sequelize.query('SET session_replication_role = DEFAULT;');
    console.log('✅ Existing data cleared\n');

    // 1. Create Admin User
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const adminUser = await User.create({
      email: 'admin@school.edu.vn',
      password_hash: adminPassword,
      role: 'admin',
      is_active: true
    });
    console.log(`✅ Admin created: admin@school.edu.vn / Admin@123\n`);

    // 2. Create Teachers
    console.log('👨‍🏫 Creating teachers...');
    const teachers = [];
    const teacherData = [];

    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      const { firstName, lastName, gender } = generateName();
      const email = generateEmail(firstName, lastName, 'teacher');
      const password = await bcrypt.hash('Teacher@123', 10);

      const user = await User.create({
        email,
        password_hash: password,
        role: 'teacher',
        is_active: true
      });

      const teacher = await Teacher.create({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        department: subject.department,
        phone: generatePhone(),
        hire_date: new Date(2020, randomInt(0, 11), randomInt(1, 28))
      });

      teachers.push({ ...teacher.toJSON(), subject: subject.name, subjectCode: subject.code });
      teacherData.push({ firstName, lastName, email, subject: subject.name });
    }

    console.log(`✅ Created ${teachers.length} teachers`);
    teacherData.forEach(t => console.log(`   - ${t.lastName} ${t.firstName} (${t.subject}): ${t.email}`));
    console.log('');

    // 3. Create Classes
    console.log('🏫 Creating classes...');
    const classes = [];
    const classNames = ['10A1', '10A2', '10A3', '10A4', '10A5']; // 5 classes for 100+ students

    for (let i = 0; i < classNames.length; i++) {
      const homeRoomTeacher = teachers[i % teachers.length];
      const cls = await Class.create({
        name: classNames[i],
        grade_level: 10,
        school_year: '2024-2025',
        teacher_id: homeRoomTeacher.id,
        room_number: `${i + 1}01`,
        max_students: 40
      });
      classes.push(cls);
    }

    console.log(`✅ Created ${classes.length} classes: ${classNames.join(', ')}\n`);

    // 4. Create Students
    console.log('👨‍🎓 Creating students...');
    const students = [];
    const studentTypes = ['excellent', 'good', 'average', 'struggling'];
    const studentsPerClass = 20; // 100 students total (20 × 5 = 100)
    let studentGlobalId = 1; // Global counter for unique emails

    for (let classIdx = 0; classIdx < classes.length; classIdx++) {
      const cls = classes[classIdx];

      for (let i = 0; i < studentsPerClass; i++) {
        const { firstName, lastName, gender } = generateName();
        const email = generateEmail(firstName, lastName, 'student', studentGlobalId);
        const password = await bcrypt.hash('Student@123', 10);
        studentGlobalId++; // Increment for next student

        // Determine student type (for grade generation)
        let studentType;
        if (i < 3) studentType = 'excellent'; // Top 3 students (15%)
        else if (i < 8) studentType = 'good'; // Next 5 students (25%)
        else if (i < 15) studentType = 'average'; // Next 7 students (35%)
        else studentType = 'struggling'; // Last 5 students (25%)

        const user = await User.create({
          email,
          password_hash: password,
          role: 'student',
          is_active: true
        });

        const parentName = generateName();
        const student = await Student.create({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: generateDateOfBirth(16), // ~16 years old
          gender,
          phone: generatePhone(),
          parent_name: `${parentName.lastName} ${parentName.firstName}`,
          parent_phone: generatePhone(),
          parent_email: `${parentName.firstName.toLowerCase()}.parent@gmail.com`,
          class_id: cls.id
        });

        students.push({ ...student.toJSON(), email, studentType, className: cls.name });
      }
    }

    console.log(`✅ Created ${students.length} students across ${classes.length} classes\n`);

    // 5. Create Courses
    console.log('📚 Creating courses...');
    const courses = [];

    for (const cls of classes) {
      for (const teacher of teachers) {
        const course = await Course.create({
          name: teacher.subject,
          code: `${teacher.subjectCode}-${cls.name}`,
          description: `${teacher.subject} cho lớp ${cls.name}`,
          subject: teacher.subject,
          credits: 3,
          teacher_id: teacher.id,
          class_id: cls.id,
          semester: '1',
          school_year: '2024-2025',
          start_date: new Date(2024, 8, 5), // Sept 5, 2024
          end_date: new Date(2025, 0, 15), // Jan 15, 2025
          schedule: `${['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'][randomInt(0, 4)]}, Tiết ${randomInt(1, 5)}`
        });
        courses.push(course);
      }
    }

    console.log(`✅ Created ${courses.length} courses\n`);

    // 6. Create Grades
    console.log('📊 Creating grades...');
    const gradeTypes = ['Quiz', 'Test', 'Assignment', 'Project', 'Midterm', 'Final'];
    let gradeCount = 0;

    for (const student of students) {
      const studentCourses = courses.filter(c => {
        const studentClass = classes.find(cls => cls.id === student.class_id);
        return c.class_id === studentClass.id;
      });

      for (const course of studentCourses) {
        // Create grades for all 3 semesters
        // 100 students × 10 courses × 6 grade types × 3 semesters = 18,000 grades total

        const semesters = ['1', '2', 'Final']; // All 3 valid semester values

        for (const semester of semesters) {
          // For each semester, create one grade of each type
          for (const gradeType of gradeTypes) {
            const score = generateGrade(student.studentType, course.subject);

            await Grade.create({
              student_id: student.id,
              course_id: course.id,
              score,
              grade_type: gradeType,
              weight: gradeType === 'Final' ? 3 : gradeType === 'Midterm' ? 2 : 1,
              semester: semester,
              graded_date: new Date(2024, semester === '1' ? 8 : 11, randomInt(1, 28)),
              is_published: true,
              comments: score >= 8 ? 'Tốt' : score >= 6.5 ? 'Khá' : score >= 5 ? 'Trung bình' : 'Cần cố gắng'
            });
            gradeCount++;
          }
        }
      }
    }

    console.log(`✅ Created ${gradeCount} grade records\n`);

    // 7. Create Attendance
    console.log('📅 Creating attendance records...');
    const attendanceStatuses = ['Present', 'Absent', 'Late', 'Excused'];
    let attendanceCount = 0;

    // Generate attendance for last 30 days
    const today = new Date();
    for (let day = 0; day < 30; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (const student of students) {
        const studentCourses = courses.filter(c => {
          const studentClass = classes.find(cls => cls.id === student.class_id);
          return c.class_id === studentClass.id;
        });

        // Random 2 courses per day
        const dailyCourses = [studentCourses[0], studentCourses[randomInt(1, studentCourses.length - 1)]];

        for (const course of dailyCourses) {
          let status;
          // Good students rarely absent
          if (student.studentType === 'excellent') {
            status = Math.random() > 0.95 ? 'Late' : 'Present';
          } else if (student.studentType === 'good') {
            status = Math.random() > 0.9 ? randomElement(['Late', 'Absent']) : 'Present';
          } else if (student.studentType === 'struggling') {
            const rand = Math.random();
            if (rand > 0.85) status = 'Absent';
            else if (rand > 0.75) status = 'Late';
            else status = 'Present';
          } else {
            status = Math.random() > 0.9 ? randomElement(attendanceStatuses) : 'Present';
          }

          await Attendance.create({
            student_id: student.id,
            course_id: course.id,
            date,
            status,
            notes: status === 'Absent' ? 'Vắng không phép' : status === 'Excused' ? 'Có phép' : null
          });
          attendanceCount++;
        }
      }
    }

    console.log(`✅ Created ${attendanceCount} attendance records\n`);

    // 8. Create Assignments
    console.log('📝 Creating assignments...');
    const assignments = [];

    for (const course of courses) {
      const numAssignments = randomInt(3, 5);
      for (let i = 0; i < numAssignments; i++) {
        const dueDate = new Date(2024, 9 + i, randomInt(5, 25));
        const assignment = await Assignment.create({
          course_id: course.id,
          teacher_id: course.teacher_id,
          title: `Bài tập ${i + 1}: ${course.subject}`,
          description: `Hoàn thành bài tập chương ${i + 1}`,
          type: randomElement(['homework', 'quiz', 'exam', 'practice']),
          max_score: 10,
          due_date: dueDate,
          status: dueDate < new Date() ? 'closed' : 'published'
        });
        assignments.push(assignment);
      }
    }

    console.log(`✅ Created ${assignments.length} assignments\n`);

    // 9. Create Submissions
    console.log('📤 Creating submissions...');
    let submissionCount = 0;

    for (const assignment of assignments) {
      const course = courses.find(c => c.id === assignment.course_id);
      const courseStudents = students.filter(s => {
        const studentClass = classes.find(cls => cls.id === s.class_id);
        return course.class_id === studentClass.id;
      });

      // 70-90% submission rate
      const submissionRate = 0.7 + Math.random() * 0.2;
      const numSubmissions = Math.floor(courseStudents.length * submissionRate);

      for (let i = 0; i < numSubmissions; i++) {
        const student = courseStudents[i];
        const submittedOn = new Date(assignment.due_date);
        submittedOn.setDate(submittedOn.getDate() - randomInt(0, 3)); // Submit 0-3 days before due

        const score = generateGrade(student.studentType, course.subject);

        await Submission.create({
          student_id: student.id,
          assignment_id: assignment.id,
          submitted_at: submittedOn,
          status: 'graded',
          score,
          max_score: assignment.max_score || 10,
          feedback: score >= 8 ? 'Làm tốt!' : score >= 6.5 ? 'Khá tốt' : 'Cần cải thiện'
        });
        submissionCount++;
      }
    }

    console.log(`✅ Created ${submissionCount} submissions\n`);

    // 10. Create Notifications
    console.log('🔔 Creating notifications...');
    const notificationTypes = ['grade_posted', 'assignment_due', 'attendance_marked', 'announcement'];
    let notificationCount = 0;

    // Create notifications for each student
    for (const student of students) {
      const numNotifications = randomInt(3, 7);
      for (let i = 0; i < numNotifications; i++) {
        const type = randomElement(notificationTypes);
        let message;

        switch(type) {
          case 'Grade':
            message = 'Giáo viên đã nhập điểm mới';
            break;
          case 'Assignment':
            message = 'Bài tập mới được giao';
            break;
          case 'Attendance':
            message = 'Điểm danh hôm nay';
            break;
          default:
            message = 'Thông báo từ nhà trường';
        }

        const user = await User.findByPk(student.user_id);
        await Notification.create({
          user_id: user.id,
          type,
          title: message,
          message: `Chi tiết thông báo về ${type.toLowerCase()}`,
          priority: randomElement(['low', 'medium', 'high']),
          is_read: Math.random() > 0.3 // 70% đã đọc
        });
        notificationCount++;
      }
    }

    console.log(`✅ Created ${notificationCount} notifications\n`);

    // Summary
    console.log('╔════════════════════════════════════════╗');
    console.log('║       DEMO DATA SEEDING COMPLETE       ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('📊 Summary:');
    console.log(`   - Admin Users: 1`);
    console.log(`   - Teachers: ${teachers.length}`);
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Classes: ${classes.length}`);
    console.log(`   - Courses: ${courses.length}`);
    console.log(`   - Grades: ${gradeCount}`);
    console.log(`   - Attendance: ${attendanceCount}`);
    console.log(`   - Assignments: ${assignments.length}`);
    console.log(`   - Submissions: ${submissionCount}`);
    console.log(`   - Notifications: ${notificationCount}\n`);

    console.log('🔑 Login Credentials:');
    console.log('   Admin:');
    console.log('     Email: admin@school.edu.vn');
    console.log('     Password: Admin@123\n');
    console.log('   Teachers:');
    console.log('     Email: [firstname][lastname].teacher@school.edu.vn');
    console.log('     Password: Teacher@123\n');
    console.log('   Students:');
    console.log('     Email: [firstname][lastname].student@school.edu.vn');
    console.log('     Password: Student@123\n');

    console.log('💡 Sample logins:');
    teacherData.slice(0, 2).forEach(t => {
      console.log(`   Teacher: ${t.email} / Teacher@123`);
    });
    students.slice(0, 2).forEach(s => {
      console.log(`   Student: ${s.email} / Student@123`);
    });
    console.log('');

    console.log('✅ All demo data created successfully!\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoData();
}

module.exports = { seedDemoData };
