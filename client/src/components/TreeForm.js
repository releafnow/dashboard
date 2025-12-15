import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (tree) {
      setFormData({
        planted_date: tree.planted_date ? tree.planted_date.split('T')[0] : '',
        location: tree.location || '',
        latitude: tree.latitude || '',
        longitude: tree.longitude || '',
        tree_type: tree.tree_type || '',
        notes: tree.notes || '',
        photo: null,
      });
      if (tree.photo) {
        setPreview(getUploadUrl(`trees/${tree.photo}`));
      }
    }
  }, [tree]);

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
          <h2>{tree ? 'Edit Tree' : 'Add New Tree'}</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="tree-form">
          <div className="form-row">
            <div className="form-group">
              <label>Planting Date *</label>
              <input
                type="date"
                name="planted_date"
                value={formData.planted_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Tree Type *</label>
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

          <div className="form-group">
            <label>Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="City, Country or full address"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Latitude (optional)</label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="e.g., 40.7128"
              />
            </div>

            <div className="form-group">
              <label>Longitude (optional)</label>
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

          <div className="form-group">
            <label>Photo {!tree && '*'}</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              required={!tree}
            />
            {preview && (
              <div className="photo-preview">
                <img src={preview} alt="Preview" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Additional information about the tree..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : tree ? 'Update' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TreeForm;
