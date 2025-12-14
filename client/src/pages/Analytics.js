import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import './Analytics.css';

const COLORS = ['#2d5016', '#4ade80', '#22c55e', '#16a34a', '#15803d'];

const Analytics = () => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/api/analytics');
      setData(response.data);
    } catch (error) {
      console.error('Fetch analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="error">Failed to load analytics data</div>;
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
        <p>Comprehensive insights into tree planting activities</p>
      </div>

      <div className="stats-overview">
        <div className="stat-box">
          <div className="stat-value">{data.totalStats.total_trees}</div>
          <div className="stat-label">Total Trees</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{data.totalStats.verified_trees}</div>
          <div className="stat-label">Verified Trees</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{data.totalStats.pending_trees}</div>
          <div className="stat-label">Pending Trees</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{parseFloat(data.totalStats.total_tokens_allocated || 0).toFixed(2)}</div>
          <div className="stat-label">Total Tokens (RLF)</div>
        </div>
        {isAdmin && (
          <div className="stat-box">
            <div className="stat-value">{data.totalStats.total_members}</div>
            <div className="stat-label">Total Members</div>
          </div>
        )}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Trees Planted by Period</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.treesByPeriod}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#2d5016" strokeWidth={2} name="Trees" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Trees by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.treesByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {data.treesByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Top Tree Planters</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topPlanters.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tree_count" fill="#2d5016" name="Trees Planted" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Trees by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.treesByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tree_type" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#4ade80" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {isAdmin && (
          <>
            <div className="chart-card">
              <h3>Token Recipients</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.tokenRecipients.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_received" fill="#22c55e" name="Tokens Received (RLF)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card full-width">
              <h3>Pending Token Recipients</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Pending Count</th>
                      <th>Pending Amount (RLF)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pendingTokenRecipients.length > 0 ? (
                      data.pendingTokenRecipients.map((user) => (
                        <tr key={user.id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.pending_count}</td>
                          <td>{parseFloat(user.pending_amount).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="no-data">No pending token recipients</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;


