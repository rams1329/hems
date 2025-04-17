import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllEmployees, deleteEmployee, addEmployee } from '../services/employeeService';
import { getAllDepartments } from '../services/departmentService';
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
import Papa from 'papaparse';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';

const EmployeeList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState('');
  const [selected, setSelected] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteError, setDeleteError] = useState('');
  const [importWarnings, setImportWarnings] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    } else {
      setShowSnackbar(true);
    }
  }, [navigate]);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const data = await getAllEmployees();
          setEmployees(data);
        } catch (error) {
          console.error('Error fetching employees:', error);
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [isLoggedIn]);

  const handleDelete = async id => {
    setDeletingEmployeeId(id);
    try {
      await deleteEmployee(id);
      setEmployees(prevEmployees => prevEmployees.filter(employee => employee.id !== id));
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
    setDeletingEmployeeId(null);
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

  const filteredEmployees = employees.filter(
    employee =>
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const csv = Papa.unparse(
      employees.map(e => ({
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        age: e.age,
        departmentId: e.department?.id || '',
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employees.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportProgress(0);
    setImportError('');
    setImportWarnings([]);
    try {
      const departments = await getAllDepartments();
      const validDeptIds = new Set(departments.map(d => String(d.id)));
      const text = await file.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data;
          let imported = 0;
          let warnings = [];
          for (const [i, row] of rows.entries()) {
            const deptId = String(row.departmentId).trim();
            if (!deptId || !validDeptIds.has(deptId)) {
              warnings.push(`Row ${i + 2}: Invalid or missing departmentId (${row.departmentId})`);
              continue;
            }
            try {
              const employee = {
                firstName: row.firstName,
                lastName: row.lastName,
                email: row.email,
                age: Number(row.age),
                department: { id: deptId },
              };
              await addEmployee(employee);
              imported++;
              setImportProgress(Math.round((imported / rows.length) * 100));
            } catch (err) {
              warnings.push(`Row ${i + 2}: Error importing employee (${row.email})`);
            }
          }
          setImporting(false);
          setImportProgress(100);
          setImportWarnings(warnings);
          const data = await getAllEmployees();
          setEmployees(data);
        },
        error: (err) => {
          setImportError('Failed to parse CSV.');
          setImporting(false);
        },
      });
    } catch (err) {
      setImportError('Failed to read file.');
      setImporting(false);
    }
  };

  // Get IDs of employees on the current page
  const currentPageEmployeeIds = filteredEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(e => e.id);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      // Add all current page employee IDs to selected (avoid duplicates)
      setSelected(prev => Array.from(new Set([...prev, ...currentPageEmployeeIds])));
    } else {
      // Remove all current page employee IDs from selected
      setSelected(prev => prev.filter(id => !currentPageEmployeeIds.includes(id)));
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
        await deleteEmployee(id);
        deleted++;
        setDeleteProgress(Math.round((deleted / selected.length) * 100));
      } catch (err) {
        setDeleteError('Error deleting some employees.');
      }
    }
    setDeletingSelected(false);
    setSelected([]);
    // Refresh employees list
    const data = await getAllEmployees();
    setEmployees(data);
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

      <h2>Employees</h2>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
          sx={{ mb: 1 }}
        >
          Export CSV
        </Button>
        <Button
          variant="contained"
          color="secondary"
          component="label"
          startIcon={<UploadIcon />}
          sx={{ mb: 1 }}
          disabled={importing}
        >
          Import CSV
          <input type="file" accept=".csv" hidden onChange={handleImportCSV} />
        </Button>
        {importing && (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <span>Importing... {importProgress}%</span>
          </Box>
        )}
        {importError && (
          <Alert severity="error" sx={{ ml: 2 }}>{importError}</Alert>
        )}
        {importWarnings.length > 0 && (
          <Alert severity="warning" sx={{ ml: 2, whiteSpace: 'pre-line' }}>
            Some rows were skipped or failed to import:\n{importWarnings.join('\n')}
          </Alert>
        )}
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
      <Button variant="contained" component={Link} to="/add-employee" sx={{ marginBottom: '1rem' }}>
        Add Employee
      </Button>
      <TextField
        label="Search for an employee..."
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
                  checked={currentPageEmployeeIds.length > 0 && currentPageEmployeeIds.every(id => selected.includes(id))}
                  {...(currentPageEmployeeIds.some(id => selected.includes(id)) && !currentPageEmployeeIds.every(id => selected.includes(id)) ? { indeterminate: true } : {})}
                  onChange={handleSelectAll}
                  disabled={deletingSelected}
                />
              </TableCell>
              <TableCell>First Name</TableCell>
              <TableCell>Last Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(employee => (
              <TableRow key={employee.id}>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selected.includes(employee.id)}
                    onChange={handleSelectOne(employee.id)}
                    disabled={deletingSelected}
                  />
                </TableCell>
                <TableCell>{employee.firstName}</TableCell>
                <TableCell>{employee.lastName}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to={`/edit-employee/${employee.id}`}
                    sx={{ marginRight: '0.5rem', marginBottom: '0.25rem' }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleDelete(employee.id)}
                    disabled={deletingEmployeeId === employee.id}
                    sx={{ marginBottom: '0.25rem' }}
                    startIcon={deletingEmployeeId === employee.id ? <CircularProgress size={20} /> : null}
                  >
                    {deletingEmployeeId === employee.id ? 'Deleting...' : 'Delete'}
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
        count={filteredEmployees.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default EmployeeList;
