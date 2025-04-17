import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Snackbar, Alert, Link, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getAllEmployees } from '../services/employeeService';
import { getAllDepartments } from '../services/departmentService';
import { uploadProfileImage, getProfileImage } from '../services/profileService';

const Profile = ({ theme }) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [averageAge, setAverageAge] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      if (token) {
        setIsLoggedIn(true);
      } else {
        setShowSnackbar(true); // Show the snackbar notification
      }
    };

    checkLoginStatus();
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const employees = await getAllEmployees();
        const departments = await getAllDepartments();
        setEmployeeCount(employees.length);
        setDepartmentCount(departments.length);

        const totalAge = employees.reduce((sum, emp) => sum + emp.age, 0);
        const avgAge = employees.length ? (totalAge / employees.length).toFixed(1) : 0;
        setAverageAge(avgAge);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Fetch MFA status for the user
    const fetchMfaStatus = async () => {
      const username = localStorage.getItem('EMSusername');
      if (!username) return;
      try {
        const res = await fetch(`http://localhost:8080/mfa/status/${username}`);
        if (res.ok) {
          const data = await res.json();
          setMfaEnabled(!!data.mfaEnabled);
        } else {
          setMfaEnabled(false);
        }
      } catch (e) {
        setMfaEnabled(false);
      }
    };
    fetchMfaStatus();
  }, []);

  useEffect(() => {
    // Fetch profile image
    const fetchProfileImage = async () => {
      const username = localStorage.getItem('EMSusername');
      if (!username) return;
      try {
        const img = await getProfileImage(username);
        setProfileImage(img);
      } catch (e) {
        setProfileImage(null);
      }
    };
    fetchProfileImage();
  }, []);

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
    navigate('/login', { replace: true });
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const handleOpenMfaSetup = async () => {
    setMfaError('');
    setMfaSuccess('');
    setMfaCode('');
    setQrUrl('');
    setMfaSecret('');
    setMfaSetupOpen(true);
    try {
      const username = localStorage.getItem('EMSusername');
      const res = await fetch('http://localhost:8080/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (res.ok) {
        setQrUrl(data.qrUrl);
        setMfaSecret(data.secret);
      } else {
        setMfaError(data);
      }
    } catch (e) {
      setMfaError('Failed to start MFA setup.');
    }
  };

  const handleVerifyMfa = async () => {
    setMfaError('');
    setMfaSuccess('');
    try {
      const username = localStorage.getItem('EMSusername');
      const res = await fetch('http://localhost:8080/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code: mfaCode })
      });
      const data = await res.text();
      if (res.ok) {
        setMfaSuccess('MFA enabled successfully!');
        setMfaEnabled(true);
        setMfaSetupOpen(false);
      } else {
        setMfaError(data);
      }
    } catch (e) {
      setMfaError('Failed to verify MFA code.');
    }
  };

  const handleDisableMfa = async () => {
    setDisableLoading(true);
    setMfaError('');
    setMfaSuccess('');
    try {
      const username = localStorage.getItem('EMSusername');
      const res = await fetch('http://localhost:8080/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (res.ok) {
        setMfaEnabled(false);
        setMfaSuccess('MFA disabled.');
      } else {
        setMfaError('Failed to disable MFA.');
      }
    } catch (e) {
      setMfaError('Failed to disable MFA.');
    }
    setDisableLoading(false);
  };

  const handleImageChange = async (e) => {
    setUploadError('');
    setUploadSuccess('');
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setUploading(true);
      try {
        const username = localStorage.getItem('EMSusername');
        await uploadProfileImage(username, base64String);
        setProfileImage(base64String);
        setUploadSuccess('Profile image updated!');
      } catch (err) {
        setUploadError('Failed to upload image.');
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  if (!isLoggedIn) {
    return (
      <>
        <Snackbar open={showSnackbar} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ mt: 9 }}>
          <Alert onClose={handleCloseSnackbar} severity="warning" sx={{ width: '100%' }}>
            You must be logged in to view your profile.{' '}
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
        <div style={{ height: 20 }}></div>
      </>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: theme === 'dark' ? '#222' : '#f4f4f4',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const profileData = {
    username: localStorage.getItem('EMSusername') || 'John Doe',
    employeeCount,
    departmentCount,
    averageAge,
  };

  const avatarUrl = '/OIP.jpg';

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: theme === 'dark' ? '#222' : '#f4f4f4',
        paddingTop: 8,
        paddingBottom: 20,
        transition: 'background-color 0.3s ease',
      }}
    >
      <Typography variant="h4" sx={{ textAlign: 'center', marginBottom: 4 }}>
        Welcome, {profileData.username}!
      </Typography>

      <Box
        sx={{
          backgroundColor: theme === 'dark' ? '#333' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000',
          padding: 4,
          borderRadius: 2,
          width: '400px',
          textAlign: 'center',
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
          transition: 'background-color 0.3s ease',
        }}
      >
        <Box
          sx={{
            width: 150,
            height: 150,
            borderRadius: '50%',
            overflow: 'hidden',
            margin: '0 auto 16px',
            border: '3px solid #3f51b5',
            position: 'relative',
          }}
        >
          <img
            src={profileImage || '/OIP.jpg'}
            alt="User Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <input
            type="file"
            accept="image/*"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
            onChange={handleImageChange}
            title="Upload new profile image"
          />
        </Box>
        {uploading && <Typography sx={{ color: 'blue', mb: 1 }}>Uploading...</Typography>}
        {uploadError && <Typography sx={{ color: 'red', mb: 1 }}>{uploadError}</Typography>}
        {uploadSuccess && <Typography sx={{ color: 'green', mb: 1 }}>{uploadSuccess}</Typography>}

        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          Profile Information
        </Typography>

        <Typography variant="body1" sx={{ mb: 1, fontSize: '16px' }}>
          <strong>Username:</strong> {profileData.username}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>Total Employees:</strong> {profileData.employeeCount}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>Departments:</strong> {profileData.departmentCount}
        </Typography>

        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>Average Age:</strong> {profileData.averageAge}
        </Typography>

        <div style={{ height: 20, borderBottom: '1px solid #ccc' }}></div>

        <Typography variant="body1" sx={{ mt: 2 }}>
          <strong>Thank you for using our platform today! 🚀</strong>
        </Typography>

        {/* MFA Section */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Multi-Factor Authentication (MFA)</Typography>
          {mfaEnabled ? (
            <>
              <Typography color="success.main" sx={{ mt: 1 }}>MFA is enabled on your account.</Typography>
              <Button variant="outlined" color="error" sx={{ mt: 2 }} onClick={handleDisableMfa} disabled={disableLoading}>
                {disableLoading ? 'Disabling...' : 'Disable MFA'}
              </Button>
            </>
          ) : (
            <>
              <Typography color="warning.main" sx={{ mt: 1 }}>MFA is not enabled.</Typography>
              <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleOpenMfaSetup}>
                Setup MFA
              </Button>
            </>
          )}
          {mfaError && <Typography color="error" sx={{ mt: 1 }}>{mfaError}</Typography>}
          {mfaSuccess && <Typography color="success.main" sx={{ mt: 1 }}>{mfaSuccess}</Typography>}
        </Box>

        {/* MFA Setup Dialog */}
        <Dialog open={mfaSetupOpen} onClose={() => setMfaSetupOpen(false)}>
          <DialogTitle>Setup MFA</DialogTitle>
          <DialogContent>
            {qrUrl && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img src={qrUrl} alt="MFA QR Code" style={{ width: 200, height: 200 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>Scan this QR code with Google Authenticator or a compatible app.</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Or enter this secret manually: <b>{mfaSecret}</b></Typography>
              </Box>
            )}
            <TextField
              fullWidth
              label="Enter code from app"
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value)}
              sx={{ marginBottom: '1rem' }}
            />
            {mfaError && <Typography color="error">{mfaError}</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMfaSetupOpen(false)}>Cancel</Button>
            <Button onClick={handleVerifyMfa} variant="contained">Verify & Enable</Button>
          </DialogActions>
        </Dialog>

        <Button variant="contained" color="secondary" sx={{ mt: 3 }} onClick={handleLogout}>
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default Profile;
