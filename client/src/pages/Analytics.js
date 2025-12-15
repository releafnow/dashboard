import React, { useEffect, useState } from 'react';
import axiosInstance from '../config/axios';
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
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Analytics.css';

const COLORS = ['#2d5016', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#10b981', '#059669'];

const Analytics = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [groupBy, setGroupBy] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, groupBy, customStartDate, customEndDate]);

  const getDateRange = () => {
    const today = new Date();
    let startDate = null;
    let endDate = today.toISOString().split('T')[0];

    switch (timeRange) {
      case 'day':
        startDate = today.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case '3months':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        startDate = threeMonthsAgo.toISOString().split('T')[0];
        break;
      case '6months':
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        startDate = sixMonthsAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        startDate = yearAgo.toISOString().split('T')[0];
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = customStartDate;
          endDate = customEndDate;
        } else {
          // Don't fetch if custom dates not set
          return { startDate: null, endDate: null };
        }
        break;
      default:
        // 'all' - no date filter
        return { startDate: null, endDate: null };
    }

    return { startDate, endDate };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();
      
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      params.append('groupBy', groupBy);

      const response = await axiosInstance.get(`/api/analytics?${params.toString()}`);
      setData(response.data);
    } catch (error) {
      console.error('Fetch analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, navigate]);

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="text-center py-10 text-red-600">Failed to load analytics data</div>;
  }

  if (!isAdmin) {
    return null;
  }

  // Prepare country data for charts
  const countryChartData = data.treesByCountry?.slice(0, 10) || [];
  const userGrowthData = [...(data.userGrowth || [])].reverse();

  return (
    <div className="py-5">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Admin Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into tree planting activities, countries, and user growth</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select 
            value={timeRange} 
            onChange={(e) => {
              setTimeRange(e.target.value);
              setShowCustomPicker(e.target.value === 'custom');
            }}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="all">All Time</option>
            <option value="day">Today</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>

          {timeRange !== 'all' && timeRange !== 'custom' && (
            <select 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              title="Group data by time period"
            >
              <option value="day">Group by Day</option>
              <option value="week">Group by Week</option>
              <option value="month">Group by Month</option>
              <option value="year">Group by Year</option>
            </select>
          )}

          {showCustomPicker && (
            <div className="flex gap-2 items-center bg-gray-50 p-3 rounded-md border border-gray-200">
              <label className="text-sm text-gray-700">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={customEndDate || new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <label className="text-sm text-gray-700">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              {customStartDate && customEndDate && customStartDate > customEndDate && (
                <span className="text-xs text-red-600">Start date must be before end date</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="text-3xl font-bold text-primary mb-1">{data.totalStats.total_trees}</div>
          <div className="text-sm text-gray-600">Total Trees Planted</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="text-3xl font-bold text-green-600 mb-1">{data.totalStats.verified_trees}</div>
          <div className="text-sm text-gray-600">Verified Trees</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="text-3xl font-bold text-primary mb-1">{data.totalStats.total_members}</div>
          <div className="text-sm text-gray-600">Total Members</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="text-3xl font-bold text-primary mb-1">{parseFloat(data.totalStats.total_tokens_allocated || 0).toFixed(0)}</div>
          <div className="text-sm text-gray-600">Total Tokens (RLF)</div>
        </div>
      </div>

      {/* User Engagement Stats */}
      {data.userEngagement && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="text-2xl font-bold text-green-700 mb-1">{data.userEngagement.active_users || 0}</div>
            <div className="text-sm text-green-600">Active Users</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
            <div className="text-2xl font-bold text-gray-700 mb-1">{data.userEngagement.inactive_users || 0}</div>
            <div className="text-sm text-gray-600">Inactive Users</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="text-2xl font-bold text-blue-700 mb-1">{parseFloat(data.userEngagement.avg_trees_per_user || 0).toFixed(1)}</div>
            <div className="text-sm text-blue-600">Avg Trees/User</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="text-2xl font-bold text-purple-700 mb-1">{data.userEngagement.max_trees_per_user || 0}</div>
            <div className="text-sm text-purple-600">Max Trees by User</div>
          </div>
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Trees Planted Over Time */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-semibold text-primary mb-4">🌳 Trees Planted Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={[...data.treesByPeriod].reverse()}>
              <defs>
                <linearGradient id="colorTrees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2d5016" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2d5016" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#2d5016" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTrees)" 
                name="Trees Planted"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth Over Time */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-semibold text-primary mb-4">👥 User Growth Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="members" fill="#4ade80" name="Members" radius={[8, 8, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="count" stroke="#2d5016" strokeWidth={2} name="Total Users" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Trees by Country */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-semibold text-primary mb-4">🌍 Top Countries by Trees Planted</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countryChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="country" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'trees') return [`${value} trees`, 'Trees Planted'];
                  if (name === 'users') return [`${value} users`, 'Active Users'];
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="tree_count" fill="#2d5016" name="Trees" radius={[0, 8, 8, 0]} />
              <Bar dataKey="user_count" fill="#4ade80" name="Users" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Countries by Tokens */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-semibold text-primary mb-4">🪙 Top Countries by Tokens Earned</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.countriesByTokens || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="country" 
                angle={-45} 
                textAnchor="end" 
                height={100} 
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value) => [`${parseFloat(value).toFixed(2)} RLF`, 'Tokens']}
              />
              <Bar dataKey="total_tokens_earned" fill="#22c55e" name="Tokens (RLF)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Trees by Status */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-semibold text-primary mb-4">📊 Trees by Status</h3>
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

        {/* Trees by Type */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-semibold text-primary mb-4">🌲 Popular Tree Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.treesByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="tree_type" 
                angle={-45} 
                textAnchor="end" 
                height={100} 
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Bar dataKey="count" fill="#4ade80" name="Trees Planted" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Tree Planters */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-semibold text-primary mb-4">🏆 Top Tree Planters</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topPlanters.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100} 
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="tree_count" fill="#2d5016" name="Trees Planted" radius={[8, 8, 0, 0]} />
              <Bar dataKey="total_tokens" fill="#22c55e" name="Tokens (RLF)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Token Recipients */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-semibold text-primary mb-4">💎 Top Token Recipients</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.tokenRecipients.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100} 
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value) => [`${parseFloat(value).toFixed(2)} RLF`, 'Tokens']}
              />
              <Bar dataKey="total_received" fill="#22c55e" name="Tokens Received (RLF)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Country Performance Table */}
      <div className="bg-white rounded-xl p-6 shadow-md mb-8">
        <h3 className="text-xl font-semibold text-primary mb-4">🌎 Country Performance Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Country</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Trees</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Active Users</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tokens Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {countryChartData.length > 0 ? (
                countryChartData.map((country, index) => (
                  <tr key={country.country || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{country.country || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{country.tree_count || 0}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{country.user_count || 0}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-primary">
                      {parseFloat(country.total_tokens || 0).toFixed(2)} RLF
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Token Recipients */}
      {data.pendingTokenRecipients && data.pendingTokenRecipients.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-semibold text-primary mb-4">⏳ Pending Token Recipients</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pending Count</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pending Amount (RLF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.pendingTokenRecipients.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{user.pending_count}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-yellow-600">
                      {parseFloat(user.pending_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;



