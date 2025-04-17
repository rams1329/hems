import axios from 'axios';

const LOGS_URL = 'http://localhost:8080/api/employees/logs';

export const fetchLogs = async (lines = 200) => {
  const response = await axios.get(LOGS_URL + `?lines=${lines}`);
  return response.data;
}; 