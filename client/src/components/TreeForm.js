import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axiosInstance from '../config/axios';
import { getUploadUrl } from '../utils/api';
import { showSuccess, showError } from '../utils/toast';
import './TreeForm.css';

const MAX_PHOTOS = 10;

const TreeForm = ({ tree, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    planted_date: '',
    location: '',
    latitude: '',
    longitude: '',
    tree_type: '',
    notes: '',
  });
  
  // Multiple photos support
  const [newPhotos, setNewPhotos] = useState([]); // New files to upload
  const [newPreviews, setNewPreviews] = useState([]); // Preview URLs for new files
  const [existingPhotos, setExistingPhotos] = useState([]); // Existing photos from server (when editing)
  const [primaryNewPhotoIndex, setPrimaryNewPhotoIndex] = useState(0); // Index of primary photo among new photos
  
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
      });
      setSelectedDate(dateValue ? new Date(dateValue) : null);
      
      // Load existing photos from tree_photos table
      if (tree.photos && tree.photos.length > 0) {
        setExistingPhotos(tree.photos);
      }
      
      // Reset new photos
      setNewPhotos([]);
      setNewPreviews([]);
      setPrimaryNewPhotoIndex(0);
    } else {
      setSelectedDate(null);
      setExistingPhotos([]);
      setNewPhotos([]);
      setNewPreviews([]);
      setPrimaryNewPhotoIndex(0);
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

  const totalPhotosCount = existingPhotos.length + newPhotos.length;

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check total photos limit
    const remainingSlots = MAX_PHOTOS - totalPhotosCount;
    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setError(`Only ${remainingSlots} more photo(s) can be added. Maximum is ${MAX_PHOTOS}.`);
    }

    // Add new files
    setNewPhotos(prev => [...prev, ...filesToAdd]);

    // Generate previews for new files
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPreviews(prev => [...prev, { file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset the input
    e.target.value = '';
  };

  const removeExistingPhoto = (photoId) => {
    // Don't allow removing the last photo
    if (existingPhotos.length + newPhotos.length <= 1) {
      setError('At least one photo is required');
      return;
    }
    setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    setError('');
  };

  const removeNewPhoto = (index) => {
    // Don't allow removing the last photo
    if (existingPhotos.length + newPhotos.length <= 1) {
      setError('At least one photo is required');
      return;
    }

    setNewPhotos(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
    
    // Adjust primary index if needed
    if (index < primaryNewPhotoIndex) {
      setPrimaryNewPhotoIndex(prev => prev - 1);
    } else if (index === primaryNewPhotoIndex) {
      setPrimaryNewPhotoIndex(0);
    }
    
    setError('');
  };

  // Set an existing photo as primary
  const setExistingPhotoAsPrimary = (photoId) => {
    setExistingPhotos(prev => prev.map(photo => ({
      ...photo,
      is_primary: photo.id === photoId
    })));
    // When setting an existing photo as primary, no new photo should be primary
    setPrimaryNewPhotoIndex(-1);
  };

  // Set a new photo as primary
  const setNewPhotoAsPrimary = (index) => {
    // When setting a new photo as primary, no existing photo should be primary
    setExistingPhotos(prev => prev.map(photo => ({
      ...photo,
      is_primary: false
    })));
    setPrimaryNewPhotoIndex(index);
  };

  // Check if any existing photo is primary
  const hasExistingPrimary = existingPhotos.some(p => p.is_primary);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate at least one photo
    if (existingPhotos.length === 0 && newPhotos.length === 0) {
      setError('At least one photo is required');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('planted_date', formData.planted_date);
      submitData.append('location', formData.location);
      submitData.append('tree_type', formData.tree_type);
      if (formData.latitude) submitData.append('latitude', formData.latitude);
      if (formData.longitude) submitData.append('longitude', formData.longitude);
      if (formData.notes) submitData.append('notes', formData.notes);

      // Append all new photos
      newPhotos.forEach(photo => {
        submitData.append('photos', photo);
      });

      // For updates, include IDs of existing photos to keep
      if (tree) {
        const keepPhotoIds = existingPhotos.map(p => p.id).filter(id => id !== 'legacy');
        submitData.append('keepPhotos', JSON.stringify(keepPhotoIds));
      }
      
      // Include primary photo information
      const primaryExistingPhoto = existingPhotos.find(p => p.is_primary);
      if (primaryExistingPhoto) {
        submitData.append('primaryPhotoId', primaryExistingPhoto.id);
      } else if (newPhotos.length > 0) {
        // Primary is among new photos
        submitData.append('primaryNewPhotoIndex', primaryNewPhotoIndex >= 0 ? primaryNewPhotoIndex : 0);
      }

      if (tree) {
        await axiosInstance.put(`/api/trees/${tree.id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showSuccess('Tree updated successfully! 🌳');
      } else {
        await axiosInstance.post('/api/trees', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showSuccess('Tree planted successfully! 🌱');
      }

      onSubmit();
    } catch (error) {
      console.error('Submit tree error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save tree';
      setError(errorMessage);
      showError(errorMessage);
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
              <span className="photo-count-badge">
                {totalPhotosCount}/{MAX_PHOTOS}
              </span>
            </div>

            <div className="form-group">
              <label className="label-with-icon">
                <span className="label-icon mr-2">🖼️</span>
                Photos {!tree && <span className="required-asterisk">*</span>}
                <span className="label-hint">(Up to {MAX_PHOTOS} images)</span>
              </label>
              
              {/* Photo Grid */}
              {(existingPhotos.length > 0 || newPreviews.length > 0) && (
                <div className="photos-grid">
                  {/* Existing photos */}
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className={`photo-item ${photo.is_primary ? 'is-primary' : ''}`}>
                      <img 
                        src={getUploadUrl(`trees/${photo.filename}`)} 
                        alt="Tree" 
                        className="photo-thumbnail"
                      />
                      {photo.is_primary ? (
                        <span className="primary-badge">Primary</span>
                      ) : (
                        <button
                          type="button"
                          className="set-primary-btn"
                          onClick={() => setExistingPhotoAsPrimary(photo.id)}
                          title="Set as primary"
                        >
                          ★ Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        className="photo-remove-btn"
                        onClick={() => removeExistingPhoto(photo.id)}
                        title="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* New photo previews */}
                  {newPreviews.map((item, index) => {
                    const isNewPrimary = !hasExistingPrimary && index === (primaryNewPhotoIndex >= 0 ? primaryNewPhotoIndex : 0);
                    return (
                      <div key={`new-${index}`} className={`photo-item new-photo ${isNewPrimary ? 'is-primary' : ''}`}>
                        <img 
                          src={item.preview} 
                          alt={`New ${index + 1}`} 
                          className="photo-thumbnail"
                        />
                        {isNewPrimary ? (
                          <>
                            <span className="new-badge">New</span>
                            <span className="primary-badge">Primary</span>
                          </>
                        ) : (
                          <>
                            <span className="new-badge">New</span>
                            <button
                              type="button"
                              className="set-primary-btn"
                              onClick={() => setNewPhotoAsPrimary(index)}
                              title="Set as primary"
                            >
                              ★ Set Primary
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="photo-remove-btn"
                          onClick={() => removeNewPhoto(index)}
                          title="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload area */}
              {totalPhotosCount < MAX_PHOTOS && (
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="photo-upload"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="file-input-hidden"
                  />
                  <label htmlFor="photo-upload" className="file-upload-label compact">
                    <div className="file-upload-placeholder">
                      <span className="upload-icon">📁</span>
                      <span className="upload-text">
                        {totalPhotosCount === 0 
                          ? 'Click to upload photos' 
                          : 'Add more photos'}
                      </span>
                      <span className="upload-hint">
                        PNG, JPG up to 10MB each • {MAX_PHOTOS - totalPhotosCount} slot(s) remaining
                      </span>
                    </div>
                  </label>
                </div>
              )}
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
