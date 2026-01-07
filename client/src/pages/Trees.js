import React, { useState, useEffect } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import TreeForm from '../components/TreeForm';
import TreeCard from '../components/TreeCard';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import usePagination from '../hooks/usePagination';
import { showSuccess, showError } from '../utils/toast';
import './Trees.css';

const Trees = () => {
  const { isAdmin } = useAuth();
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTree, setSelectedTree] = useState(null);
  const [error, setError] = useState('');
  
  // Verification modal states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyingTree, setVerifyingTree] = useState(null);
  const [verifyFormData, setVerifyFormData] = useState({
    token_amount: '',
    transaction_hash: '',
    notes: '',
  });

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
      showSuccess('Tree deleted successfully!');
    } catch (error) {
      console.error('Delete tree error:', error);
      showError('Failed to delete tree. Please try again.');
    }
  };

  const handleStatusChange = async (id, status) => {
    if (!isAdmin) return;

    if (status === 'verified') {
      // Show verification modal to input token details
      const tree = trees.find(t => t.id === id);
      setVerifyingTree(tree);
      setVerifyFormData({
        token_amount: '',
        transaction_hash: '',
        notes: '',
      });
      setShowVerifyModal(true);
    } else if (status === 'rejected') {
      // For rejection, ask for reason
      const reason = window.prompt('Please provide a reason for rejection (this will be visible to the user):');
      if (reason === null) return; // User cancelled
      
      try {
        setError('');
        await axiosInstance.patch(`/api/trees/${id}/status`, { 
          status,
          notes: reason || 'Your tree submission was rejected. Please contact support for more details.'
        });
        await fetchTrees();
        showSuccess('Tree rejected successfully.');
      } catch (error) {
        console.error('Update status error:', error);
        showError('Failed to update status. Please try again.');
      }
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyingTree) return;

    // Validate required fields
    if (!verifyFormData.token_amount || parseFloat(verifyFormData.token_amount) <= 0) {
      showError('Please enter a valid token amount');
      return;
    }
    if (!verifyFormData.transaction_hash || verifyFormData.transaction_hash.trim() === '') {
      showError('Please enter the transaction hash');
      return;
    }
    if (!verifyingTree.user_wallet_address) {
      showError('Cannot proceed: User has not set their wallet address');
      return;
    }

    try {
      setError('');
      
      // Allocate tokens first (this records the transaction hash)
      await axiosInstance.post('/api/tokens/allocate', {
        user_id: verifyingTree.user_id,
        amount: parseFloat(verifyFormData.token_amount),
        type: 'reward',
        tree_id: verifyingTree.id,
        transaction_hash: verifyFormData.transaction_hash.trim(),
        notes: `Reward for verified tree: ${verifyingTree.tree_type} at ${verifyingTree.location}`,
        auto_approve: true, // Mark as completed since admin has already sent tokens
      });

      // Then verify the tree (only after tokens are successfully recorded)
      await axiosInstance.patch(`/api/trees/${verifyingTree.id}/status`, { 
        status: 'verified',
        notes: verifyFormData.notes || null,
      });

      await fetchTrees();
      setShowVerifyModal(false);
      setVerifyingTree(null);
      showSuccess('Tree verified and tokens allocated successfully!');
    } catch (error) {
      console.error('Verify tree error:', error);
      showError(error.response?.data?.message || 'Failed to verify tree. Please try again.');
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

      {/* Verification Modal for Admin */}
      {showVerifyModal && verifyingTree && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-content verify-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header p-4 mb-4">
              <p className="mb-0 text-xl font-bold">✅ Verify Tree & Allocate Tokens</p>
              <button 
                className="modal-close"
                onClick={() => setShowVerifyModal(false)}
              >
                ×
              </button>
            </div>

            {/* Tree & User Information */}
            <div className="tree-summary">
              <div className="summary-section-title">🌳 Tree Information</div>
              <div className="summary-item">
                <span className="summary-label">Tree Type:</span>
                <span className="summary-value">{verifyingTree.tree_type}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Location:</span>
                <span className="summary-value">{verifyingTree.location}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Planted Date:</span>
                <span className="summary-value">{new Date(verifyingTree.planted_date).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="tree-summary user-info-summary">
              <div className="summary-section-title">👤 User Information</div>
              <div className="summary-item">
                <span className="summary-label">Name:</span>
                <span className="summary-value">{verifyingTree.user_name || 'N/A'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Email:</span>
                <span className="summary-value">{verifyingTree.user_email}</span>
              </div>
              <div className="summary-item wallet-address-row">
                <span className="summary-label">💳 Wallet Address:</span>
                {verifyingTree.user_wallet_address ? (
                  <div className="wallet-address-container">
                    <span className="summary-value wallet-address">{verifyingTree.user_wallet_address}</span>
                    <button 
                      type="button"
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(verifyingTree.user_wallet_address);
                        showSuccess('Wallet address copied!');
                      }}
                      title="Copy wallet address"
                    >
                      📋 Copy
                    </button>
                  </div>
                ) : (
                  <span className="summary-value no-wallet">⚠️ User has not set wallet address</span>
                )}
              </div>
            </div>

            {/* Step-by-step Instructions */}
            <div className="verification-steps">
              <div className="step-title">📋 Steps to Complete Verification:</div>
              <div className="step">
                <span className="step-number">1</span>
                <span className="step-text">Review the tree photos and information above</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span className="step-text">Copy the user's wallet address</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span className="step-text">Send RLF tokens to the user's wallet manually</span>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <span className="step-text">Paste the transaction hash below</span>
              </div>
            </div>

            <form onSubmit={handleVerifySubmit}>
              <div className="form-group">
                <label>🪙 Token Amount (RLF) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={verifyFormData.token_amount}
                  onChange={(e) => setVerifyFormData({ ...verifyFormData, token_amount: e.target.value })}
                  placeholder="e.g., 10.00"
                  required
                />
                <small>Amount of RLF tokens you sent to the user</small>
              </div>

              <div className="form-group">
                <label>🔗 Transaction Hash (Blockchain TX) *</label>
                <input
                  type="text"
                  value={verifyFormData.transaction_hash}
                  onChange={(e) => setVerifyFormData({ ...verifyFormData, transaction_hash: e.target.value })}
                  placeholder="0x..."
                  required
                />
                <small>
                  The transaction hash from your wallet after sending tokens
                </small>
              </div>

              <div className="form-group">
                <label>📝 Admin Notes (Optional)</label>
                <textarea
                  value={verifyFormData.notes}
                  onChange={(e) => setVerifyFormData({ ...verifyFormData, notes: e.target.value })}
                  rows="2"
                  placeholder="Internal notes about this verification"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowVerifyModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-success"
                  disabled={!verifyingTree.user_wallet_address}
                  title={!verifyingTree.user_wallet_address ? 'User has not set wallet address' : ''}
                >
                  ✅ Complete Verification
                </button>
              </div>
              
              {!verifyingTree.user_wallet_address && (
                <div className="warning-message">
                  ⚠️ Cannot send tokens: User has not set their wallet address. 
                  Please ask the user to update their profile with a wallet address first.
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trees;
