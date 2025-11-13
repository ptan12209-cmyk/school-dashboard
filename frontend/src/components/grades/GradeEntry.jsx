/**
 * GradeEntry.jsx - Grade Entry Form Component
 * ==========================================
 * Form for entering and updating student grades
 */

import React, { useState } from 'react';
import { 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  Button, 
  Card, 
  Row, 
  Col,
  DatePicker,
  message 
} from 'antd';
import { SaveOutlined, ClearOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

const GradeEntry = ({ onSubmit, initialValues = {}, students = [], subjects = [] }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Mock data if none provided
  const mockStudents = [
    { id: 1, name: 'Alice Johnson', class: '10A' },
    { id: 2, name: 'Bob Smith', class: '10A' },
    { id: 3, name: 'Carol Davis', class: '10B' },
  ];

  const mockSubjects = [
    { id: 1, name: 'Mathematics', code: 'MATH' },
    { id: 2, name: 'Science', code: 'SCI' },
    { id: 3, name: 'English', code: 'ENG' },
  ];

  const studentData = students.length > 0 ? students : mockStudents;
  const subjectData = subjects.length > 0 ? subjects : mockSubjects;

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(values);
        message.success('Grade saved successfully!');
        form.resetFields();
      } else {
        console.log('Grade data:', values);
        message.success('Grade saved successfully!');
      }
    } catch (error) {
      message.error('Failed to save grade');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  return (
    <Card title="Grade Entry" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialValues}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="studentId"
              label="Student"
              rules={[{ required: true, message: 'Please select a student' }]}
            >
              <Select
                placeholder="Select student"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {studentData.map(student => (
                  <Option key={student.id} value={student.id}>
                    {student.name} - {student.class}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="subjectId"
              label="Subject"
              rules={[{ required: true, message: 'Please select a subject' }]}
            >
              <Select placeholder="Select subject">
                {subjectData.map(subject => (
                  <Option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="grade"
              label="Grade"
              rules={[
                { required: true, message: 'Please enter a grade' },
                { type: 'number', min: 0, max: 10, message: 'Grade must be between 0 and 10' }
              ]}
            >
              <InputNumber
                min={0}
                max={10}
                precision={1}
                step={0.1}
                style={{ width: '100%' }}
                placeholder="Enter grade (0-10)"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="gradeType"
              label="Grade Type"
              rules={[{ required: true, message: 'Please select grade type' }]}
            >
              <Select placeholder="Select type">
                <Option value="quiz">Quiz</Option>
                <Option value="assignment">Assignment</Option>
                <Option value="midterm">Midterm Exam</Option>
                <Option value="final">Final Exam</Option>
                <Option value="project">Project</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: 'Please select a date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="comments"
          label="Comments"
        >
          <TextArea
            rows={3}
            placeholder="Optional comments about the grade..."
          />
        </Form.Item>

        <Form.Item>
          <Row gutter={8}>
            <Col>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
              >
                Save Grade
              </Button>
            </Col>
            <Col>
              <Button
                type="default"
                onClick={handleReset}
                icon={<ClearOutlined />}
              >
                Clear
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default GradeEntry;
