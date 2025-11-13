/**
 * GradeStats.jsx - Grade Statistics Component
 * ==========================================
 * Displays statistical analysis of grades
 */

import React from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Typography,
  Table,
  Tag 
} from 'antd';
import { 
  TrophyOutlined, 
  RiseOutlined, 
  FallOutlined,
  LineChartOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

const GradeStats = ({ grades = [], subject = 'All Subjects' }) => {
  // Mock data if none provided
  const mockGrades = [
    { id: 1, grade: 95, student: 'Alice', subject: 'Math' },
    { id: 2, grade: 87, student: 'Bob', subject: 'Math' },
    { id: 3, grade: 92, student: 'Carol', subject: 'Math' },
    { id: 4, grade: 78, student: 'David', subject: 'Math' },
    { id: 5, grade: 89, student: 'Eva', subject: 'Math' },
    { id: 6, grade: 94, student: 'Frank', subject: 'Math' },
    { id: 7, grade: 82, student: 'Grace', subject: 'Math' },
    { id: 8, grade: 96, student: 'Henry', subject: 'Math' },
  ];

  const gradeData = grades.length > 0 ? grades : mockGrades;

  // Calculate statistics
  const gradeValues = gradeData.map(g => g.grade);
  const average = gradeValues.reduce((sum, grade) => sum + grade, 0) / gradeValues.length;
  const highest = Math.max(...gradeValues);
  const lowest = Math.min(...gradeValues);
  
  // Calculate median
  const sortedGrades = [...gradeValues].sort((a, b) => a - b);
  const median = sortedGrades.length % 2 === 0
    ? (sortedGrades[sortedGrades.length / 2 - 1] + sortedGrades[sortedGrades.length / 2]) / 2
    : sortedGrades[Math.floor(sortedGrades.length / 2)];

  // Grade distribution (0-10 scale)
  const gradeRanges = {
    'A (9-10)': gradeValues.filter(g => g >= 9).length,
    'B (8-8.9)': gradeValues.filter(g => g >= 8 && g < 9).length,
    'C (7-7.9)': gradeValues.filter(g => g >= 7 && g < 8).length,
    'D (6-6.9)': gradeValues.filter(g => g >= 6 && g < 7).length,
    'F (0-5.9)': gradeValues.filter(g => g < 6).length,
  };

  const distributionData = Object.entries(gradeRanges).map(([range, count]) => ({
    range,
    count,
    percentage: ((count / gradeValues.length) * 100).toFixed(1)
  }));

  const getGradeColor = (range) => {
    if (range.startsWith('A')) return 'green';
    if (range.startsWith('B')) return 'blue';
    if (range.startsWith('C')) return 'orange';
    if (range.startsWith('D')) return 'gold';
    return 'red';
  };

  const distributionColumns = [
    {
      title: 'Grade Range',
      dataIndex: 'range',
      key: 'range',
      render: (range) => <Tag color={getGradeColor(range)}>{range}</Tag>
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      align: 'center'
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'center',
      render: (percentage) => `${percentage}%`
    },
    {
      title: 'Visual',
      key: 'visual',
      render: (_, record) => (
        <Progress 
          percent={parseFloat(record.percentage)} 
          size="small" 
          showInfo={false}
          strokeColor={getGradeColor(record.range)}
        />
      )
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Grade Statistics - {subject}
      </Title>

      {/* Key Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Average Grade"
              value={average.toFixed(1)}
              precision={1}
              valueStyle={{ color: '#1890ff' }}
              prefix={<LineChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Highest Grade"
              value={highest}
              valueStyle={{ color: '#52c41a' }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Lowest Grade"
              value={lowest}
              valueStyle={{ color: '#f5222d' }}
              prefix={<FallOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Median Grade"
              value={median.toFixed(1)}
              precision={1}
              valueStyle={{ color: '#faad14' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Performance Overview */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Class Performance" size="small">
            <div style={{ marginBottom: 16 }}>
              <Text>Average Performance</Text>
              <Progress 
                percent={average} 
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">Pass Rate</Text>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                  {((gradeValues.filter(g => g >= 60).length / gradeValues.length) * 100).toFixed(1)}%
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Excellence Rate (A)</Text>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                  {((gradeRanges['A (90-100)'] / gradeValues.length) * 100).toFixed(1)}%
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Quick Stats" size="small">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic
                  title="Total Students"
                  value={gradeValues.length}
                  valueStyle={{ fontSize: '18px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Standard Deviation"
                  value={Math.sqrt(gradeValues.reduce((sum, grade) => sum + Math.pow(grade - average, 2), 0) / gradeValues.length).toFixed(1)}
                  valueStyle={{ fontSize: '18px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Range"
                  value={highest - lowest}
                  valueStyle={{ fontSize: '18px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Mode"
                  value={gradeValues.sort((a,b) =>
                    gradeValues.filter(v => v===a).length - gradeValues.filter(v => v===b).length
                  ).pop()}
                  valueStyle={{ fontSize: '18px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Grade Distribution Table */}
      <Card title="Grade Distribution" size="small">
        <Table
          columns={distributionColumns}
          dataSource={distributionData}
          rowKey="range"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default GradeStats;
