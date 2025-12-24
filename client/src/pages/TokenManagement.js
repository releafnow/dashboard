import React, { useState, useEffect } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import './TokenManagement.css';

const TokenManagement = () => {
  const { user, isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(null);
  const [userBalances, setUserBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllocateForm, setShowAllocateForm] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    type: 'reward',
    tree_id: '',
    notes: '',
    auto_approve: false,
  });
  const [users, setUsers] = useState([]);
  const [trees, setTrees] = useState([]);
  
  // Withdrawal states
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [withdrawFormData, setWithdrawFormData] = useState({
    amount: '',
    withdrawal_address: '',
    notes: '',
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressFormData, setAddressFormData] = useState({ withdrawal_address: '' });

  useEffect(() => {
    fetchData();
    if (!isAdmin) {
      fetchWithdrawalData();
    }
  }, []);

  const fetchData = async () => {
    try {
      const [transRes, balanceRes, usersRes] = await Promise.all([
        axiosInstance.get('/api/tokens/transactions'),
        axiosInstance.get('/api/tokens/balance'),
        isAdmin ? axiosInstance.get('/api/users') : Promise.resolve({ data: [] }),
      ]);

      setTransactions(transRes.data);
      setBalance(balanceRes.data);

      if (isAdmin) {
        setUsers(usersRes.data.filter((u) => u.role === 'member'));
        fetchUserBalances();
        
        // Fetch withdrawal requests for admin
        try {
          const requestsRes = await axiosInstance.get('/api/withdrawals/requests');
          setWithdrawalRequests(requestsRes.data);
        } catch (error) {
          console.error('Fetch withdrawal requests error:', error);
        }
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBalances = async () => {
    try {
      const response = await axiosInstance.get('/api/tokens/balances');
      setUserBalances(response.data);
    } catch (error) {
      console.error('Fetch balances error:', error);
    }
  };

  const fetchWithdrawalData = async () => {
    try {
      const [addressRes, requestsRes] = await Promise.all([
        axiosInstance.get('/api/withdrawals/address'),
        axiosInstance.get('/api/withdrawals/requests'),
      ]);
      setWithdrawalAddress(addressRes.data.withdrawal_address || '');
      setWithdrawalRequests(requestsRes.data);
      setAddressFormData({ withdrawal_address: addressRes.data.withdrawal_address || '' });
    } catch (error) {
      console.error('Fetch withdrawal data error:', error);
    }
  };

  const handleSetAddress = async (e) => {
    e.preventDefault();
    setLoadingAddress(true);
    try {
      await axiosInstance.put('/api/withdrawals/address', addressFormData);
      setWithdrawalAddress(addressFormData.withdrawal_address);
      setShowAddressForm(false);
      alert('Withdrawal address saved successfully!');
      fetchWithdrawalData();
    } catch (error) {
      console.error('Set address error:', error);
      alert(error.response?.data?.message || 'Failed to save withdrawal address');
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/withdrawals/requests', {
        ...withdrawFormData,
        amount: parseFloat(withdrawFormData.amount),
      });
      setShowWithdrawForm(false);
      setWithdrawFormData({ amount: '', withdrawal_address: '', notes: '' });
      alert('Withdrawal request submitted successfully!');
      fetchWithdrawalData();
      fetchData(); // Refresh balance
    } catch (error) {
      console.error('Create withdrawal request error:', error);
      alert(error.response?.data?.message || 'Failed to submit withdrawal request');
    }
  };

  const handleWithdrawalStatusChange = async (id, status, transactionHash = '') => {
    try {
      const data = { status };
      if (transactionHash) {
        data.transaction_hash = transactionHash;
      }
      await axiosInstance.patch(`/api/withdrawals/requests/${id}/status`, data);
      fetchWithdrawalData();
      if (isAdmin) {
        fetchUserBalances();
      } else {
        fetchData();
      }
    } catch (error) {
      console.error('Update withdrawal status error:', error);
      alert('Failed to update withdrawal request status');
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/tokens/allocate', {
        ...formData,
        amount: parseFloat(formData.amount),
        user_id: parseInt(formData.user_id),
        tree_id: formData.tree_id ? parseInt(formData.tree_id) : null,
      });
      setShowAllocateForm(false);
      setFormData({
        user_id: '',
        amount: '',
        type: 'reward',
        tree_id: '',
        notes: '',
        auto_approve: false,
      });
      fetchData();
    } catch (error) {
      console.error('Allocate tokens error:', error);
      alert(error.response?.data?.message || 'Failed to allocate tokens');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axiosInstance.patch(`/api/tokens/transactions/${id}/status`, { status });
      fetchData();
    } catch (error) {
      console.error('Update status error:', error);
      alert('Failed to update transaction status');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="token-management">
      <div className="page-header">
        <h1>Token Management</h1>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowAllocateForm(true)}>
            + Allocate Tokens
          </button>
        )}
      </div>

      {!isAdmin && balance && (
        <>
          <div className="balance-card">
            <h2>Your Token Balance</h2>
            <div className="balance-info">
              <div className="balance-item">
                <span className="balance-label">Total Earned</span>
                <span className="balance-value">{parseFloat(balance.total_earned || 0).toFixed(2)} RLF</span>
              </div>
              <div className="balance-item">
                <span className="balance-label">Total Spent</span>
                <span className="balance-value">{parseFloat(balance.total_spent || 0).toFixed(2)} RLF</span>
              </div>
              <div className="balance-item highlight">
                <span className="balance-label">Current Balance</span>
                <span className="balance-value">{parseFloat(balance.balance || 0).toFixed(2)} RLF</span>
              </div>
              {balance.pending_rewards > 0 && (
                <div className="balance-item">
                  <span className="balance-label">Pending Rewards</span>
                  <span className="balance-value">{balance.pending_rewards} transactions</span>
                </div>
              )}
            </div>
          </div>

          {/* Withdrawal Address Section */}
          <div className="section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>💰 Withdrawal Settings</h2>
              {!showAddressForm && (
                <button className="btn-primary" onClick={() => setShowAddressForm(true)}>
                  {withdrawalAddress ? '✏️ Update Address' : '➕ Set Withdrawal Address'}
                </button>
              )}
            </div>
            
            {showAddressForm ? (
              <form onSubmit={handleSetAddress} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
                <div className="form-group">
                  <label>💳 Withdrawal Address (Wallet Address) *</label>
                  <input
                    type="text"
                    value={addressFormData.withdrawal_address}
                    onChange={(e) => setAddressFormData({ withdrawal_address: e.target.value })}
                    placeholder="Enter your wallet address"
                    required
                    style={{ width: '100%', padding: '10px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                  <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                    This address will be used for all withdrawal requests
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button type="submit" className="btn-primary" disabled={loadingAddress}>
                    {loadingAddress ? 'Saving...' : '💾 Save Address'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => {
                    setShowAddressForm(false);
                    setAddressFormData({ withdrawal_address: withdrawalAddress });
                  }}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
                {withdrawalAddress ? (
                  <div>
                    <p style={{ margin: '0 0 10px 0', fontWeight: '500' }}>Current Withdrawal Address:</p>
                    <p style={{ margin: '0', color: '#666', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {withdrawalAddress}
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: '0', color: '#999' }}>
                    ⚠️ No withdrawal address set. Please set your wallet address to request withdrawals.
                  </p>
                )}
              </div>
            )}

            {/* Withdraw Button */}
            {withdrawalAddress && parseFloat(balance.balance || 0) > 0 && (
              <div style={{ marginTop: '20px' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    setWithdrawFormData({ ...withdrawFormData, withdrawal_address: withdrawalAddress });
                    setShowWithdrawForm(true);
                  }}
                  style={{ width: '100%' }}
                >
                  💸 Request Withdrawal
                </button>
              </div>
            )}
          </div>

          {/* Withdrawal Request Form Modal */}
          {showWithdrawForm && (
            <div className="modal-overlay" onClick={() => setShowWithdrawForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>💸 Request Withdrawal</h2>
                <form onSubmit={handleWithdraw}>
                  <div className="form-group">
                    <label>Amount (RLF) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={parseFloat(balance.balance || 0).toFixed(2)}
                      value={withdrawFormData.amount}
                      onChange={(e) => setWithdrawFormData({ ...withdrawFormData, amount: e.target.value })}
                      required
                    />
                    <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                      Available balance: {parseFloat(balance.balance || 0).toFixed(2)} RLF
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Withdrawal Address *</label>
                    <input
                      type="text"
                      value={withdrawFormData.withdrawal_address}
                      onChange={(e) => setWithdrawFormData({ ...withdrawFormData, withdrawal_address: e.target.value })}
                      required
                      placeholder="Enter wallet address"
                    />
                  </div>

                  <div className="form-group">
                    <label>Notes (Optional)</label>
                    <textarea
                      value={withdrawFormData.notes}
                      onChange={(e) => setWithdrawFormData({ ...withdrawFormData, notes: e.target.value })}
                      rows="3"
                      placeholder="Additional information about this withdrawal"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowWithdrawForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">Submit Request</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Withdrawal Requests History */}
          {withdrawalRequests.length > 0 && (
            <div className="section">
              <h2>📋 My Withdrawal Requests</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>Transaction Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalRequests.map((req) => (
                      <tr key={req.id}>
                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                        <td className="amount-negative">{parseFloat(req.amount).toFixed(2)} RLF</td>
                        <td style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '12px' }}>
                          {req.withdrawal_address}
                        </td>
                        <td>
                          <span className={`status-badge status-${req.status}`}>{req.status}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {req.transaction_hash || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {isAdmin && showAllocateForm && (
        <div className="modal-overlay" onClick={() => setShowAllocateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Allocate Tokens</h2>
            <form onSubmit={handleAllocate}>
              <div className="form-group">
                <label>User *</label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  required
                >
                  <option value="">Select user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount (RLF) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="reward">Reward</option>
                  <option value="deduction">Deduction</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.auto_approve}
                    onChange={(e) => setFormData({ ...formData, auto_approve: e.target.checked })}
                  />
                  Auto-approve (mark as completed immediately)
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAllocateForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Allocate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin: Fetch and display withdrawal requests */}
      {isAdmin && (
        <>
          <div className="section">
            <h2>User Balances</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Total Earned</th>
                  <th>Total Spent</th>
                  <th>Balance</th>
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                {userBalances.map((ub) => (
                  <tr key={ub.id}>
                    <td>{ub.name}</td>
                    <td>{ub.email}</td>
                    <td>{parseFloat(ub.total_earned || 0).toFixed(2)} RLF</td>
                    <td>{parseFloat(ub.total_spent || 0).toFixed(2)} RLF</td>
                    <td className="balance-cell">{parseFloat(ub.balance || 0).toFixed(2)} RLF</td>
                    <td>{ub.pending_rewards || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          {/* Admin Withdrawal Requests Section */}
          <div className="section">
            <h2>💸 Withdrawal Requests</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalRequests.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                        No withdrawal requests found
                      </td>
                    </tr>
                  ) : (
                    withdrawalRequests.map((req) => (
                      <tr key={req.id}>
                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                        <td>
                          <div>
                            <div>{req.user_name}</div>
                            <small style={{ color: '#666' }}>{req.user_email}</small>
                          </div>
                        </td>
                        <td className="amount-negative">{parseFloat(req.amount).toFixed(2)} RLF</td>
                        <td style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '11px', maxWidth: '200px' }}>
                          {req.withdrawal_address}
                        </td>
                        <td>
                          <span className={`status-badge status-${req.status}`}>{req.status}</span>
                        </td>
                        <td>
                          {req.status === 'pending' && (
                            <div className="action-buttons">
                              <button
                                className="btn-success-small"
                                onClick={() => handleWithdrawalStatusChange(req.id, 'approved')}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-danger-small"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to reject this withdrawal request?')) {
                                    handleWithdrawalStatusChange(req.id, 'rejected');
                                  }
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {req.status === 'approved' && (
                            <button
                              className="btn-success-small"
                              onClick={() => {
                                const hash = window.prompt('Enter transaction hash:');
                                if (hash) {
                                  handleWithdrawalStatusChange(req.id, 'completed', hash);
                                }
                              }}
                            >
                              Mark Completed
                            </button>
                          )}
                          {req.status === 'completed' && req.transaction_hash && (
                            <small style={{ fontFamily: 'monospace', fontSize: '10px', display: 'block' }}>
                              {req.transaction_hash.substring(0, 20)}...
                            </small>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="section">
        <h2>Transaction History</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                {isAdmin && <th>User</th>}
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`type-badge type-${tx.type}`}>{tx.type}</span>
                  </td>
                  <td className={tx.type === 'reward' ? 'amount-positive' : 'amount-negative'}>
                    {tx.type === 'reward' ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} RLF
                  </td>
                  <td>
                    <span className={`status-badge status-${tx.status}`}>{tx.status}</span>
                  </td>
                  {isAdmin && <td>{tx.user_name || tx.user_email}</td>}
                  {isAdmin && tx.status === 'pending' && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-success-small"
                          onClick={() => handleStatusChange(tx.id, 'completed')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-danger-small"
                          onClick={() => handleStatusChange(tx.id, 'cancelled')}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TokenManagement;
