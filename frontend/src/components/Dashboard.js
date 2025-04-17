import React, { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { getAllEmployees } from '../services/employeeService';
import { getAllDepartments } from '../services/departmentService';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Card, CardContent, Grid, Typography, Box, CircularProgress } from '@mui/material';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [averageAge, setAverageAge] = useState(0);
  const [ageRangeData, setAgeRangeData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const employees = await getAllEmployees();
      const departments = await getAllDepartments();
      setEmployeeCount(employees.length);
      setDepartmentCount(departments.length);

      const totalAge = employees.reduce((sum, emp) => sum + emp.age, 0);
      const avgAge = employees.length ? totalAge / employees.length : 0;
      setAverageAge(avgAge.toFixed(1));

      const ageRanges = {
        '20-29': 0,
        '30-39': 0,
        '40-49': 0,
        '50-59': 0,
        '60+': 0,
      };

      employees.forEach(emp => {
        if (emp.age >= 20 && emp.age <= 29) ageRanges['20-29'] += 1;
        else if (emp.age >= 30 && emp.age <= 39) ageRanges['30-39'] += 1;
        else if (emp.age >= 40 && emp.age <= 49) ageRanges['40-49'] += 1;
        else if (emp.age >= 50 && emp.age <= 59) ageRanges['50-59'] += 1;
        else if (emp.age >= 60) ageRanges['60+'] += 1;
      });

      setAgeRangeData(ageRanges);
      setLoading(false);
    };
    fetchData();
  }, []);

  const animationStyle = {
    animation: 'dropDown 0.8s ease forwards',
    opacity: 0,
    '@keyframes dropDown': {
      '0%': { transform: 'translateY(-20px)', opacity: 0 },
      '100%': { transform: 'translateY(0)', opacity: 1 },
    },
  };

  const totalOverviewData = {
    labels: ['Employees', 'Departments'],
    datasets: [
      {
        label: 'Total Count',
        data: [employeeCount, departmentCount],
        backgroundColor: ['#3f51b5', '#ff9800'],
        borderColor: ['#3f51b5', '#ff9800'],
        borderWidth: 1,
      },
    ],
  };

  const ageRangeChartData = {
    labels: Object.keys(ageRangeData),
    datasets: [
      {
        label: 'Employees per Age Range',
        data: Object.values(ageRangeData),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
      },
    ],
  };

  const averageAgeChartData = {
    labels: ['Average Age'],
    datasets: [
      {
        label: 'Average Age of Employees',
        data: [parseFloat(averageAge)],
        backgroundColor: ['#8BC34A'],
        borderColor: ['#8BC34A'],
        borderWidth: 1,
      },
    ],
  };

  const pieChartData = {
    labels: Object.keys(ageRangeData),
    datasets: [
      {
        label: 'Age Range Distribution',
        data: Object.values(ageRangeData),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
        borderColor: ['#ffffff'],
        borderWidth: 1,
      },
    ],
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

  return (
    <Box sx={{ marginTop: '2rem' }}>
      <Typography variant="h4" component="h1" sx={{ marginBottom: '1rem', textAlign: 'center', fontWeight: 600 }}>
        Overview Dashboard
      </Typography>
      <Grid container spacing={3}>
        {/* Metric Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ ...animationStyle, boxShadow: 3, borderRadius: 2, height: '100%', backgroundColor: '#fff' }}>
            <CardContent>
              <Typography variant="h6" textAlign="center">
                Total Employees
              </Typography>
              <Typography variant="h4" textAlign="center">
                {employeeCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ ...animationStyle, boxShadow: 3, borderRadius: 2, height: '100%', backgroundColor: '#fff' }}>
            <CardContent>
              <Typography variant="h6" textAlign="center">
                Average Age
              </Typography>
              <Typography variant="h4" textAlign="center">
                {averageAge}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ ...animationStyle, boxShadow: 3, borderRadius: 2, height: '100%', backgroundColor: '#fff' }}>
            <CardContent>
              <Typography variant="h6" textAlign="center">
                Total Departments
              </Typography>
              <Typography variant="h4" textAlign="center">
                {departmentCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Chart Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ ...animationStyle, boxShadow: 3, borderRadius: 2, height: '100%', backgroundColor: '#fff' }}>
            <CardContent>
              <Typography variant="h6">Total Overview</Typography>
              <Bar data={totalOverviewData} options={{ scales: { y: { beginAtZero: true, suggestedMax: 30 } } }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ ...animationStyle, boxShadow: 3, borderRadius: 2, height: '100%', backgroundColor: '#fff' }}>
            <CardContent>
              <Typography variant="h6">Employee Count by Age Range</Typography>
              <Bar data={ageRangeChartData} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ ...animationStyle, boxShadow: 3, borderRadius: 2, height: '100%', backgroundColor: '#fff' }}>
            <CardContent>
              <Typography variant="h6">Average Age of Employees</Typography>
              <Bar data={averageAgeChartData} options={{ scales: { y: { beginAtZero: true, suggestedMax: 100 } } }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ ...animationStyle, boxShadow: 3, borderRadius: 2, height: '100%', backgroundColor: '#fff' }}>
            <CardContent>
              <Typography variant="h6">Age Range Distribution</Typography>
              <Pie data={pieChartData} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
