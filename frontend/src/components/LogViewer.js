import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Select, MenuItem, FormControl, InputLabel, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { fetchLogs as fetchLogsService } from '../services/logService';

const LOG_ENDPOINT = '/api/employees/logs';

const LogViewer = () => {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState(200);
  const [error, setError] = useState('');
  const [parsedLogs, setParsedLogs] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async (linesCount = lines) => {
    setLoading(true);
    setError('');
    try {
      const text = await fetchLogsService(linesCount);
      const isHtml = text => /<\s*html/i.test(text);
      if (isHtml(text)) {
        setError('Received HTML instead of logs. Backend may be down or endpoint misconfigured.');
        setLogs('');
      } else {
        setLogs(text);
      }
    } catch (err) {
      setError('Could not fetch logs. ' + (err?.message || ''));
      setLogs('');
    }
    setLoading(false);
  };

  // Parse log lines for structured info
  useEffect(() => {
    if (!logs) {
      setParsedLogs([]);
      return;
    }
    const regex = /(?<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\s+(?<level>\w+)\s+\d+ --- .*User (?<user>\w+) (?<action>is creating|created|is updating|updated|is deleting|deleted|error creating|error updating|error deleting) (?<entity>employee|department)(?: with id: (?<id>\d+))?(?:[: ](?<details>.*))?/;
    const lines = logs.split(/\r?\n/);
    const parsed = lines.map(line => {
      const match = line.match(regex);
      if (!match || !match.groups) return null;
      return {
        time: match.groups.time,
        level: match.groups.level,
        user: match.groups.user,
        action: match.groups.action,
        entity: match.groups.entity,
        id: match.groups.id,
        details: match.groups.details,
        raw: line,
      };
    }).filter(Boolean);
    setParsedLogs(parsed);
  }, [logs]);

  const filteredLogs = parsedLogs.filter(log =>
    (!userFilter || log.user?.toLowerCase().includes(userFilter.toLowerCase())) &&
    (!actionFilter || log.action?.toLowerCase().includes(actionFilter.toLowerCase()))
  );

  useEffect(() => {
    fetchLogs(lines);
    // eslint-disable-next-line
  }, [lines]);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4, p: 2 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>Application Logs</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <FormControl size="small">
          <InputLabel id="lines-label">Lines</InputLabel>
          <Select
            labelId="lines-label"
            value={lines}
            label="Lines"
            onChange={e => setLines(e.target.value)}
          >
            {[50, 100, 200, 500, 1000].map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label="User" size="small" value={userFilter} onChange={e => setUserFilter(e.target.value)} placeholder="Filter by user" />
        <TextField label="Action" size="small" value={actionFilter} onChange={e => setActionFilter(e.target.value)} placeholder="Filter by action" />
        <Button variant="outlined" onClick={() => fetchLogs(lines)} disabled={loading}>Refresh</Button>
      </Box>
      {parsedLogs.length > 0 ? (
        <TableContainer component={Paper} sx={{ background: '#222', color: '#fff', mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#fff' }}>Time</TableCell>
                <TableCell sx={{ color: '#fff' }}>Level</TableCell>
                <TableCell sx={{ color: '#fff' }}>User</TableCell>
                <TableCell sx={{ color: '#fff' }}>Action</TableCell>
                <TableCell sx={{ color: '#fff' }}>Entity</TableCell>
                <TableCell sx={{ color: '#fff' }}>ID</TableCell>
                <TableCell sx={{ color: '#fff' }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ color: '#fff' }}>{log.time}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{log.level}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{log.user}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{log.action}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{log.entity}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{log.id}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 2, minHeight: 400, background: '#222', color: '#fff', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
          {loading ? <CircularProgress color="inherit" /> : error ? error : (logs?.trim() ? logs : 'No logs found or log file is empty.')}
        </Paper>
      )}
    </Box>
  );
};

export default LogViewer; 