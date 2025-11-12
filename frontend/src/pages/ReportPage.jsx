// ReportPage.jsx - Reports and Analytics Page
import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Breadcrumb,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Table,
  Progress,
  Empty,
  Tabs,
  List,
  Avatar,
  Tag,
  Spin,
  message
} from 'antd';
import {
  BarChartOutlined,
  HomeOutlined,
  DownloadOutlined,
  PrinterOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  TrophyOutlined,
  TeamOutlined,
  BookOutlined,
  CalendarOutlined,
  UserOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../services/api.js';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const ReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportType, setReportType] = useState('academic');
  const [dateRange, setDateRange] = useState(null);
  const [academicData, setAcademicData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    totalCourses: 0,
    avgAttendance: 0,
    avgGrade: 0
  });

  // Fetch report data
  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const coursesResponse = await api.get('/courses', { params: { limit: 100 } });
      const courses = coursesResponse.data?.data?.courses || [];

      const gradesResponse = await api.get('/grades', { params: { limit: 100 } });
      const grades = gradesResponse.data?.data?.grades || [];

      const studentsResponse = await api.get('/students', { params: { limit: 100 } });
      const students = studentsResponse.data?.data?.students || [];

      const attendanceResponse = await api.get('/attendance', { params: { limit: 100 } });
      const attendance = attendanceResponse.data?.data?.attendance || [];

      // Calculate academic data by subject
      const subjectStats = {};
      courses.forEach(course => {
        if (!subjectStats[course.subject]) {
          subjectStats[course.subject] = {
            subject: course.subject,
            students: 0,
            totalGrade: 0,
            gradeCount: 0,
            passCount: 0
          };
        }

        const courseGrades = grades.filter(g => g.course_id === course.id);
        courseGrades.forEach(grade => {
          subjectStats[course.subject].students++;
          subjectStats[course.subject].totalGrade += parseFloat(grade.score) || 0;
          subjectStats[course.subject].gradeCount++;
          // Check passing grade (0-10 scale: 6 = 60%)
          if (parseFloat(grade.score) >= 6) {
            subjectStats[course.subject].passCount++;
          }
        });
      });

      const academicResults = Object.values(subjectStats).map(stat => ({
        subject: stat.subject,
        students: stat.gradeCount > 0 ? stat.gradeCount : stat.students,
        // avgGrade: Grades are already 0-10 scale, no need to divide by 10
        avgGrade: stat.gradeCount > 0 ? parseFloat((stat.totalGrade / stat.gradeCount).toFixed(1)) : 0,
        passRate: stat.gradeCount > 0 ? Math.round((stat.passCount / stat.gradeCount) * 100) : 0
      }));

      setAcademicData(academicResults);

      // Calculate top performers
      const studentGrades = {};
      grades.forEach(grade => {
        const studentId = grade.student_id;
        if (!studentGrades[studentId]) {
          studentGrades[studentId] = {
            student: grade.student,
            totalScore: 0,
            count: 0
          };
        }
        studentGrades[studentId].totalScore += parseFloat(grade.score) || 0;
        studentGrades[studentId].count++;
      });

      const topStudents = Object.entries(studentGrades)
        .map(([id, data]) => ({
          name: data.student ? `${data.student.first_name} ${data.student.last_name}` : 'Unknown',
          grade: parseFloat((data.totalScore / data.count / 10).toFixed(1)),
          class: 'N/A',
          subject: 'All Subjects'
        }))
        .sort((a, b) => b.grade - a.grade)
        .slice(0, 5);

      setTopPerformers(topStudents);

      // Calculate statistics
      const totalGrade = grades.reduce((sum, g) => sum + (parseFloat(g.score) || 0), 0);
      const avgGrade = grades.length > 0 ? parseFloat((totalGrade / grades.length / 10).toFixed(1)) : 0;

      const presentCount = attendance.filter(a => a.status === 'Present').length;
      const avgAttendance = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

      setStatistics({
        totalStudents: students.length,
        totalCourses: courses.length,
        avgAttendance,
        avgGrade
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Không thể tải dữ liệu báo cáo';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const academicColumns = [
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject) => (
        <Space>
          <BookOutlined />
          <Text strong>{subject}</Text>
        </Space>
      )
    },
    {
      title: 'Students',
      dataIndex: 'students',
      key: 'students',
      render: (count) => (
        <Space>
          <TeamOutlined />
          <Text>{count}</Text>
        </Space>
      )
    },
    {
      title: 'Average Grade',
      dataIndex: 'avgGrade',
      key: 'avgGrade',
      render: (grade) => {
        const gradeValue = typeof grade === 'number' ? grade : parseFloat(grade) || 0;
        return (
          <Tag color={gradeValue >= 8 ? 'green' : gradeValue >= 7 ? 'orange' : 'red'}>
            {gradeValue.toFixed(1)}
          </Tag>
        );
      }
    },
    {
      title: 'Pass Rate',
      dataIndex: 'passRate',
      key: 'passRate',
      render: (rate) => (
        <Progress 
          percent={rate} 
          size="small" 
          status={rate >= 90 ? 'success' : rate >= 80 ? 'normal' : 'exception'}
        />
      )
    }
  ];

  const attendanceColumns = [
    {
      title: 'Class',
      dataIndex: 'class',
      key: 'class',
      render: (className) => (
        <Tag color="blue">{className}</Tag>
      )
    },
    {
      title: 'Present/Total',
      key: 'attendance',
      render: (_, record) => (
        <Text>{record.present}/{record.total}</Text>
      )
    },
    {
      title: 'Attendance Rate',
      dataIndex: 'rate',
      key: 'rate',
      render: (rate) => (
        <Progress 
          percent={rate} 
          size="small" 
          status={rate >= 95 ? 'success' : rate >= 85 ? 'normal' : 'exception'}
        />
      )
    }
  ];

  const handleExport = (format) => {
    // Export functionality will be implemented here
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Đang tải dữ liệu báo cáo..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-page">
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item>
            <Link to="/dashboard">
              <HomeOutlined /> Home
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <BarChartOutlined /> Reports
          </Breadcrumb.Item>
        </Breadcrumb>

        <Title level={2}>
          <BarChartOutlined /> Reports & Analytics
        </Title>

        <Card style={{ marginTop: 24 }}>
          <Empty
            description={
              <div>
                <Text type="danger" strong style={{ fontSize: 16 }}>{error}</Text>
                <br />
                <Text type="secondary">Vui lòng thử lại sau hoặc liên hệ quản trị viên</Text>
              </div>
            }
          >
            <Button type="primary" onClick={fetchReportData}>
              Thử Lại
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div className="report-page">
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/dashboard">
            <HomeOutlined /> Home
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <BarChartOutlined /> Reports
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <Title level={2}>
          <BarChartOutlined /> Reports & Analytics
        </Title>
      </div>

      {/* Report Controls */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space>
              <Text strong>Report Type:</Text>
              <Select 
                value={reportType} 
                onChange={setReportType}
                style={{ width: 150 }}
              >
                <Option value="academic">Academic Performance</Option>
                <Option value="attendance">Attendance</Option>
                <Option value="teacher">Teacher Performance</Option>
                <Option value="financial">Financial</Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text strong>Date Range:</Text>
              <RangePicker onChange={setDateRange} />
            </Space>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<FileExcelOutlined />} onClick={() => handleExport('excel')}>
                Export Excel
              </Button>
              <Button icon={<FilePdfOutlined />} onClick={() => handleExport('pdf')}>
                Export PDF
              </Button>
              <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                Print
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Report Content */}
      <Row gutter={16}>
        <Col span={16}>
          <Card title="Performance Overview" style={{ marginBottom: 16 }}>
            <Tabs defaultActiveKey="academic">
              <TabPane tab="Academic Performance" key="academic">
                <Table
                  columns={academicColumns}
                  dataSource={academicData}
                  rowKey="subject"
                  pagination={false}
                  size="small"
                />
              </TabPane>
              <TabPane tab="Attendance Report" key="attendance">
                <Table
                  columns={attendanceColumns}
                  dataSource={attendanceData}
                  rowKey="class"
                  pagination={false}
                  size="small"
                />
              </TabPane>
            </Tabs>
          </Card>

          {/* Summary Statistics */}
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Average Grade"
                  value={statistics.avgGrade}
                  suffix="/10"
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Average Attendance"
                  value={statistics.avgAttendance}
                  suffix="%"
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<CalendarOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Total Students"
                  value={statistics.totalStudents}
                  valueStyle={{ color: '#722ed1' }}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </Col>

        <Col span={8}>
          <Card title="Top Performers" style={{ marginBottom: 16 }}>
            <List
              dataSource={topPerformers}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ 
                          backgroundColor: index === 0 ? '#faad14' : 
                                          index === 1 ? '#c0c0c0' : '#cd7f32' 
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={item.name}
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary">{item.class} - {item.subject}</Text>
                        <Tag color="green">Grade: {item.grade}</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card title="Quick Actions">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<BarChartOutlined />}>
                Generate Custom Report
              </Button>
              <Button block icon={<CalendarOutlined />}>
                Schedule Report
              </Button>
              <Button block icon={<DownloadOutlined />}>
                Download Templates
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ReportPage;
