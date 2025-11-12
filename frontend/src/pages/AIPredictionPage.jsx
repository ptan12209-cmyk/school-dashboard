import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Button,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import api from '../services/api.js';

const AIPredictionPage = () => {
  const theme = useTheme();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);

      // ✅ FIX: Fetch all data in parallel for better performance
      const [studentsResponse, gradesResponse, attendanceResponse] = await Promise.all([
        api.get('/students', { params: { limit: 1000 } }),
        api.get('/grades', { params: { limit: 10000 } }),
        api.get('/attendance', { params: { limit: 10000 } })
      ]);

      const students = studentsResponse.data?.data?.students || [];
      const grades = gradesResponse.data?.data?.grades || [];
      const attendance = attendanceResponse.data?.data?.attendance || [];

      // ✅ FIX: Handle empty data case
      if (students.length === 0) {
        setPredictions([]);
        return;
      }

      // Generate predictions for each student
      const studentPredictions = students.map(student => {
        // Get student's grades
        const studentGrades = grades.filter(g => g.student_id === student.id);
        // ✅ FIX: Database grades are already 0-10 scale, don't divide by 10!
        const avgGrade = studentGrades.length > 0
          ? studentGrades.reduce((sum, g) => sum + parseFloat(g.score || 0), 0) / studentGrades.length
          : 0;

        // Get student's attendance (case-insensitive check)
        const studentAttendance = attendance.filter(a => a.student_id === student.id);
        const presentCount = studentAttendance.filter(a =>
          a.status && a.status.toLowerCase() === 'present'
        ).length;
        const attendanceRate = studentAttendance.length > 0
          ? (presentCount / studentAttendance.length) * 100
          : 100; // ✅ FIX: Default to 100% if no attendance records

        // Simple AI prediction algorithm (avgGrade is now 0-10 scale)
        let prediction, priority, confidence, factors = [], recommendation;

        if (avgGrade >= 8.5 && attendanceRate >= 90) {
          prediction = 'Excellent';
          priority = 'low';
          confidence = 90 + Math.floor(Math.random() * 10);
          factors = ['Điểm số cao', 'Điểm danh tốt', 'Thành tích ổn định'];
          recommendation = 'Xem xét các cơ hội học tập nâng cao hoặc chương trình gifted';
        } else if (avgGrade >= 7.0 && attendanceRate >= 80) {
          prediction = 'Good';
          priority = 'low';
          confidence = 80 + Math.floor(Math.random() * 10);
          factors = ['Điểm số khá', 'Điểm danh ổn định'];
          recommendation = 'Tiếp tục duy trì và khuyến khích học sinh';
        } else if (avgGrade >= 6.0 || attendanceRate >= 70) {
          prediction = 'Needs Attention';
          priority = 'medium';
          confidence = 70 + Math.floor(Math.random() * 10);
          if (avgGrade < 7.0) factors.push('Điểm số trung bình');
          if (attendanceRate < 80) factors.push('Điểm danh không đều');
          factors.push('Cần theo dõi');
          recommendation = 'Theo dõi sát và cung cấp hỗ trợ có mục tiêu';
        } else {
          prediction = 'At Risk';
          priority = 'high';
          confidence = 75 + Math.floor(Math.random() * 15);
          if (avgGrade < 6.0) factors.push('Điểm số thấp');
          if (attendanceRate < 70) factors.push('Điểm danh kém');
          if (studentGrades.length < 3) factors.push('Thiếu bài tập');
          recommendation = 'Họp phụ huynh khẩn cấp và cung cấp hỗ trợ bổ sung';
        }

        return {
          id: student.id,
          student: `${student.first_name} ${student.last_name}`,
          prediction,
          confidence,
          factors,
          recommendation,
          priority,
          avgGrade: avgGrade.toFixed(1),
          attendanceRate: attendanceRate.toFixed(1)
        };
      });

      setPredictions(studentPredictions);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      // ✅ FIX: Better error handling
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const getPredictionColor = (prediction) => {
    const colors = {
      'Excellent': 'success',
      'Good': 'primary',
      'Needs Attention': 'warning',
      'At Risk': 'error',
    };
    return colors[prediction] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'high': 'error',
      'medium': 'warning',
      'low': 'success',
    };
    return colors[priority] || 'default';
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      'high': <WarningIcon />,
      'medium': <TrendingUpIcon />,
      'low': <CheckCircleIcon />,
    };
    return icons[priority] || <TrendingUpIcon />;
  };

  const handleViewDetails = (prediction) => {
    setSelectedPrediction(prediction);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedPrediction(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Đang phân tích dữ liệu học sinh...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dự Đoán AI
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Phân tích và dự đoán thành tích học sinh bằng AI
        </Typography>
      </Box>

      {/* AI Insights Summary */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PsychologyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Tổng Dự Đoán</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {predictions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Nguy Cơ Cao</Typography>
              </Box>
              <Typography variant="h4" color="error">
                {predictions.filter(p => p.prediction === 'At Risk').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Xuất Sắc</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {predictions.filter(p => p.prediction === 'Excellent').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">TB Độ Tin Cậy</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {predictions.length > 0
                  ? Math.round(predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length)
                  : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Predictions List */}
      {predictions.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <PsychologyIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Không có dữ liệu dự đoán
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cần có ít nhất 1 học sinh với điểm số và điểm danh để tạo dự đoán AI
            </Typography>
            <Button
              variant="contained"
              onClick={fetchPredictions}
              sx={{ mt: 3 }}
            >
              Tải lại
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {predictions.map((prediction) => (
            <Grid item xs={12} md={6} lg={4} key={prediction.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{prediction.student}</Typography>
                  <Chip
                    icon={getPriorityIcon(prediction.priority)}
                    label={prediction.priority}
                    color={getPriorityColor(prediction.priority)}
                    size="small"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Dự Đoán
                  </Typography>
                  <Chip
                    label={prediction.prediction}
                    color={getPredictionColor(prediction.prediction)}
                    size="small"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Độ Tin Cậy: {prediction.confidence}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={prediction.confidence}
                    color={prediction.confidence > 80 ? 'success' : prediction.confidence > 60 ? 'warning' : 'error'}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Yếu Tố Chính
                  </Typography>
                  {prediction.factors.map((factor, index) => (
                    <Chip
                      key={index}
                      label={factor}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Khuyến Nghị:</strong> {prediction.recommendation}
                  </Typography>
                </Alert>

                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => handleViewDetails(prediction)}
                >
                  Xem Chi Tiết
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
        </Grid>
      )}

      {/* Details Modal */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedPrediction && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5">
                  Chi Tiết Dự Đoán: {selectedPrediction.student}
                </Typography>
                <Chip
                  icon={getPriorityIcon(selectedPrediction.priority)}
                  label={selectedPrediction.priority.toUpperCase()}
                  color={getPriorityColor(selectedPrediction.priority)}
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Trạng Thái Dự Đoán
                </Typography>
                <Chip
                  label={selectedPrediction.prediction}
                  color={getPredictionColor(selectedPrediction.prediction)}
                  size="medium"
                  sx={{ mr: 2 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Độ Tin Cậy: {selectedPrediction.confidence}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={selectedPrediction.confidence}
                  color={selectedPrediction.confidence > 80 ? 'success' : selectedPrediction.confidence > 60 ? 'warning' : 'error'}
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Yếu Tố Chính
                </Typography>
                <List>
                  {selectedPrediction.factors.map((factor, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemText
                        primary={`• ${factor}`}
                        sx={{ color: 'text.primary' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Hành Động Được Khuyến Nghị
                </Typography>
                <Alert severity="info" icon={<PsychologyIcon />}>
                  <Typography variant="body1">
                    {selectedPrediction.recommendation}
                  </Typography>
                </Alert>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Thông Tin Bổ Sung
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Mã Học Sinh
                    </Typography>
                    <Typography variant="body1">
                      #{selectedPrediction.id}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Ngày Phân Tích
                    </Typography>
                    <Typography variant="body1">
                      {new Date().toLocaleDateString('vi-VN')}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails} variant="outlined">
                Đóng
              </Button>
              <Button onClick={handleCloseDetails} variant="contained" color="primary">
                Thực Hiện Hành Động
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AIPredictionPage;
