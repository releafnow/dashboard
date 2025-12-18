import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axiosInstance from '../config/axios';
import { getUploadUrl } from '../utils/api';
import './TreeForm.css';

const TreeForm = ({ tree, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    planted_date: '',
    location: '',
    latitude: '',
    longitude: '',
    tree_type: '',
    notes: '',
    photo: null,
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (tree) {
      const dateValue = tree.planted_date ? tree.planted_date.split('T')[0] : '';
      setFormData({
        planted_date: dateValue,
        location: tree.location || '',
        latitude: tree.latitude || '',
        longitude: tree.longitude || '',
        tree_type: tree.tree_type || '',
        notes: tree.notes || '',
        photo: null,
      });
      setSelectedDate(dateValue ? new Date(dateValue) : null);
      if (tree.photo) {
        setPreview(getUploadUrl(`trees/${tree.photo}`));
      }
    } else {
      setSelectedDate(null);
    }
  }, [tree]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setFormData({
        ...formData,
        planted_date: `${year}-${month}-${day}`,
      });
    } else {
      setFormData({
        ...formData,
        planted_date: '',
      });
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('planted_date', formData.planted_date);
      submitData.append('location', formData.location);
      submitData.append('tree_type', formData.tree_type);
      if (formData.latitude) submitData.append('latitude', formData.latitude);
      if (formData.longitude) submitData.append('longitude', formData.longitude);
      if (formData.notes) submitData.append('notes', formData.notes);
      if (formData.photo) submitData.append('photo', formData.photo);

      if (tree) {
        await axiosInstance.put(`/api/trees/${tree.id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axiosInstance.post('/api/trees', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSubmit();
    } catch (error) {
      console.error('Submit tree error:', error);
      setError(error.response?.data?.message || 'Failed to save tree');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tree-form-overlay">
      <div className="tree-form-modal">
        <div className="tree-form-header">
          <div className="header-content">
            <span className="header-icon">🌱</span>
            <h2>{tree ? 'Edit Tree' : 'Add New Tree'}</h2>
          </div>
          <button className="close-btn" onClick={onCancel} aria-label="Close">
            <span>×</span>
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="tree-form">
          <div className="form-section">
            <div className="form-section-title">
              <span className="section-icon">📅</span>
              <span>Basic Information</span>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="label-with-icon">
                  <span className="label-icon mr-2">📆</span>
                  Planting Date <span className="required-asterisk">*</span>
                </label>
                <div className="input-wrapper">
                  <DatePicker
                    selected={selectedDate}
                    onChange={handleDateChange}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select planting date"
                    className="date-picker-input"
                    wrapperClassName="date-picker-wrapper"
                    maxDate={new Date()}
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    isClearable
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label-with-icon">
                  <span className="label-icon mr-2">🌳</span>
                  Tree Type <span className="required-asterisk">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    name="tree_type"
                    value={formData.tree_type}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Oak, Pine, Mango"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="label-with-icon">
                <span className="label-icon">📍</span>
                Location <span className="required-asterisk">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  placeholder="City, Country or full address"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">
              <span className="section-icon">🌐</span>
              <span>Coordinates (Optional)</span>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="label-with-icon">
                  <span className="label-icon">🔺</span>
                  Latitude
                </label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    placeholder="e.g., 40.7128"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label-with-icon">
                  <span className="label-icon">🔻</span>
                  Longitude
                </label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    placeholder="e.g., -74.0060"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">
              <span className="section-icon">📸</span>
              <span>Photo Evidence</span>
            </div>
            
            <div className="form-group">
              <label className="label-with-icon">
                <span className="label-icon mr-2">🖼️</span>
                Photo {!tree && <span className="required-asterisk">*</span>}
              </label>
              <div className="file-upload-area">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  required={!tree}
                  className="file-input-hidden"
                />
                <label htmlFor="photo-upload" className="file-upload-label">
                  {preview ? (
                    <div className="photo-preview-container">
                      <img src={preview} alt="Preview" className="photo-preview-img" />
                      <span className="photo-change-text">Click to change photo</span>
                    </div>
                  ) : (
                    <div className="file-upload-placeholder">
                      <span className="upload-icon">📁</span>
                      <span className="upload-text">Click to upload or drag and drop</span>
                      <span className="upload-hint">PNG, JPG up to 10MB</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">
              <span className="section-icon">📝</span>
              <span>Additional Notes</span>
            </div>

            <div className="form-group">
              <label className="label-with-icon">
                <span className="label-icon mr-2">💭</span>
                Notes
              </label>
              <div className="input-wrapper">
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Share additional information about the tree, planting conditions, or any special notes..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              <span>Cancel</span>
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{tree ? '✏️' : '✓'}</span>
                  <span>{tree ? 'Update Tree' : 'Plant Tree'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TreeForm;
