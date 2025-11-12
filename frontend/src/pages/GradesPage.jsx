/**
 * GradesPage Component - Full CRUD Implementation
 * ================================================
 * Grades management page with Add/Edit/Delete functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import * as gradeService from '../services/gradeService';

const GradesPage = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gradeToDelete, setGradeToDelete] = useState(null);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    score: '',
    grade_type: 'Assignment',
    semester: '1',
    graded_date: new Date().toISOString().split('T')[0],
    notes: '',
    weight: 10,
    is_published: false
  });

  // Fetch grades on component mount
  useEffect(() => {
    fetchGrades();
  }, []);

  /**
   * Fetch all grades from API
   */
  const fetchGrades = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await gradeService.getAllGrades();

      // Handle backend response structure: { success: true, data: { grades: [...], pagination: {...} } }
      if (response && response.data) {
        const gradesData = Array.isArray(response.data.grades) ? response.data.grades :
                          Array.isArray(response.data) ? response.data :
                          [];
        setGrades(gradesData);
      } else {
        setGrades([]);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
      setError('Failed to load grades. Please try again.');
      setGrades([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Add Grade
   */
  const handleAddGrade = () => {
    setSelectedGrade(null);
    setFormData({
      student_id: '',
      course_id: '',
      score: '',
      grade_type: 'Assignment',
      semester: '1',
      graded_date: new Date().toISOString().split('T')[0],
      notes: '',
      weight: 10,
      is_published: false
    });
    setDialogOpen(true);
  };

  /**
   * Handle Edit Grade
   */
  const handleEditGrade = async (gradeId) => {
    try {
      setLoading(true);
      const response = await gradeService.getGradeById(gradeId);

      if (response && response.data) {
        setSelectedGrade(response.data);
        setFormData({
          student_id: response.data.student_id || '',
          course_id: response.data.course_id || '',
          score: response.data.score || '',
          grade_type: response.data.grade_type || 'Assignment',
          semester: response.data.semester || '1',
          graded_date: response.data.graded_date ? response.data.graded_date.split('T')[0] : new Date().toISOString().split('T')[0],
          notes: response.data.notes || '',
          weight: response.data.weight || 10,
          is_published: response.data.is_published || false
        });
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching grade for edit:', error);
      setError('Failed to load grade data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Delete Grade
   */
  const handleDeleteClick = (grade) => {
    setGradeToDelete(grade);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!gradeToDelete) return;

    try {
      setLoading(true);
      await gradeService.deleteGrade(gradeToDelete.id);
      setError('');
      fetchGrades(); // Refresh list
      setDeleteDialogOpen(false);
      setGradeToDelete(null);
    } catch (error) {
      console.error('Error deleting grade:', error);
      setError('Failed to delete grade');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Form Submit (Create or Update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.student_id || !formData.course_id || !formData.score) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.score) < 0 || parseFloat(formData.score) > 10) {
      setError('Score must be between 0 and 10');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (selectedGrade) {
        // Update existing grade
        await gradeService.updateGrade(selectedGrade.id, formData);
      } else {
        // Create new grade
        await gradeService.createGrade(formData);
      }

      setDialogOpen(false);
      fetchGrades(); // Refresh list
    } catch (error) {
      console.error('Error saving grade:', error);
      setError(selectedGrade ? 'Failed to update grade' : 'Failed to create grade');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  /**
   * Filter grades
   */
  const filteredGrades = grades.filter(grade => {
    const matchesSearch =
      grade.student?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.student?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.course?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = !filterClass || grade.course?.class?.name === filterClass;
    const matchesSemester = !filterSemester || grade.semester === filterSemester;

    return matchesSearch && matchesClass && matchesSemester;
  });

  /**
   * Get grade letter based on score
   */
  const getGradeLetter = (score) => {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'C+';
    if (score >= 65) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  /**
   * Get grade color based on score
   */
  const getGradeColor = (score) => {
    if (score >= 85) return 'success';
    if (score >= 75) return 'primary';
    if (score >= 65) return 'warning';
    return 'error';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Grades
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage student grades and academic performance
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search grades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Class</InputLabel>
              <Select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                label="Class"
              >
                <MenuItem value="">All Classes</MenuItem>
                {Array.from(new Set(grades.map(g => g.course?.class?.name).filter(Boolean))).map(className => (
                  <MenuItem key={className} value={className}>{className}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Semester</InputLabel>
              <Select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                label="Semester"
              >
                <MenuItem value="">All Semesters</MenuItem>
                <MenuItem value="1">Semester 1</MenuItem>
                <MenuItem value="2">Semester 2</MenuItem>
                <MenuItem value="Final">Final</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddGrade}
            >
              Add Grade
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card>
        {loading && !dialogOpen ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Semester</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredGrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No grades found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell>
                        {grade.student ? `${grade.student.first_name} ${grade.student.last_name}` : 'N/A'}
                      </TableCell>
                      <TableCell>{grade.course?.name || 'N/A'}</TableCell>
                      <TableCell>{grade.grade_type}</TableCell>
                      <TableCell>
                        <Chip
                          label={getGradeLetter(grade.score)}
                          color={getGradeColor(grade.score)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{grade.score}</TableCell>
                      <TableCell>{grade.semester}</TableCell>
                      <TableCell>
                        {grade.graded_date ? new Date(grade.graded_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => handleEditGrade(grade.id)}
                          color="primary"
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteClick(grade)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Add/Edit Grade Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedGrade ? 'Edit Grade' : 'Add New Grade'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Student ID"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleInputChange}
                  required
                  helperText="Enter student UUID"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Course ID"
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleInputChange}
                  required
                  helperText="Enter course UUID"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Score"
                  name="score"
                  type="number"
                  value={formData.score}
                  onChange={handleInputChange}
                  required
                  inputProps={{ min: 0, max: 10, step: 0.1 }}
                  helperText="Score between 0 and 10"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Grade Type</InputLabel>
                  <Select
                    name="grade_type"
                    value={formData.grade_type}
                    onChange={handleInputChange}
                    label="Grade Type"
                  >
                    <MenuItem value="Quiz">Quiz</MenuItem>
                    <MenuItem value="Test">Test</MenuItem>
                    <MenuItem value="Assignment">Assignment</MenuItem>
                    <MenuItem value="Project">Project</MenuItem>
                    <MenuItem value="Midterm">Midterm</MenuItem>
                    <MenuItem value="Final">Final</MenuItem>
                    <MenuItem value="Participation">Participation</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    label="Semester"
                  >
                    <MenuItem value="1">Semester 1</MenuItem>
                    <MenuItem value="2">Semester 2</MenuItem>
                    <MenuItem value="Final">Final</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Graded Date"
                  name="graded_date"
                  type="date"
                  value={formData.graded_date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Weight (%)"
                  name="weight"
                  type="number"
                  value={formData.weight}
                  onChange={handleInputChange}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <label>
                    <input
                      type="checkbox"
                      name="is_published"
                      checked={formData.is_published}
                      onChange={handleInputChange}
                    />
                    {' '}Publish grade (visible to student)
                  </label>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : (selectedGrade ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Grade</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this grade? This action cannot be undone.
          </Typography>
          {gradeToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Student:</strong> {gradeToDelete.Student ? `${gradeToDelete.Student.first_name} ${gradeToDelete.Student.last_name}` : 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Course:</strong> {gradeToDelete.Course?.name || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Score:</strong> {gradeToDelete.score}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GradesPage;
