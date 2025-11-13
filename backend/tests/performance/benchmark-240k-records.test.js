/**
 * Performance Benchmark Test - 240K Records
 * ==========================================
 * Tests query performance with large datasets
 *
 * REQUIREMENT: Query 240K records in < 3 seconds
 *
 * Test Setup:
 * - 1000 students
 * - 50 teachers
 * - 100 courses
 * - 240,000 grades (240K records)
 * - 120,000 attendance records
 */

const { sequelize, User, Student, Teacher, Course, Grade, Attendance, Class } = require('../../models');

// Test configuration
const CONFIG = {
  STUDENTS: 1000,
  TEACHERS: 50,
  CLASSES: 40,
  COURSES: 100,
  GRADES: 240000,  // 240K records requirement
  ATTENDANCE: 120000,

  // Performance thresholds
  THRESHOLDS: {
    QUERY_TIME_MS: 3000,  // < 3 seconds requirement
    INSERT_BATCH_SIZE: 1000
  }
};

describe('🚀 Performance Benchmark - 240K Records', () => {
  let testDataIds = {
    students: [],
    teachers: [],
    classes: [],
    courses: []
  };

  beforeAll(async () => {
    console.log('\n🔧 Setting up performance test database...');
    console.log(`📊 Will create ${CONFIG.GRADES.toLocaleString()} grade records\n`);

    // Set longer timeout for setup
    jest.setTimeout(600000); // 10 minutes

    try {
      // Clear existing data
      await sequelize.query('TRUNCATE TABLE attendance, grades, courses, classes, students, teachers, users CASCADE');

      await generateTestData();

      console.log('\n✅ Test data generation completed!');
      console.log(`   Students: ${testDataIds.students.length.toLocaleString()}`);
      console.log(`   Teachers: ${testDataIds.teachers.length.toLocaleString()}`);
      console.log(`   Classes: ${testDataIds.classes.length.toLocaleString()}`);
      console.log(`   Courses: ${testDataIds.courses.length.toLocaleString()}`);
      console.log(`   Grades: ${CONFIG.GRADES.toLocaleString()}`);
      console.log(`   Attendance: ${CONFIG.ATTENDANCE.toLocaleString()}\n`);

    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }, 600000);

  afterAll(async () => {
    console.log('\n🧹 Cleaning up test data...');
    await sequelize.query('TRUNCATE TABLE attendance, grades, courses, classes, students, teachers, users CASCADE');
    console.log('✅ Cleanup completed\n');
  });

  describe('Grade Query Performance', () => {
    test('📊 Query all grades with pagination (< 3s)', async () => {
      const startTime = Date.now();

      const result = await Grade.findAndCountAll({
        limit: 100,
        offset: 0,
        order: [['created_at', 'DESC']]
      });

      const queryTime = Date.now() - startTime;

      console.log(`   Query time: ${queryTime}ms`);
      console.log(`   Records found: ${result.count.toLocaleString()}`);
      console.log(`   Status: ${queryTime < CONFIG.THRESHOLDS.QUERY_TIME_MS ? '✅ PASS' : '❌ FAIL'}`);

      expect(result.count).toBe(CONFIG.GRADES);
      expect(queryTime).toBeLessThan(CONFIG.THRESHOLDS.QUERY_TIME_MS); // < 3 seconds
    });

    test('📊 Query grades by student with joins (< 3s)', async () => {
      const studentId = testDataIds.students[0];
      const startTime = Date.now();

      const result = await Grade.findAll({
        where: { student_id: studentId },
        include: [
          { model: Course, as: 'course' },
          { model: Student, as: 'student' }
        ],
        limit: 100,
        order: [['created_at', 'DESC']]
      });

      const queryTime = Date.now() - startTime;

      console.log(`   Query time: ${queryTime}ms`);
      console.log(`   Records found: ${result.length}`);
      console.log(`   Status: ${queryTime < CONFIG.THRESHOLDS.QUERY_TIME_MS ? '✅ PASS' : '❌ FAIL'}`);

      expect(queryTime).toBeLessThan(CONFIG.THRESHOLDS.QUERY_TIME_MS);
    });

    test('📊 Query grades with filtering and aggregation (< 3s)', async () => {
      const startTime = Date.now();

      const [results] = await sequelize.query(`
        SELECT
          student_id,
          AVG(score) as avg_score,
          COUNT(*) as total_grades,
          MAX(score) as max_score,
          MIN(score) as min_score
        FROM grades
        WHERE score >= 5.0
        GROUP BY student_id
        ORDER BY avg_score DESC
        LIMIT 100
      `);

      const queryTime = Date.now() - startTime;

      console.log(`   Query time: ${queryTime}ms`);
      console.log(`   Students analyzed: ${results.length}`);
      console.log(`   Status: ${queryTime < CONFIG.THRESHOLDS.QUERY_TIME_MS ? '✅ PASS' : '❌ FAIL'}`);

      expect(queryTime).toBeLessThan(CONFIG.THRESHOLDS.QUERY_TIME_MS);
    });

    test('📊 Full-text search across grades (< 3s)', async () => {
      const startTime = Date.now();

      const result = await Grade.findAll({
        where: {
          grade_type: 'Test'
        },
        include: [
          {
            model: Course,
            as: 'course',
            where: { subject: 'Mathematics' }
          }
        ],
        limit: 100
      });

      const queryTime = Date.now() - startTime;

      console.log(`   Query time: ${queryTime}ms`);
      console.log(`   Records found: ${result.length}`);
      console.log(`   Status: ${queryTime < CONFIG.THRESHOLDS.QUERY_TIME_MS ? '✅ PASS' : '❌ FAIL'}`);

      expect(queryTime).toBeLessThan(CONFIG.THRESHOLDS.QUERY_TIME_MS);
    });
  });

  describe('Dashboard Query Performance', () => {
    test('📊 Dashboard stats aggregation (< 3s)', async () => {
      const startTime = Date.now();

      const [stats] = await sequelize.query(`
        SELECT
          COUNT(DISTINCT student_id) as total_students,
          COUNT(*) as total_grades,
          AVG(score) as average_score,
          COUNT(CASE WHEN score >= 8.0 THEN 1 END) as excellent_count,
          COUNT(CASE WHEN score < 5.0 THEN 1 END) as failing_count
        FROM grades
      `);

      const queryTime = Date.now() - startTime;

      console.log(`   Query time: ${queryTime}ms`);
      console.log(`   Total grades: ${stats[0].total_grades.toLocaleString()}`);
      console.log(`   Average score: ${parseFloat(stats[0].average_score).toFixed(2)}`);
      console.log(`   Status: ${queryTime < CONFIG.THRESHOLDS.QUERY_TIME_MS ? '✅ PASS' : '❌ FAIL'}`);

      expect(queryTime).toBeLessThan(CONFIG.THRESHOLDS.QUERY_TIME_MS);
    });

    test('📊 Teacher workload analysis (< 3s)', async () => {
      const startTime = Date.now();

      const [results] = await sequelize.query(`
        SELECT
          t.id as teacher_id,
          t.first_name,
          t.last_name,
          COUNT(DISTINCT c.id) as course_count,
          COUNT(g.id) as grades_given
        FROM teachers t
        LEFT JOIN courses c ON c.teacher_id = t.id
        LEFT JOIN grades g ON g.course_id = c.id
        GROUP BY t.id, t.first_name, t.last_name
        ORDER BY grades_given DESC
        LIMIT 50
      `);

      const queryTime = Date.now() - startTime;

      console.log(`   Query time: ${queryTime}ms`);
      console.log(`   Teachers analyzed: ${results.length}`);
      console.log(`   Status: ${queryTime < CONFIG.THRESHOLDS.QUERY_TIME_MS ? '✅ PASS' : '❌ FAIL'}`);

      expect(queryTime).toBeLessThan(CONFIG.THRESHOLDS.QUERY_TIME_MS);
    });
  });

  describe('Attendance Query Performance', () => {
    test('📊 Attendance statistics (< 3s)', async () => {
      const startTime = Date.now();

      const [results] = await sequelize.query(`
        SELECT
          student_id,
          COUNT(*) as total_days,
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
          CAST(COUNT(CASE WHEN status = 'present' THEN 1 END) AS FLOAT) / COUNT(*) * 100 as attendance_rate
        FROM attendance
        GROUP BY student_id
        HAVING COUNT(*) > 0
        ORDER BY attendance_rate DESC
        LIMIT 100
      `);

      const queryTime = Date.now() - startTime;

      console.log(`   Query time: ${queryTime}ms`);
      console.log(`   Students analyzed: ${results.length}`);
      console.log(`   Status: ${queryTime < CONFIG.THRESHOLDS.QUERY_TIME_MS ? '✅ PASS' : '❌ FAIL'}`);

      expect(queryTime).toBeLessThan(CONFIG.THRESHOLDS.QUERY_TIME_MS);
    });
  });
});

/**
 * Generate test data
 */
async function generateTestData() {
  console.log('📝 Step 1/6: Creating teachers...');
  testDataIds.teachers = await createTeachers(CONFIG.TEACHERS);

  console.log('📝 Step 2/6: Creating students...');
  testDataIds.students = await createStudents(CONFIG.STUDENTS);

  console.log('📝 Step 3/6: Creating classes...');
  testDataIds.classes = await createClasses(CONFIG.CLASSES, testDataIds.teachers);

  console.log('📝 Step 4/6: Creating courses...');
  testDataIds.courses = await createCourses(CONFIG.COURSES, testDataIds.teachers, testDataIds.classes);

  console.log('📝 Step 5/6: Creating grades (240K records)...');
  await createGrades(CONFIG.GRADES, testDataIds.students, testDataIds.courses);

  console.log('📝 Step 6/6: Creating attendance records...');
  await createAttendance(CONFIG.ATTENDANCE, testDataIds.students, testDataIds.courses);
}

async function createTeachers(count) {
  const teachers = [];
  const batchSize = CONFIG.THRESHOLDS.INSERT_BATCH_SIZE;

  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    const limit = Math.min(i + batchSize, count);

    for (let j = i; j < limit; j++) {
      batch.push({
        email: `teacher_perf_${j}@test.com`,
        password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5oVZ.aX9eoWP2', // "password"
        role: 'teacher',
        is_active: true
      });
    }

    const users = await User.bulkCreate(batch);

    const teacherBatch = users.map((user, idx) => ({
      user_id: user.id,
      first_name: `Teacher${i + idx}`,
      last_name: 'Performance',
      department: ['Math', 'Science', 'English', 'History'][idx % 4],
      hire_date: new Date()
    }));

    const createdTeachers = await Teacher.bulkCreate(teacherBatch);
    teachers.push(...createdTeachers.map(t => t.id));

    process.stdout.write(`\r   Progress: ${Math.min(limit, count)}/${count} teachers`);
  }
  console.log('');
  return teachers;
}

async function createStudents(count) {
  const students = [];
  const batchSize = CONFIG.THRESHOLDS.INSERT_BATCH_SIZE;

  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    const limit = Math.min(i + batchSize, count);

    for (let j = i; j < limit; j++) {
      batch.push({
        email: `student_perf_${j}@test.com`,
        password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5oVZ.aX9eoWP2',
        role: 'student',
        is_active: true
      });
    }

    const users = await User.bulkCreate(batch);

    const studentBatch = users.map((user, idx) => ({
      user_id: user.id,
      first_name: `Student${i + idx}`,
      last_name: 'Performance',
      date_of_birth: '2005-01-01',
      gender: idx % 2 === 0 ? 'M' : 'F'
    }));

    const createdStudents = await Student.bulkCreate(studentBatch);
    students.push(...createdStudents.map(s => s.id));

    process.stdout.write(`\r   Progress: ${Math.min(limit, count)}/${count} students`);
  }
  console.log('');
  return students;
}

async function createClasses(count, teacherIds) {
  const classes = [];

  for (let i = 0; i < count; i++) {
    const cls = await Class.create({
      name: `Class ${i + 1}`,
      grade_level: 10 + (i % 3),
      teacher_id: teacherIds[i % teacherIds.length],
      capacity: 40,
      school_year: '2024-2025'
    });
    classes.push(cls.id);
  }

  return classes;
}

async function createCourses(count, teacherIds, classIds) {
  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Physics', 'Chemistry'];
  const courses = [];

  for (let i = 0; i < count; i++) {
    const course = await Course.create({
      name: `${subjects[i % subjects.length]} ${Math.floor(i / subjects.length) + 1}`,
      code: `COURSE${i + 1}`,
      subject: subjects[i % subjects.length],
      teacher_id: teacherIds[i % teacherIds.length],
      class_id: classIds[i % classIds.length],
      semester: 'Full Year',
      school_year: '2024-2025'
    });
    courses.push(course.id);
  }

  return courses;
}

async function createGrades(count, studentIds, courseIds) {
  const batchSize = CONFIG.THRESHOLDS.INSERT_BATCH_SIZE;
  const gradeTypes = ['Test', 'Quiz', 'Homework', 'Project', 'Midterm', 'Final'];

  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    const limit = Math.min(i + batchSize, count);

    for (let j = i; j < limit; j++) {
      const score = Math.random() * 5 + 5; // 5-10 range
      batch.push({
        student_id: studentIds[j % studentIds.length],
        course_id: courseIds[j % courseIds.length],
        score: parseFloat(score.toFixed(2)),
        grade_type: gradeTypes[j % gradeTypes.length],
        semester: '1',
        graded_date: new Date(),
        is_published: true
      });
    }

    await Grade.bulkCreate(batch);
    process.stdout.write(`\r   Progress: ${Math.min(limit, count).toLocaleString()}/${count.toLocaleString()} grades`);
  }
  console.log('');
}

async function createAttendance(count, studentIds, courseIds) {
  const batchSize = CONFIG.THRESHOLDS.INSERT_BATCH_SIZE;
  const statuses = ['present', 'absent', 'late'];

  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    const limit = Math.min(i + batchSize, count);

    for (let j = i; j < limit; j++) {
      batch.push({
        student_id: studentIds[j % studentIds.length],
        course_id: courseIds[j % courseIds.length],
        date: new Date(2024, 0, 1 + (j % 365)),
        status: statuses[Math.random() < 0.85 ? 0 : (Math.random() < 0.5 ? 1 : 2)]
      });
    }

    await Attendance.bulkCreate(batch);
    process.stdout.write(`\r   Progress: ${Math.min(limit, count).toLocaleString()}/${count.toLocaleString()} attendance`);
  }
  console.log('');
}

module.exports = { CONFIG };
