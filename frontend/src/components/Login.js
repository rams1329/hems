import React, { useState } from 'react';
import { TextField, Button, Card, CardContent, Typography, Box, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingLogin, setPendingLogin] = useState({});
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
      setLoading(false);
      if (response.ok) {
        if (data.mfaEnabled === true || data.mfaEnabled === 'true') {
          setMfaRequired(true);
          setPendingLogin({ username, password });
        } else {
          localStorage.setItem('token', data.token);
          localStorage.setItem('EMSusername', username);
          alert('Login successful. Welcome!');
          navigate('/dashboard');
        }
      } else if (data && typeof data === 'object' && data.mfaRequired) {
        setMfaRequired(true);
        setPendingLogin({ username, password });
      } else if (typeof data === 'string' && data.toLowerCase().includes('mfa')) {
        setMfaRequired(true);
        setPendingLogin({ username, password });
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setLoading(false);
      setError('Invalid credentials or our server is not currently active. Please try again later.');
    }
  };

  const handleMfaSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:8080/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingLogin, code: mfaCode }),
      });
      const data = await response.json();
      setLoading(false);
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('EMSusername', pendingLogin.username);
        alert('Login successful. Welcome!');
        navigate('/dashboard');
      } else {
        setError('Invalid MFA code. Please try again.');
      }
    } catch (err) {
      setLoading(false);
      setError('Invalid credentials or our server is not currently active. Please try again later.');
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card sx={{ width: '100%', maxWidth: 400, boxShadow: 3, borderRadius: 4, padding: 2, backgroundColor: '#fff' }}>
        <CardContent>
          <Typography variant="h5" component="h2" textAlign="center" sx={{ marginBottom: '1rem' }}>
            Login
          </Typography>
          {!mfaRequired ? (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                sx={{ marginBottom: '1rem' }}
                InputProps={{
                  style: {
                    fontFamily: 'Poppins, sans-serif',
                  },
                }}
              />
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                sx={{ marginBottom: '1rem' }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label="toggle password visibility" onClick={handleTogglePasswordVisibility} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  style: {
                    fontFamily: 'Poppins, sans-serif',
                  },
                }}
              />
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Button fullWidth variant="contained" color="primary" type="submit">
                  Login
                </Button>
              )}
              {error && (
                <Typography color="error" textAlign="center" sx={{ marginTop: '1rem' }}>
                  {error}
                </Typography>
              )}
              <Typography textAlign="center" sx={{ marginTop: '1rem' }}>
                Don't have an account?{' '}
                <Button color="primary" component="a" href="/register">
                  Register
                </Button>
              </Typography>
              <Typography textAlign="center" sx={{ marginTop: '0.5rem' }}>
                Forgot your password?{' '}
                <Button color="primary" component="a" href="/verify-username">
                  Reset Password
                </Button>
              </Typography>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit}>
              <TextField
                fullWidth
                label="MFA Code"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                sx={{ marginBottom: '1rem' }}
                InputProps={{
                  style: {
                    fontFamily: 'Poppins, sans-serif',
                  },
                }}
              />
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Button fullWidth variant="contained" color="primary" type="submit">
                  Verify MFA
                </Button>
              )}
              {error && (
                <Typography color="error" textAlign="center" sx={{ marginTop: '1rem' }}>
                  {error}
                </Typography>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
