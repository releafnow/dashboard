import React, { useState } from 'react';
import { getUploadUrl } from '../utils/api';
import './TreeCard.css';

const TreeCard = ({ tree, isAdmin, onEdit, onDelete, onStatusChange }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTokens = (tokens) => {
    return parseFloat(tokens).toFixed(2);
  };

  // Get photos array from tree_photos table
  const photos = tree.photos || [];
  
  const hasMultiplePhotos = photos.length > 1;
  const currentPhoto = photos[currentPhotoIndex];
  
  const goToPrevPhoto = (e) => {
    e.stopPropagation();
    setCurrentPhotoIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
  };
  
  const goToNextPhoto = (e) => {
    e.stopPropagation();
    setCurrentPhotoIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="tree-card">
      <div className="tree-card-image">
        {currentPhoto && (
          <img
            src={getUploadUrl(`trees/${currentPhoto.filename}`)}
            alt={tree.tree_type}
            loading="lazy"
          />
        )}
        <div className={`tree-status-badge status-${tree.status}`}>
          {tree.status}
        </div>
        
        {/* Photo navigation for multiple photos */}
        {hasMultiplePhotos && (
          <>
            <button className="photo-nav-btn prev" onClick={goToPrevPhoto}>
              ‹
            </button>
            <button className="photo-nav-btn next" onClick={goToNextPhoto}>
              ›
            </button>
            <div className="photo-indicators">
              {photos.map((_, index) => (
                <span 
                  key={index}
                  className={`photo-indicator ${index === currentPhotoIndex ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex(index);
                  }}
                />
              ))}
            </div>
            <div className="photo-counter">
              {currentPhotoIndex + 1}/{photos.length}
            </div>
          </>
        )}
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
            <span>{formatDate(tree.planted_date)}</span>
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
              <span>{formatTokens(tree.tokens_allocated)} RLF</span>
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
              onClick={() => onStatusChange(tree.id, 'verified')}
            >
              Verify
            </button>
            <button
              className="btn-danger"
              onClick={() => onStatusChange(tree.id, 'rejected')}
            >
              Reject
            </button>
          </>
        )}
        {!isAdmin && tree.status === 'pending' && (
          <button
            className="btn-secondary"
            onClick={() => onEdit(tree)}
          >
            Edit
          </button>
        )}
        {!isAdmin && (
          <button
            className="btn-danger"
            onClick={() => onDelete(tree.id)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default TreeCard;
