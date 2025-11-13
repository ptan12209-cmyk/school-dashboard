/**
 * Database Optimization Script
 * =============================
 * Creates indexes and optimizes database for performance
 *
 * Features:
 * - Creates essential indexes
 * - Analyzes query performance
 * - Provides optimization recommendations
 * - Updates database statistics
 *
 * Usage:
 * node scripts/optimize-database.js
 */

const { sequelize } = require('../models');
const logger = require('../utils/logger');

/**
 * Index definitions
 * Format: { table, column(s), type, name }
 */
const INDEXES = [
  // Users table
  {
    table: 'users',
    columns: ['email'],
    type: 'UNIQUE',
    name: 'idx_users_email',
  },
  {
    table: 'users',
    columns: ['role'],
    type: '',
    name: 'idx_users_role',
  },
  {
    table: 'users',
    columns: ['is_active'],
    type: '',
    name: 'idx_users_is_active',
  },

  // Students table
  {
    table: 'students',
    columns: ['user_id'],
    type: 'UNIQUE',
    name: 'idx_students_user_id',
  },
  {
    table: 'students',
    columns: ['first_name', 'last_name'],
    type: '',
    name: 'idx_students_name',
  },

  // Teachers table
  {
    table: 'teachers',
    columns: ['user_id'],
    type: 'UNIQUE',
    name: 'idx_teachers_user_id',
  },
  {
    table: 'teachers',
    columns: ['department'],
    type: '',
    name: 'idx_teachers_department',
  },

  // Grades table (critical for performance)
  {
    table: 'grades',
    columns: ['student_id'],
    type: '',
    name: 'idx_grades_student_id',
  },
  {
    table: 'grades',
    columns: ['course_id'],
    type: '',
    name: 'idx_grades_course_id',
  },
  {
    table: 'grades',
    columns: ['student_id', 'course_id'],
    type: '',
    name: 'idx_grades_student_course',
  },
  {
    table: 'grades',
    columns: ['is_published'],
    type: '',
    name: 'idx_grades_is_published',
  },
  {
    table: 'grades',
    columns: ['graded_date'],
    type: '',
    name: 'idx_grades_graded_date',
  },
  {
    table: 'grades',
    columns: ['semester'],
    type: '',
    name: 'idx_grades_semester',
  },
  {
    table: 'grades',
    columns: ['student_id', 'graded_date'],
    type: '',
    name: 'idx_grades_student_date',
  },

  // Courses table
  {
    table: 'courses',
    columns: ['teacher_id'],
    type: '',
    name: 'idx_courses_teacher_id',
  },
  {
    table: 'courses',
    columns: ['class_id'],
    type: '',
    name: 'idx_courses_class_id',
  },
  {
    table: 'courses',
    columns: ['code'],
    type: 'UNIQUE',
    name: 'idx_courses_code',
  },
  {
    table: 'courses',
    columns: ['subject'],
    type: '',
    name: 'idx_courses_subject',
  },
  {
    table: 'courses',
    columns: ['school_year'],
    type: '',
    name: 'idx_courses_school_year',
  },

  // Classes table
  {
    table: 'classes',
    columns: ['teacher_id'],
    type: '',
    name: 'idx_classes_teacher_id',
  },
  {
    table: 'classes',
    columns: ['grade_level'],
    type: '',
    name: 'idx_classes_grade_level',
  },
  {
    table: 'classes',
    columns: ['school_year'],
    type: '',
    name: 'idx_classes_school_year',
  },

  // Attendance table
  {
    table: 'attendance',
    columns: ['student_id'],
    type: '',
    name: 'idx_attendance_student_id',
  },
  {
    table: 'attendance',
    columns: ['course_id'],
    type: '',
    name: 'idx_attendance_course_id',
  },
  {
    table: 'attendance',
    columns: ['date'],
    type: '',
    name: 'idx_attendance_date',
  },
  {
    table: 'attendance',
    columns: ['student_id', 'date'],
    type: '',
    name: 'idx_attendance_student_date',
  },
  {
    table: 'attendance',
    columns: ['status'],
    type: '',
    name: 'idx_attendance_status',
  },

  // Notifications table
  {
    table: 'notifications',
    columns: ['user_id'],
    type: '',
    name: 'idx_notifications_user_id',
  },
  {
    table: 'notifications',
    columns: ['is_read'],
    type: '',
    name: 'idx_notifications_is_read',
  },
  {
    table: 'notifications',
    columns: ['user_id', 'is_read'],
    type: '',
    name: 'idx_notifications_user_read',
  },
  {
    table: 'notifications',
    columns: ['created_at'],
    type: '',
    name: 'idx_notifications_created_at',
  },

  // Assignments table
  {
    table: 'assignments',
    columns: ['course_id'],
    type: '',
    name: 'idx_assignments_course_id',
  },
  {
    table: 'assignments',
    columns: ['due_date'],
    type: '',
    name: 'idx_assignments_due_date',
  },
  {
    table: 'assignments',
    columns: ['status'],
    type: '',
    name: 'idx_assignments_status',
  },

  // Submissions table
  {
    table: 'submissions',
    columns: ['student_id'],
    type: '',
    name: 'idx_submissions_student_id',
  },
  {
    table: 'submissions',
    columns: ['assignment_id'],
    type: '',
    name: 'idx_submissions_assignment_id',
  },
  {
    table: 'submissions',
    columns: ['student_id', 'assignment_id'],
    type: 'UNIQUE',
    name: 'idx_submissions_student_assignment',
  },
  {
    table: 'submissions',
    columns: ['submitted_at'],
    type: '',
    name: 'idx_submissions_submitted_at',
  },
];

/**
 * Check if index exists
 * @param {string} indexName - Index name
 * @returns {Promise<boolean>} True if exists
 */
async function indexExists(indexName) {
  try {
    const [results] = await sequelize.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE indexname = '${indexName}'
    `);

    return results.length > 0;
  } catch (error) {
    logger.error('Error checking index', { indexName, error: error.message });
    return false;
  }
}

/**
 * Create index
 * @param {Object} index - Index definition
 * @returns {Promise<boolean>} Success status
 */
async function createIndex(index) {
  try {
    const exists = await indexExists(index.name);

    if (exists) {
      logger.info(`Index already exists: ${index.name}`);
      return true;
    }

    const columns = Array.isArray(index.columns)
      ? index.columns.join(', ')
      : index.columns;

    const sql = `
      CREATE ${index.type} INDEX ${index.name}
      ON ${index.table} (${columns})
    `;

    await sequelize.query(sql);

    logger.info(`Index created: ${index.name}`, {
      table: index.table,
      columns,
      type: index.type || 'BTREE',
    });

    return true;
  } catch (error) {
    logger.error(`Failed to create index: ${index.name}`, {
      error: error.message,
      table: index.table,
    });
    return false;
  }
}

/**
 * Analyze table statistics
 * @param {string} tableName - Table name
 */
async function analyzeTable(tableName) {
  try {
    await sequelize.query(`ANALYZE ${tableName}`);
    logger.info(`Table analyzed: ${tableName}`);
  } catch (error) {
    logger.error(`Failed to analyze table: ${tableName}`, {
      error: error.message,
    });
  }
}

/**
 * Get table statistics
 * @returns {Promise<Array>} Table statistics
 */
async function getTableStats() {
  try {
    const [results] = await sequelize.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        n_tup_ins AS inserts,
        n_tup_upd AS updates,
        n_tup_del AS deletes,
        n_live_tup AS live_rows,
        n_dead_tup AS dead_rows
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    return results;
  } catch (error) {
    logger.error('Failed to get table stats', { error: error.message });
    return [];
  }
}

/**
 * Get index usage statistics
 * @returns {Promise<Array>} Index usage stats
 */
async function getIndexStats() {
  try {
    const [results] = await sequelize.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan AS index_scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
    `);

    return results;
  } catch (error) {
    logger.error('Failed to get index stats', { error: error.message });
    return [];
  }
}

/**
 * Get slow queries (if pg_stat_statements extension is installed)
 * @returns {Promise<Array>} Slow queries
 */
async function getSlowQueries() {
  try {
    const [results] = await sequelize.query(`
      SELECT
        query,
        calls,
        total_time,
        mean_time,
        max_time,
        rows
      FROM pg_stat_statements
      WHERE mean_time > 100
      ORDER BY mean_time DESC
      LIMIT 10
    `);

    return results;
  } catch (error) {
    // Extension might not be installed
    logger.warn('pg_stat_statements not available', { error: error.message });
    return [];
  }
}

/**
 * Main optimization function
 */
async function optimizeDatabase() {
  console.log('\n🔧 Starting database optimization...\n');

  try {
    // Connect to database
    await sequelize.authenticate();
    logger.info('Database connected');

    // 1. Create indexes
    console.log('📊 Creating indexes...');
    let created = 0;
    let skipped = 0;

    for (const index of INDEXES) {
      const success = await createIndex(index);
      if (success) {
        const exists = await indexExists(index.name);
        if (exists && !success) skipped++;
        else created++;
      }
    }

    console.log(`✅ Indexes created: ${created}, skipped: ${skipped}\n`);

    // 2. Analyze tables
    console.log('📈 Analyzing table statistics...');
    const tables = [
      'users',
      'students',
      'teachers',
      'classes',
      'courses',
      'grades',
      'attendance',
      'assignments',
      'submissions',
      'notifications',
    ];

    for (const table of tables) {
      await analyzeTable(table);
    }

    console.log('✅ Table analysis complete\n');

    // 3. Get and display statistics
    console.log('📊 Database Statistics:\n');

    const tableStats = await getTableStats();
    if (tableStats.length > 0) {
      console.log('Table Sizes:');
      tableStats.forEach((stat) => {
        console.log(`  ${stat.tablename}: ${stat.size} (${stat.live_rows} rows)`);
      });
      console.log('');
    }

    const indexStats = await getIndexStats();
    if (indexStats.length > 0) {
      console.log('Top Indexes (by usage):');
      indexStats.slice(0, 10).forEach((stat) => {
        console.log(
          `  ${stat.indexname}: ${stat.index_scans} scans, ${stat.index_size}`
        );
      });
      console.log('');
    }

    const slowQueries = await getSlowQueries();
    if (slowQueries.length > 0) {
      console.log('Slow Queries (mean time > 100ms):');
      slowQueries.forEach((query, idx) => {
        console.log(
          `  ${idx + 1}. ${query.query.substring(0, 80)}... (${query.mean_time.toFixed(2)}ms avg)`
        );
      });
      console.log('');
    }

    console.log('✅ Database optimization complete!\n');

    // 4. Recommendations
    console.log('💡 Recommendations:');
    console.log('  1. Run VACUUM ANALYZE periodically to maintain statistics');
    console.log('  2. Monitor slow queries and add indexes as needed');
    console.log('  3. Consider partitioning large tables (grades, attendance)');
    console.log('  4. Enable pg_stat_statements for query performance monitoring');
    console.log('  5. Set up connection pooling (already using Sequelize pool)');
    console.log('');

    // Close connection
    await sequelize.close();
    logger.info('Database optimization completed');

    process.exit(0);
  } catch (error) {
    console.error('❌ Optimization failed:', error.message);
    logger.error('Database optimization failed', { error: error.message });
    process.exit(1);
  }
}

// Run optimization if called directly
if (require.main === module) {
  optimizeDatabase();
}

module.exports = {
  optimizeDatabase,
  createIndex,
  analyzeTable,
  getTableStats,
  getIndexStats,
  INDEXES,
};
