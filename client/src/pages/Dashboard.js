import React, { useEffect, useState } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTrees, setRecentTrees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log("fetching dashboard data");
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
      setRecentTrees(trees.slice(0, 5));
    } catch (error) {
      console.error('Fetch dashboard data error:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty array on error to prevent .map() errors
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="bg-white rounded-xl p-6 flex items-center gap-5 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
          <div className="text-5xl w-20 h-20 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 rounded-xl">🌳</div>
          <div className="flex-1">
            <div className="text-gray-600 text-sm mb-2">Total Trees</div>
            <div className="text-primary text-3xl font-bold">{stats?.total_trees || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 flex items-center gap-5 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
          <div className="text-5xl w-20 h-20 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 rounded-xl">✓</div>
          <div className="flex-1">
            <div className="text-gray-600 text-sm mb-2">Verified Trees</div>
            <div className="text-primary text-3xl font-bold">{stats?.verified_trees || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 flex items-center gap-5 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
          <div className="text-5xl w-20 h-20 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 rounded-xl">⏳</div>
          <div className="flex-1">
            <div className="text-gray-600 text-sm mb-2">Pending Trees</div>
            <div className="text-primary text-3xl font-bold">{stats?.pending_trees || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 flex items-center gap-5 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
          <div className="text-5xl w-20 h-20 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 rounded-xl">🪙</div>
          <div className="flex-1">
            <div className="text-gray-600 text-sm mb-2">Total Tokens</div>
            <div className="text-primary text-3xl font-bold">{parseFloat(stats?.total_tokens_allocated || 0).toFixed(2)} RLF</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-2xl text-primary mb-5">Recent Tree Submissions</h2>
        {Array.isArray(recentTrees) && recentTrees.length > 0 ? (
          <div className="flex flex-col gap-4">
            {recentTrees
              .filter(tree => tree && tree.id) // Filter out any invalid entries
              .map((tree) => (
                <div key={tree.id} className="flex items-center gap-5 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <img
                    src={`http://localhost:5000/uploads/trees/${tree.photo}`}
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



