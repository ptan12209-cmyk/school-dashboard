/**
 * ReportCard.jsx - Student Report Card Component
 * =============================================
 * Displays comprehensive grade report for a student
 */

import React from 'react';
import { 
  Card, 
  Table, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Typography,
  Divider,
  Tag 
} from 'antd';
import { TrophyOutlined, BookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ReportCard = ({ student = {}, grades = [], semester = 'Fall 2024' }) => {
  // Mock data if none provided
  const mockStudent = {
    id: 'ST001',
    name: 'Alice Johnson',
    class: '10A',
    rollNumber: '2024001',
    photo: null
  };

  // Mock grades using 0-10 scale
  const mockGrades = [
    { subject: 'Mathematics', grade: 9.5, maxGrade: 10, credits: 4, gradePoint: 4.0 },
    { subject: 'Science', grade: 8.7, maxGrade: 10, credits: 4, gradePoint: 3.5 },
    { subject: 'English', grade: 9.2, maxGrade: 10, credits: 3, gradePoint: 3.8 },
    { subject: 'History', grade: 8.9, maxGrade: 10, credits: 3, gradePoint: 3.6 },
    { subject: 'Art', grade: 9.6, maxGrade: 10, credits: 2, gradePoint: 4.0 }
  ];

  const studentData = Object.keys(student).length > 0 ? student : mockStudent;
  const gradeData = grades.length > 0 ? grades : mockGrades;

  // Calculate statistics
  const totalCredits = gradeData.reduce((sum, grade) => sum + grade.credits, 0);
  const weightedGradeSum = gradeData.reduce((sum, grade) => sum + (grade.grade * grade.credits), 0);
  const gpaSum = gradeData.reduce((sum, grade) => sum + (grade.gradePoint * grade.credits), 0);
  
  const overallAverage = weightedGradeSum / totalCredits;
  const gpa = gpaSum / totalCredits;

  const getLetterGrade = (percentage) => {
    if (percentage >= 90) return { letter: 'A', color: 'green' };
    if (percentage >= 80) return { letter: 'B', color: 'blue' };
    if (percentage >= 70) return { letter: 'C', color: 'orange' };
    if (percentage >= 60) return { letter: 'D', color: 'gold' };
    return { letter: 'F', color: 'red' };
  };

  const columns = [
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Grade',
      dataIndex: 'grade',
      key: 'grade',
      render: (grade, record) => `${grade}/${record.maxGrade}`
    },
    {
      title: 'Percentage',
      key: 'percentage',
      render: (_, record) => {
        const percentage = (record.grade / record.maxGrade) * 100;
        return `${percentage.toFixed(1)}%`;
      }
    },
    {
      title: 'Letter Grade',
      key: 'letterGrade',
      render: (_, record) => {
        const percentage = (record.grade / record.maxGrade) * 100;
        const { letter, color } = getLetterGrade(percentage);
        return <Tag color={color}>{letter}</Tag>;
      }
    },
    {
      title: 'Credits',
      dataIndex: 'credits',
      key: 'credits'
    },
    {
      title: 'Grade Points',
      dataIndex: 'gradePoint',
      key: 'gradePoint',
      render: (points) => points.toFixed(1)
    }
  ];

  return (
    <Card style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2}>Report Card</Title>
        <Text type="secondary">{semester}</Text>
      </div>

      {/* Student Information */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Text strong>Student Name: </Text>
            <Text>{studentData.name}</Text>
          </Col>
          <Col span={12}>
            <Text strong>Student ID: </Text>
            <Text>{studentData.id}</Text>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 8 }}>
          <Col span={12}>
            <Text strong>Class: </Text>
            <Text>{studentData.class}</Text>
          </Col>
          <Col span={12}>
            <Text strong>Roll Number: </Text>
            <Text>{studentData.rollNumber}</Text>
          </Col>
        </Row>
      </Card>

      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Overall Average"
              value={overallAverage.toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="GPA"
              value={gpa.toFixed(2)}
              suffix="/4.0"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Credits"
              value={totalCredits}
              valueStyle={{ color: '#faad14' }}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Subjects"
              value={gradeData.length}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Performance Progress */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Title level={4}>Performance Overview</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Text>Overall Performance</Text>
            <Progress 
              percent={overallAverage} 
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </Col>
          <Col span={12}>
            <Text>GPA Progress</Text>
            <Progress 
              percent={(gpa / 4.0) * 100} 
              format={() => `${gpa.toFixed(2)}/4.0`}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Detailed Grades Table */}
      <Card size="small">
        <Title level={4}>Subject-wise Performance</Title>
        <Table
          columns={columns}
          dataSource={gradeData}
          rowKey="subject"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Footer */}
      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">
          Generated on {new Date().toLocaleDateString()}
        </Text>
      </div>
    </Card>
  );
};

export default ReportCard;
