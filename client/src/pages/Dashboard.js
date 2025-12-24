import React, { useEffect, useState } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import { getUploadUrl } from '../utils/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTrees, setRecentTrees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, treesRes] = await Promise.all([
        axiosInstance.get('/api/analytics'),
        axiosInstance.get('/api/trees'),
      ]);

      // Ensure stats is set safely
      setStats(statsRes.data?.totalStats || null);

      // Ensure trees data is always an array before calling .slice()
      let trees = [];
      if (treesRes && treesRes.data) {
        if (Array.isArray(treesRes.data)) {
          trees = treesRes.data;
        } else {
          console.warn('Trees API returned non-array data:', treesRes.data);
        }
      }
      // Sort trees by date (most recent first) and get latest 10
      const sortedTrees = trees
        .filter(tree => tree && tree.id) // Filter out invalid entries
        .sort((a, b) => {
          const dateA = a.planted_date ? new Date(a.planted_date) : new Date(0);
          const dateB = b.planted_date ? new Date(b.planted_date) : new Date(0);
          return dateB - dateA; // Sort descending (newest first)
        })
        .slice(0, 10); // Get latest 10 trees

      setRecentTrees(sortedTrees);
    } catch (error) {
      console.error('[Dashboard] Fetch dashboard data error:', error);
      setRecentTrees([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Loading dashboard...</div>;
  }

  return (
    <div className="py-5">
      <div className="mb-8">
        <h1 className="text-3xl text-primary mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600 text-base">Here's an overview of your activities</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Total Trees Card */}
        <div className="stat-card stat-card-trees group">
          <div className="stat-card-icon-wrapper">
            <div className="stat-card-icon trees-icon">
              <span className="icon-emoji">🌳</span>
            </div>
            <div className="stat-card-pattern"></div>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Trees</div>
            <div className="stat-card-value">{stats?.total_trees || 0}</div>
            <div className="stat-card-subtitle">Planted by you</div>
          </div>
          <div className="stat-card-decoration"></div>
        </div>

        {/* Verified Trees Card */}
        <div className="stat-card stat-card-verified group">
          <div className="stat-card-icon-wrapper">
            <div className="stat-card-icon verified-icon">
              <span className="icon-emoji">✓</span>
            </div>
            <div className="stat-card-pattern"></div>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Verified</div>
            <div className="stat-card-value">{stats?.verified_trees || 0}</div>
            <div className="stat-card-subtitle">
              {stats?.total_trees > 0 
                ? `${Math.round((stats.verified_trees / stats.total_trees) * 100)}% verified`
                : 'Awaiting verification'
              }
            </div>
          </div>
          <div className="stat-card-decoration"></div>
        </div>

        {/* Pending Trees Card */}
        <div className="stat-card stat-card-pending group">
          <div className="stat-card-icon-wrapper">
            <div className="stat-card-icon pending-icon">
              <span className="icon-emoji">⏳</span>
            </div>
            <div className="stat-card-pattern"></div>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Pending</div>
            <div className="stat-card-value">{stats?.pending_trees || 0}</div>
            <div className="stat-card-subtitle">Under review</div>
          </div>
          <div className="stat-card-decoration"></div>
        </div>

        {/* Total Tokens Card */}
        <div className="stat-card stat-card-tokens group">
          <div className="stat-card-icon-wrapper">
            <div className="stat-card-icon tokens-icon">
              <span className="icon-emoji">🪙</span>
            </div>
            <div className="stat-card-pattern"></div>
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Tokens</div>
            <div className="stat-card-value">{parseFloat(stats?.total_tokens_allocated || 0).toFixed(2)}</div>
            <div className="stat-card-subtitle">RLF earned</div>
          </div>
          <div className="stat-card-decoration"></div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-2xl text-primary mb-5">Recent Tree Submissions</h2>
        {Array.isArray(recentTrees) && recentTrees.length > 0 ? (
          <div className="flex flex-col gap-4">
            {recentTrees.map((tree) => (
                <div key={tree.id} className="flex items-center gap-5 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <img
                    src={getUploadUrl(`trees/${tree.photo}`)}
                    alt={tree.tree_type || 'Tree'}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-primary text-base mb-1">{tree.tree_type || 'Unknown'}</div>
                    <div className="text-gray-600 text-sm mb-1">{tree.location || 'Unknown location'}</div>
                    <div className="text-gray-400 text-xs">
                      Planted: {tree.planted_date ? new Date(tree.planted_date).toLocaleDateString() : 'Unknown date'}
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${
                    tree.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    tree.status === 'verified' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {tree.status || 'pending'}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">No trees submitted yet. Start planting!</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;



