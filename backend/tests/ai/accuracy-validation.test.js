/**
 * AI Accuracy Validation Tests
 * ============================
 * Validates ML model accuracy and prediction quality
 *
 * REQUIREMENTS:
 * - Prediction accuracy: ≥78%
 * - Early warning detection: ≥85%
 * - Response time: <5 seconds
 */

const aiService = require('../../services/aiService');
const { Student, Grade, Course, User, Teacher, Class } = require('../../models');

describe('🤖 AI Model Accuracy Validation', () => {
  let testData = {
    students: [],
    courses: [],
    grades: []
  };

  beforeAll(async () => {
    console.log('\n🔧 Setting up AI test data...');
    jest.setTimeout(60000);

    await generateAITestData();

    console.log('✅ AI test data ready\n');
  }, 60000);

  afterAll(async () => {
    console.log('\n🧹 Cleaning up AI test data...');
    await cleanupAITestData();
  });

  describe('Performance Prediction Accuracy', () => {
    test('📊 Should predict improving trends with ≥78% accuracy', async () => {
      const results = {
        correct: 0,
        total: 0
      };

      // Test on students with improving grades
      for (const student of testData.students.filter(s => s.trend === 'improving')) {
        const grades = await Grade.findAll({
          where: { student_id: student.id },
          order: [['created_at', 'ASC']],
          limit: 10
        });

        if (grades.length >= 5) {
          const prediction = aiService.predictPerformanceTrend(grades);

          results.total++;
          if (prediction.trend === 'improving' || prediction.trend === 'stable_high') {
            results.correct++;
          }
        }
      }

      const accuracy = (results.correct / results.total) * 100;

      console.log(`   Improving trend accuracy: ${accuracy.toFixed(2)}%`);
      console.log(`   Correct: ${results.correct}/${results.total}`);
      console.log(`   Status: ${accuracy >= 78 ? '✅ PASS' : '❌ FAIL'}`);

      expect(accuracy).toBeGreaterThanOrEqual(78); // ≥78% requirement
    });

    test('📊 Should predict declining trends with ≥78% accuracy', async () => {
      const results = {
        correct: 0,
        total: 0
      };

      // Test on students with declining grades
      for (const student of testData.students.filter(s => s.trend === 'declining')) {
        const grades = await Grade.findAll({
          where: { student_id: student.id },
          order: [['created_at', 'ASC']],
          limit: 10
        });

        if (grades.length >= 5) {
          const prediction = aiService.predictPerformanceTrend(grades);

          results.total++;
          if (prediction.trend === 'declining' || prediction.trend === 'at_risk') {
            results.correct++;
          }
        }
      }

      const accuracy = (results.correct / results.total) * 100;

      console.log(`   Declining trend accuracy: ${accuracy.toFixed(2)}%`);
      console.log(`   Correct: ${results.correct}/${results.total}`);
      console.log(`   Status: ${accuracy >= 78 ? '✅ PASS' : '❌ FAIL'}`);

      expect(accuracy).toBeGreaterThanOrEqual(78); // ≥78% requirement
    });

    test('📊 Overall prediction accuracy ≥78%', async () => {
      const results = {
        correct: 0,
        total: 0
      };

      // Test on all students
      for (const student of testData.students) {
        const grades = await Grade.findAll({
          where: { student_id: student.id },
          order: [['created_at', 'ASC']],
          limit: 10
        });

        if (grades.length >= 5) {
          const prediction = aiService.predictPerformanceTrend(grades);
          const expectedTrend = student.trend;

          results.total++;

          // Check if prediction matches expected trend
          const matchMap = {
            'improving': ['improving', 'stable_high'],
            'declining': ['declining', 'at_risk'],
            'stable': ['stable', 'stable_high', 'stable_low']
          };

          if (matchMap[expectedTrend]?.includes(prediction.trend)) {
            results.correct++;
          }
        }
      }

      const accuracy = (results.correct / results.total) * 100;

      console.log(`\n   📊 OVERALL ACCURACY RESULTS:`);
      console.log(`   Total predictions: ${results.total}`);
      console.log(`   Correct predictions: ${results.correct}`);
      console.log(`   Accuracy: ${accuracy.toFixed(2)}%`);
      console.log(`   Requirement: ≥78%`);
      console.log(`   Status: ${accuracy >= 78 ? '✅ PASS' : '❌ FAIL'}\n`);

      expect(accuracy).toBeGreaterThanOrEqual(78); // ≥78% requirement
    });
  });

  describe('Early Warning System', () => {
    test('🚨 Should detect at-risk students with ≥85% accuracy', async () => {
      const results = {
        truePositives: 0,  // Correctly identified at-risk
        falseNegatives: 0, // Missed at-risk students
        total: 0
      };

      // Test on students marked as at-risk
      for (const student of testData.students.filter(s => s.atRisk)) {
        const grades = await Grade.findAll({
          where: { student_id: student.id },
          order: [['created_at', 'ASC']],
          limit: 10
        });

        if (grades.length >= 5) {
          const prediction = aiService.predictPerformanceTrend(grades);

          results.total++;

          if (prediction.trend === 'at_risk' || prediction.trend === 'declining') {
            results.truePositives++;
          } else {
            results.falseNegatives++;
          }
        }
      }

      const accuracy = (results.truePositives / results.total) * 100;

      console.log(`   Early warning detection rate: ${accuracy.toFixed(2)}%`);
      console.log(`   Detected: ${results.truePositives}/${results.total}`);
      console.log(`   Missed: ${results.falseNegatives}`);
      console.log(`   Status: ${accuracy >= 85 ? '✅ PASS' : '❌ FAIL'}`);

      expect(accuracy).toBeGreaterThanOrEqual(85); // ≥85% requirement
    });

    test('🚨 Should minimize false positives (<15%)', async () => {
      const results = {
        falsePositives: 0,  // Non-at-risk marked as at-risk
        trueNegatives: 0,   // Correctly identified non-at-risk
        total: 0
      };

      // Test on students NOT at risk
      for (const student of testData.students.filter(s => !s.atRisk)) {
        const grades = await Grade.findAll({
          where: { student_id: student.id },
          order: [['created_at', 'ASC']],
          limit: 10
        });

        if (grades.length >= 5) {
          const prediction = aiService.predictPerformanceTrend(grades);

          results.total++;

          if (prediction.trend === 'at_risk' || prediction.trend === 'declining') {
            results.falsePositives++;
          } else {
            results.trueNegatives++;
          }
        }
      }

      const falsePositiveRate = (results.falsePositives / results.total) * 100;

      console.log(`   False positive rate: ${falsePositiveRate.toFixed(2)}%`);
      console.log(`   False alarms: ${results.falsePositives}/${results.total}`);
      console.log(`   Status: ${falsePositiveRate < 15 ? '✅ PASS' : '❌ FAIL'}`);

      expect(falsePositiveRate).toBeLessThan(15); // <15% false positives
    });
  });

  describe('AI Recommendation Quality', () => {
    test('📚 Should generate relevant study recommendations', async () => {
      const student = testData.students[0];

      const studentData = {
        name: 'Test Student',
        grades: {
          average: 7.5
        },
        weakSubjects: ['Mathematics', 'Physics'],
        strengths: ['English', 'History']
      };

      const startTime = Date.now();
      const recommendations = await aiService.generateStudyRecommendations(studentData);
      const responseTime = Date.now() - startTime;

      console.log(`   Response time: ${responseTime}ms`);
      console.log(`   Recommendations generated: ${recommendations.split('\n').length} points`);
      console.log(`   Status: ${responseTime < 5000 ? '✅ PASS' : '❌ FAIL'}`);

      // Verify recommendations quality
      expect(recommendations).toBeTruthy();
      expect(recommendations.length).toBeGreaterThan(100);
      expect(recommendations).toMatch(/mathematics|math/i);
      expect(recommendations).toMatch(/physics/i);

      // Response time < 5s
      expect(responseTime).toBeLessThan(5000);
    });

    test('📚 Should generate course recommendations', async () => {
      const studentProfile = {
        interests: ['Science', 'Technology'],
        completedCourses: ['Mathematics 1', 'Physics 1'],
        avgGrade: 8.0,
        careerGoals: 'Engineering'
      };

      const startTime = Date.now();
      const recommendations = await aiService.generateCourseRecommendations(studentProfile);
      const responseTime = Date.now() - startTime;

      console.log(`   Response time: ${responseTime}ms`);
      console.log(`   Recommendations length: ${recommendations.length} characters`);
      console.log(`   Status: ${responseTime < 5000 ? '✅ PASS' : '❌ FAIL'}`);

      // Verify recommendations
      expect(recommendations).toBeTruthy();
      expect(recommendations.length).toBeGreaterThan(100);

      // Response time < 5s
      expect(responseTime).toBeLessThan(5000);
    });

    test('📝 Should generate report summaries', async () => {
      const reportData = {
        studentName: 'Test Student',
        period: 'Semester 1',
        grades: {
          average: 8.5,
          subjects: [
            { name: 'Mathematics', score: 9.0 },
            { name: 'English', score: 8.5 },
            { name: 'Physics', score: 8.0 }
          ]
        },
        attendance: {
          rate: 95
        },
        behavior: {
          score: 8.5
        }
      };

      const startTime = Date.now();
      const summary = await aiService.generateReportSummary(reportData);
      const responseTime = Date.now() - startTime;

      console.log(`   Response time: ${responseTime}ms`);
      console.log(`   Summary length: ${summary.length} characters`);
      console.log(`   Status: ${responseTime < 5000 ? '✅ PASS' : '❌ FAIL'}`);

      // Verify summary
      expect(summary).toBeTruthy();
      expect(summary.length).toBeGreaterThan(200);

      // Response time < 5s
      expect(responseTime).toBeLessThan(5000);
    });
  });

  describe('AI Performance Metrics', () => {
    test('⚡ All AI predictions complete within 5 seconds', async () => {
      const testCases = 50;
      const timings = [];

      for (let i = 0; i < testCases; i++) {
        const student = testData.students[i % testData.students.length];
        const grades = await Grade.findAll({
          where: { student_id: student.id },
          limit: 10
        });

        if (grades.length >= 5) {
          const startTime = Date.now();
          await aiService.predictPerformanceTrend(grades);
          timings.push(Date.now() - startTime);
        }
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);
      const p95 = timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];

      console.log(`\n   ⚡ PERFORMANCE METRICS:`);
      console.log(`   Test cases: ${timings.length}`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Max: ${maxTime.toFixed(2)}ms`);
      console.log(`   P95: ${p95.toFixed(2)}ms`);
      console.log(`   Status: ${p95 < 5000 ? '✅ PASS' : '❌ FAIL'}\n`);

      expect(avgTime).toBeLessThan(2000); // Average < 2s
      expect(p95).toBeLessThan(5000); // 95th percentile < 5s
    });
  });
});

/**
 * Generate test data for AI validation
 */
async function generateAITestData() {
  const testData = { students: [], courses: [], grades: [] };

  // Create test teacher
  const teacherUser = await User.create({
    email: 'ai_test_teacher@test.com',
    password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5oVZ.aX9eoWP2',
    role: 'teacher'
  });

  const teacher = await Teacher.create({
    user_id: teacherUser.id,
    first_name: 'AI',
    last_name: 'Test',
    department: 'Mathematics'
  });

  // Create test class
  const testClass = await Class.create({
    name: 'AI Test Class',
    grade_level: 10,
    teacher_id: teacher.id,
    capacity: 50,
    school_year: '2024-2025'
  });

  // Create courses
  const course = await Course.create({
    name: 'Test Course',
    code: 'AI-TEST-01',
    subject: 'Mathematics',
    teacher_id: teacher.id,
    class_id: testClass.id,
    semester: 'Full Year',
    school_year: '2024-2025'
  });

  testData.courses.push(course);

  // Create students with different performance patterns
  const patterns = [
    { trend: 'improving', atRisk: false, scores: [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5] },
    { trend: 'declining', atRisk: true, scores: [8.5, 8.0, 7.5, 7.0, 6.5, 6.0, 5.5] },
    { trend: 'stable', atRisk: false, scores: [8.0, 7.9, 8.1, 8.0, 8.2, 7.9, 8.0] },
    { trend: 'improving', atRisk: false, scores: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0] },
    { trend: 'declining', atRisk: true, scores: [7.0, 6.5, 6.0, 5.5, 5.0, 4.5, 4.0] }
  ];

  for (let i = 0; i < 50; i++) {
    const pattern = patterns[i % patterns.length];

    const studentUser = await User.create({
      email: `ai_test_student_${i}@test.com`,
      password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5oVZ.aX9eoWP2',
      role: 'student'
    });

    const student = await Student.create({
      user_id: studentUser.id,
      first_name: `Student${i}`,
      last_name: 'AITest',
      date_of_birth: '2008-01-01',
      gender: i % 2 === 0 ? 'M' : 'F'
    });

    student.trend = pattern.trend;
    student.atRisk = pattern.atRisk;
    testData.students.push(student);

    // Create grades following the pattern
    for (let j = 0; j < pattern.scores.length; j++) {
      await Grade.create({
        student_id: student.id,
        course_id: course.id,
        score: pattern.scores[j],
        grade_type: 'Test',
        semester: '1',
        graded_date: new Date(2024, 0, j * 7),
        is_published: true
      });
    }
  }

  return testData;
}

async function cleanupAITestData() {
  await Grade.destroy({ where: {}, force: true });
  await Course.destroy({ where: {}, force: true });
  await Class.destroy({ where: {}, force: true });
  await Student.destroy({ where: {}, force: true });
  await Teacher.destroy({ where: {}, force: true });
  await User.destroy({ where: { email: { [require('sequelize').Op.like]: 'ai_test_%' } }, force: true });
}

module.exports = { generateAITestData, cleanupAITestData };
