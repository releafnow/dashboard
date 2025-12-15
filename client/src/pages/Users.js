import React, { useState, useEffect } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import { getUploadUrl } from '../utils/api';
import './Users.css';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member',
    country: '',
    address: '',
    phone: '',
    photo: null,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'member',
      country: user.country || '',
      address: user.address || '',
      phone: user.phone || '',
      photo: null,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key !== 'photo' && formData[key]) {
          submitData.append(key, formData[key]);
        }
      });
      if (formData.photo) {
        submitData.append('photo', formData.photo);
      }

      await axiosInstance.put(`/api/users/${selectedUser.id}`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowForm(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Update user error:', error);
      alert('Failed to update user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also delete all their trees and transactions.')) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage all member users and their information</p>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit User</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} disabled />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Profile Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, photo: e.target.files[0] })}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Country</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.photo ? (
                    <img
                      src={getUploadUrl(`profiles/${user.photo}`)}
                      alt={user.name}
                      className="user-photo"
                    />
                  ) : (
                    <div className="user-photo-placeholder">{user.name.charAt(0).toUpperCase()}</div>
                  )}
                </td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>{user.role}</span>
                </td>
                <td>{user.country || '-'}</td>
                <td>{user.phone || '-'}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-edit" onClick={() => handleEdit(user)}>
                      Edit
                    </button>
                    {user.id !== currentUser.id && (
                      <button className="btn-delete" onClick={() => handleDelete(user.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
