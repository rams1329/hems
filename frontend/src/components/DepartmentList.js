import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllDepartments, deleteDepartment } from '../services/departmentService';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TablePagination,
  TextField,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';

const DepartmentList = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(false);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [selected, setSelected] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteError, setDeleteError] = useState('');

  // Check login status
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    } else {
      setShowSnackbar(true);
    }
  }, [navigate]);

  // Fetch departments data if logged in
  useEffect(() => {
    if (isLoggedIn) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const data = await getAllDepartments();
          setDepartments(data);
        } catch (error) {
          console.error('Error fetching departments:', error);
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [isLoggedIn]);

  const handleDelete = async id => {
    setDeletingDepartmentId(id);
    try {
      await deleteDepartment(id);
      setDepartments(prevDepartments => prevDepartments.filter(department => department.id !== id));
    } catch (error) {
      console.error('Error deleting department:', error);
    }
    setDeletingDepartmentId(null);
  };

  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset page to 0 whenever search term changes
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page to 0 when rows per page changes
  };

  const filteredDepartments = departments.filter(department => department.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(filteredDepartments.map(d => d.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id) => (event) => {
    if (event.target.checked) {
      setSelected(prev => [...prev, id]);
    } else {
      setSelected(prev => prev.filter(sid => sid !== id));
    }
  };

  const handleDeleteSelected = async () => {
    setDeletingSelected(true);
    setDeleteProgress(0);
    setDeleteError('');
    let deleted = 0;
    for (const id of selected) {
      try {
        await deleteDepartment(id);
        deleted++;
        setDeleteProgress(Math.round((deleted / selected.length) * 100));
      } catch (err) {
        setDeleteError('Error deleting some departments.');
      }
    }
    setDeletingSelected(false);
    setSelected([]);
    // Refresh departments list
    const data = await getAllDepartments();
    setDepartments(data);
  };

  if (loading) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
    navigate('/login', { replace: true });
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <Box>
      <Snackbar open={showSnackbar} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ mt: 9 }}>
        <Alert onClose={handleCloseSnackbar} severity="warning" sx={{ width: '100%' }}>
          You must be logged in to access the employee list.{' '}
          <span
            onClick={handleLoginRedirect}
            style={{
              color: '#3f51b5',
              textDecoration: 'underline',
              cursor: 'pointer',
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.target.style.color = '#f57c00')}
            onMouseLeave={e => (e.target.style.color = '#3f51b5')}
          >
            Login
          </span>
        </Alert>
      </Snackbar>

      <h2>Departments</h2>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteSelected}
          disabled={deletingSelected || selected.length === 0}
          sx={{ mb: 1 }}
        >
          Delete Selected
        </Button>
        {deletingSelected && (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <span>Deleting... {deleteProgress}%</span>
          </Box>
        )}
        {deleteError && (
          <Alert severity="error" sx={{ ml: 2 }}>{deleteError}</Alert>
        )}
      </Box>
      <Button variant="contained" component={Link} to="/add-department" sx={{ marginBottom: '1rem' }}>
        Add Department
      </Button>
      <TextField
        label="Search for a department"
        variant="outlined"
        value={searchTerm}
        onChange={handleSearchChange}
        sx={{ marginBottom: '1rem', width: '100%' }}
      />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <input
                  type="checkbox"
                  checked={selected.length > 0 && selected.length === filteredDepartments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length}
                  indeterminate={selected.length > 0 && selected.length < filteredDepartments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length}
                  onChange={handleSelectAll}
                  disabled={deletingSelected}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDepartments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(department => (
              <TableRow key={department.id}>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selected.includes(department.id)}
                    onChange={handleSelectOne(department.id)}
                    disabled={deletingSelected}
                  />
                </TableCell>
                <TableCell>{department.name}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to={`/edit-department/${department.id}`}
                    sx={{ marginRight: '0.5rem', marginBottom: '0.25rem' }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleDelete(department.id)}
                    sx={{ marginBottom: '0.25rem' }}
                    disabled={deletingDepartmentId === department.id || deletingSelected}
                    startIcon={deletingDepartmentId === department.id ? <CircularProgress size={20} /> : null}
                  >
                    {deletingDepartmentId === department.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredDepartments.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default DepartmentList;
