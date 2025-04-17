import React, { useState, useEffect } from 'react';
import { TextField, Button, Card, CardContent, Typography, Box, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const ResetPassword = () => {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [checkingMfa, setCheckingMfa] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get the username from the query params if available
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const usernameFromQuery = queryParams.get('username');
    if (usernameFromQuery) {
      setUsername(usernameFromQuery);
    }
  }, [location]);

  useEffect(() => {
    if (username) {
      setCheckingMfa(true);
      fetch(`http://localhost:8080/mfa/status/${username}`)
        .then(res => res.json())
        .then(data => {
          setMfaEnabled(!!data.mfaEnabled);
          setCheckingMfa(false);
        })
        .catch(() => {
          setMfaEnabled(false);
          setCheckingMfa(false);
        });
    }
  }, [username]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setLoading(false);
      setError('Passwords do not match.');
      return;
    }
    if (mfaEnabled && !mfaCode) {
      setLoading(false);
      setError('MFA code is required.');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword, code: mfaCode }),
      });

      setLoading(false);

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000); // Redirect to login page after success
      } else {
        const errorData = await response.text();
        setError(errorData || 'Error resetting password.');
      }
    } catch (err) {
      setLoading(false);
      setError('Something went wrong. Please try again later.');
    }
  };

  const handleToggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card sx={{ width: '100%', maxWidth: 400, boxShadow: 3, borderRadius: 4, padding: 2, backgroundColor: '#fff' }}>
        <CardContent>
          <Typography variant="h5" component="h2" textAlign="center" sx={{ marginBottom: '1rem' }}>
            Reset Password
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Username" value={username} onChange={e => setUsername(e.target.value)} disabled sx={{ marginBottom: '1rem' }} />
            <TextField
              fullWidth
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              sx={{ marginBottom: '1rem' }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="toggle password visibility" onClick={handleToggleNewPasswordVisibility} edge="end">
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              sx={{ marginBottom: '1rem' }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="toggle confirm password visibility" onClick={handleToggleConfirmPasswordVisibility} edge="end">
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {checkingMfa && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <CircularProgress size={20} />
                <Typography sx={{ ml: 1 }}>Checking MFA...</Typography>
              </Box>
            )}
            {mfaEnabled && !checkingMfa && (
              <TextField
                fullWidth
                label="MFA Code"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                sx={{ marginBottom: '1rem' }}
              />
            )}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Button fullWidth variant="contained" color="primary" type="submit">
                Reset Password
              </Button>
            )}
            {error && (
              <Typography color="error" textAlign="center" sx={{ marginTop: '1rem' }}>
                {error}
              </Typography>
            )}
            {success && (
              <Typography color="primary" textAlign="center" sx={{ marginTop: '1rem' }}>
                Password reset successful! Redirecting to login...
              </Typography>
            )}
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPassword;
