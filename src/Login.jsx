import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Box, 
  Divider, 
  Alert,
  Zoom,
  Fade,
  Avatar
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LoginIcon from '@mui/icons-material/Login';
import { supabase } from './supabase';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    
    // Check localStorage for existing session
    const savedUser = localStorage.getItem('pollUser');
    if (savedUser) {
      onLogin(JSON.parse(savedUser));
    }
  }, [onLogin]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.toLowerCase())
        .eq('password', password)
        .single();
      
      if (error || !data) {
        throw new Error('Invalid username or password');
      }
      
      // Save to localStorage for persistence
      localStorage.setItem('pollUser', JSON.stringify(data));
      
      setSuccess(`Welcome back, ${username}!`);
      setTimeout(() => {
        onLogin(data);
      }, 1000);
      
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (username.includes(' ')) {
      setError('Username cannot contain spaces');
      setLoading(false);
      return;
    }

    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      if (existingUser) {
        throw new Error('Username already taken');
      }

      // Create user in database
      const { error } = await supabase
        .from('users')
        .insert([{ username: username.toLowerCase(), password }]);

      if (error) throw error;
      
      setSuccess(`Account created! You can now sign in with username: ${username}`);
      setUsername('');
      setPassword('');
      setIsSignUp(false);
      setLoading(false);
      
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccess('');
    setUsername('');
    setPassword('');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0A2A44 0%, #1A4B7A 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 20% 30%, rgba(52,152,219,0.15) 0%, transparent 50%)',
        pointerEvents: 'none'
      }
    }}>
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Zoom in={true} timeout={600}>
          <Paper elevation={24} sx={{ 
            p: 5, 
            borderRadius: 4,
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 20px 40px rgba(0,50,100,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Logo and Title */}
            <Fade in={true} timeout={1000}>
              <Box sx={{ textAlign: 'center', mb: 4, position: 'relative', zIndex: 1 }}>
                <Avatar 
                  sx={{ 
                    width: 90, 
                    height: 90, 
                    margin: '0 auto 20px',
                    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                    boxShadow: '0 10px 30px rgba(52,152,219,0.4)',
                    animation: 'float 3s ease-in-out infinite',
                    '@keyframes float': {
                      '0%': { transform: 'translateY(0px)' },
                      '50%': { transform: 'translateY(-10px)' },
                      '100%': { transform: 'translateY(0px)' }
                    }
                  }}
                >
                  <Typography variant="h2" sx={{ fontSize: '45px' }}>
                    📊
                  </Typography>
                </Avatar>
                
                <Typography variant="h2" sx={{ 
                  fontWeight: 800, 
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #E0F2FE 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                  letterSpacing: 3,
                  fontSize: '3rem',
                  textShadow: '0 2px 10px rgba(52,152,219,0.3)'
                }}>
                  POLLS
                </Typography>
                
                <Typography variant="overline" sx={{ 
                  color: '#87CEEB', 
                  letterSpacing: 4,
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}>
                  {greeting}
                </Typography>
                
                <Typography variant="body1" sx={{ 
                  color: '#B0E0F0', 
                  mt: 2,
                  fontSize: '1rem',
                  opacity: 0.9
                }}>
                  Create polls, quizzes and ratings. Get real-time results.
                </Typography>
              </Box>
            </Fade>

            {error && (
              <Zoom in={true}>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3, 
                    backgroundColor: 'rgba(255,107,107,0.15)', 
                    color: '#FF6B6B',
                    border: '1px solid rgba(255,107,107,0.3)',
                    borderRadius: 2,
                    backdropFilter: 'blur(10px)',
                    '& .MuiAlert-icon': {
                      color: '#FF6B6B'
                    }
                  }}
                >
                  {error}
                </Alert>
              </Zoom>
            )}

            {success && (
              <Zoom in={true}>
                <Alert 
                  severity="success" 
                  sx={{ 
                    mb: 3, 
                    backgroundColor: 'rgba(78,205,196,0.15)', 
                    color: '#4ECDC4',
                    border: '1px solid rgba(78,205,196,0.3)',
                    borderRadius: 2,
                    backdropFilter: 'blur(10px)',
                    '& .MuiAlert-icon': {
                      color: '#4ECDC4'
                    }
                  }}
                >
                  {success}
                </Alert>
              </Zoom>
            )}

            <Fade in={true} timeout={1000}>
              <Divider sx={{ 
                mb: 3, 
                '&::before, &::after': { 
                  borderColor: 'rgba(255,255,255,0.2)'
                }
              }}>
                <Typography sx={{ 
                  color: '#87CEEB', 
                  px: 2,
                  fontSize: '0.85rem',
                  letterSpacing: 2
                }}>
                  {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
                </Typography>
              </Divider>
            </Fade>

            <Box component="form" onSubmit={isSignUp ? handleSignUp : handleSignIn}>
              <Box sx={{ position: 'relative', mb: 2 }}>
                <PersonIcon sx={{ 
                  position: 'absolute', 
                  left: 14, 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#87CEEB',
                  zIndex: 1,
                  fontSize: '1.3rem'
                }} />
                <TextField
                  fullWidth
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                  variant="outlined"
                  disabled={loading}
                  helperText={isSignUp ? "Minimum 3 characters, no spaces" : ""}
                  sx={{
                    '& .MuiInputLabel-root': { 
                      color: '#B0E0F0',
                      '&.Mui-focused': {
                        color: '#87CEEB'
                      }
                    },
                    '& .MuiInputBase-input': { 
                      color: 'white',
                      paddingLeft: '48px'
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { 
                        borderColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 2,
                        borderWidth: '2px'
                      },
                      '&:hover fieldset': { 
                        borderColor: '#87CEEB',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3498db',
                        boxShadow: '0 0 0 4px rgba(52,152,219,0.2)'
                      }
                    },
                    '& .MuiFormHelperText-root': { 
                      color: '#B0E0F0'
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ position: 'relative', mb: 1 }}>
                <LockIcon sx={{ 
                  position: 'absolute', 
                  left: 14, 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#87CEEB',
                  zIndex: 1,
                  fontSize: '1.3rem'
                }} />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  variant="outlined"
                  disabled={loading}
                  helperText={isSignUp ? "Minimum 6 characters" : ""}
                  sx={{
                    '& .MuiInputLabel-root': { 
                      color: '#B0E0F0',
                      '&.Mui-focused': {
                        color: '#87CEEB'
                      }
                    },
                    '& .MuiInputBase-input': { 
                      color: 'white',
                      paddingLeft: '48px'
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { 
                        borderColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 2,
                        borderWidth: '2px'
                      },
                      '&:hover fieldset': { 
                        borderColor: '#87CEEB',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3498db',
                        boxShadow: '0 0 0 4px rgba(52,152,219,0.2)'
                      }
                    },
                    '& .MuiFormHelperText-root': { 
                      color: '#B0E0F0'
                    }
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: isSignUp ? 4 : 2 }}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={isSignUp ? <HowToRegIcon /> : <LoginIcon />}
                  sx={{ 
                    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                    color: 'white',
                    fontWeight: 'bold',
                    py: 1.8,
                    borderRadius: 3,
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    boxShadow: '0 8px 20px rgba(52,152,219,0.4)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #45a0e0 0%, #3490c0 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 30px rgba(52,152,219,0.6)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Button>
              </Box>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  onClick={toggleMode}
                  disabled={loading}
                  sx={{ 
                    color: '#87CEEB',
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    padding: '8px 16px',
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(135,206,235,0.1)',
                      transform: 'scale(1.02)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isSignUp 
                    ? '✨ Already have an account? Sign In' 
                    : '🆕 New user? Create an account'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Zoom>

        {loading && (
          <Box sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(10,42,68,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999
          }}>
            <Box sx={{
              width: 56,
              height: 56,
              border: '4px solid rgba(52,152,219,0.2)',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }} />
          </Box>
        )}

        <Fade in={true} timeout={1500}>
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              textAlign: 'center', 
              mt: 3, 
              color: 'rgba(135,206,235,0.5)',
              letterSpacing: 1,
              fontSize: '0.8rem'
            }}
          >
            ⚡ Real-time polls, quizzes & ratings
          </Typography>
        </Fade>
      </Container>
    </Box>
  );
}

export default Login;