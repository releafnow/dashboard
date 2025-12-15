import React, { useState, useEffect } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import TreeForm from '../components/TreeForm';
import { getUploadUrl } from '../utils/api';
import './Trees.css';

const Trees = () => {
  const { user, isAdmin } = useAuth();
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTree, setSelectedTree] = useState(null);

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    try {
      const response = await axiosInstance.get('/api/trees');
      setTrees(response.data);
    } catch (error) {
      console.error('Fetch trees error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    fetchTrees();
    setShowForm(false);
    setSelectedTree(null);
  };

  const handleEdit = (tree) => {
    setSelectedTree(tree);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tree?')) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/trees/${id}`);
      fetchTrees();
    } catch (error) {
      console.error('Delete tree error:', error);
      alert('Failed to delete tree');
    }
  };

  const handleStatusChange = async (id, status) => {
    if (!isAdmin) return;

    try {
      await axiosInstance.patch(`/api/trees/${id}/status`, { status });
      fetchTrees();
    } catch (error) {
      console.error('Update status error:', error);
      alert('Failed to update status');
    }
  };

  if (loading) {
    return <div className="loading">Loading trees...</div>;
  }

  return (
    <div className="trees-page">
      <div className="page-header">
        <h1>{isAdmin ? 'All Trees' : 'My Trees'}</h1>
        {!isAdmin && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Add New Tree
          </button>
        )}
      </div>

      {showForm && !isAdmin && (
        <TreeForm
          tree={selectedTree}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedTree(null);
          }}
        />
      )}

      <div className="trees-grid">
        {trees.map((tree) => (
          <div key={tree.id} className="tree-card">
            <div className="tree-card-image">
              <img
                src={getUploadUrl(`trees/${tree.photo}`)}
                alt={tree.tree_type}
              />
              <div className={`tree-status-badge status-${tree.status}`}>
                {tree.status}
              </div>
            </div>
            <div className="tree-card-content">
              <h3>{tree.tree_type}</h3>
              <div className="tree-card-details">
                <div className="detail-item">
                  <span className="detail-label">📍</span>
                  <span>{tree.location}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">📅</span>
                  <span>{new Date(tree.planted_date).toLocaleDateString()}</span>
                </div>
                {isAdmin && (
                  <div className="detail-item">
                    <span className="detail-label">👤</span>
                    <span>{tree.user_name || tree.user_email}</span>
                  </div>
                )}
                {tree.tokens_allocated > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">🪙</span>
                    <span>{parseFloat(tree.tokens_allocated).toFixed(2)} RLF</span>
                  </div>
                )}
              </div>
              {tree.notes && (
                <div className="tree-notes">{tree.notes}</div>
              )}
            </div>
            <div className="tree-card-actions">
              {isAdmin && tree.status === 'pending' && (
                <>
                  <button
                    className="btn-success"
                    onClick={() => handleStatusChange(tree.id, 'verified')}
                  >
                    Verify
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleStatusChange(tree.id, 'rejected')}
                  >
                    Reject
                  </button>
                </>
              )}
              {!isAdmin && tree.status === 'pending' && (
                <button
                  className="btn-secondary"
                  onClick={() => handleEdit(tree)}
                >
                  Edit
                </button>
              )}
              {!isAdmin && (
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(tree.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {trees.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🌳</div>
          <h3>No trees yet</h3>
          <p>Start planting trees to earn ReLeaf tokens!</p>
          {!isAdmin && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Add Your First Tree
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Trees;



