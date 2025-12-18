import React, { useState, useEffect } from 'react';
import axiosInstance from '../config/axios';
import { useAuth } from '../contexts/AuthContext';
import { getUploadUrl } from '../utils/api';
import './Profile.css';

const Profile = () => {
  const { user, fetchUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    address: '',
    phone: '',
    photo: null,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/users/profile/me');
      const profile = response.data;
      setFormData({
        name: profile.name || '',
        country: profile.country || '',
        address: profile.address || '',
        phone: profile.phone || '',
        photo: null,
      });
      if (profile.photo) {
        setPreview(getUploadUrl(`profiles/${profile.photo}`));
      }
      setLoading(false);
    } catch (error) {
      console.error('Fetch profile error:', error);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, photo: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

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

      await axiosInstance.put('/api/users/profile/me', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await fetchUser();
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Update profile error:', error);
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      setSaving(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      setSaving(false);
      return;
    }

    try {
      await axiosInstance.put('/api/users/profile/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setMessage('Password updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Update password error:', error);
      setMessage(error.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <div className="header-content">
          <span className="header-icon">👤</span>
          <h1>My Profile</h1>
        </div>
        <p className="header-subtitle">Manage your personal information and account settings</p>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          <span className="message-icon">
            {message.includes('successfully') ? '✓' : '⚠️'}
          </span>
          <span>{message}</span>
        </div>
      )}

      <div className="profile-section">
        <div className="section-header">
          <span className="section-icon">📸</span>
          <h2>Profile Photo</h2>
        </div>
        <div className="profile-photo-section">
          <div className="photo-preview-large">
            {preview ? (
              <img src={preview} alt="Profile" />
            ) : (
              <div className="photo-placeholder">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <label className="file-label" htmlFor="profile-photo-input">
            <span className="file-icon">📁</span>
            <span>Change Photo</span>
            <input
              id="profile-photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="profile-section">
        <div className="section-header">
          <span className="section-icon">👤</span>
          <h2>Personal Information</h2>
        </div>
        <form onSubmit={handleProfileSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="label-with-icon">
                <span className="label-icon">✏️</span>
                Full Name <span className="required-asterisk">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label-with-icon">
                <span className="label-icon">📧</span>
                Email
              </label>
              <div className="input-wrapper">
                <input type="email" value={user?.email || ''} disabled />
              </div>
              <span className="field-hint">Email cannot be changed</span>
            </div>

            <div className="form-group">
              <label className="label-with-icon">
                <span className="label-icon">🌍</span>
                Country
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Enter your country"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label-with-icon">
                <span className="label-icon">📱</span>
                Phone
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="label-with-icon">
              <span className="label-icon">📍</span>
              Address
            </label>
            <div className="input-wrapper">
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                placeholder="Enter your full address"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <span className="loading-spinner"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="profile-section">
        <div className="section-header">
          <span className="section-icon">🔒</span>
          <h2>Security Settings</h2>
        </div>
        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label className="label-with-icon">
              <span className="label-icon">🔑</span>
              Current Password <span className="required-asterisk">*</span>
            </label>
            <div className="input-wrapper">
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
                placeholder="Enter your current password"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="label-with-icon">
                <span className="label-icon">🔐</span>
                New Password <span className="required-asterisk">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength="6"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label-with-icon">
                <span className="label-icon">✅</span>
                Confirm New Password <span className="required-asterisk">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength="6"
                  placeholder="Re-enter your new password"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <span className="loading-spinner"></span>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span>🔒</span>
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
