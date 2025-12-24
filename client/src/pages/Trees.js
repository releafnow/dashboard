import React, { useState, useEffect } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import TreeForm from '../components/TreeForm';
import TreeCard from '../components/TreeCard';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import usePagination from '../hooks/usePagination';
import './Trees.css';

const Trees = () => {
  const { isAdmin } = useAuth();
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTree, setSelectedTree] = useState(null);
  const [error, setError] = useState('');

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedItems: currentTrees,
    paginationInfo,
    setItemsPerPage,
    handlePageChange,
    ITEMS_PER_PAGE_OPTIONS,
  } = usePagination(trees);

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    try {
      setError('');
      const response = await axiosInstance.get('/api/trees');
      setTrees(response.data);
    } catch (error) {
      console.error('Fetch trees error:', error);
      setError('Failed to load trees. Please try again.');
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
      setError('');
      await axiosInstance.delete(`/api/trees/${id}`);
      await fetchTrees();
    } catch (error) {
      console.error('Delete tree error:', error);
      setError('Failed to delete tree. Please try again.');
    }
  };

  const handleStatusChange = async (id, status) => {
    if (!isAdmin) return;

    try {
      setError('');
      await axiosInstance.patch(`/api/trees/${id}/status`, { status });
      await fetchTrees();
    } catch (error) {
      console.error('Update status error:', error);
      setError('Failed to update status. Please try again.');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedTree(null);
  };

  if (loading) {
    return <div className="loading">Loading trees...</div>;
  }

  const actionButton = !isAdmin ? (
    <button className="btn-primary" onClick={() => setShowForm(true)}>
      <span className="btn-icon">+</span>
      <span>Add New Tree</span>
    </button>
  ) : null;

  return (
    <div className="trees-page">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <PageHeader
        title={isAdmin ? 'All Trees' : 'My Trees'}
        countInfo={paginationInfo}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
        onItemsPerPageChange={setItemsPerPage}
        actionButton={actionButton}
      />

      {showForm && !isAdmin && (
        <TreeForm
          tree={selectedTree}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseForm}
        />
      )}

      <div className="trees-grid">
        {currentTrees.map((tree) => (
          <TreeCard
            key={tree.id}
            tree={tree}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {trees.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

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
