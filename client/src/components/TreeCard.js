import React, { useState } from 'react';
import { getUploadUrl } from '../utils/api';
import './TreeCard.css';

const TreeCard = ({ tree, isAdmin, onEdit, onDelete, onStatusChange }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [galleryPhotoIndex, setGalleryPhotoIndex] = useState(0);
  
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

  // Handle photo section click to open gallery
  const handlePhotoClick = () => {
    if (hasMultiplePhotos) {
      setGalleryPhotoIndex(currentPhotoIndex);
      setShowPhotoGallery(true);
    }
  };

  // Gallery navigation
  const goToPrevGalleryPhoto = () => {
    setGalleryPhotoIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNextGalleryPhoto = () => {
    setGalleryPhotoIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  // Handle keyboard events for gallery
  React.useEffect(() => {
    if (!showPhotoGallery) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowPhotoGallery(false);
      } else if (e.key === 'ArrowLeft') {
        setGalleryPhotoIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setGalleryPhotoIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPhotoGallery, photos.length]);

  return (
    <>
      <div className="tree-card">
        <div 
          className={`tree-card-image ${hasMultiplePhotos ? 'clickable' : ''}`}
          onClick={handlePhotoClick}
        >
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

              <div className="photo-click-hint">
                Click to view gallery
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
              className="btn-edit"
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

      {/* Photo Gallery Popup - rendered outside tree-card to avoid overflow issues */}
      {showPhotoGallery && photos.length > 0 && (
        <div 
          className="photo-gallery-overlay" 
          onClick={() => setShowPhotoGallery(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
        >
          <div className="photo-gallery-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="photo-gallery-close"
              onClick={() => setShowPhotoGallery(false)}
              aria-label="Close gallery"
            >
              ×
            </button>

            <div className="photo-gallery-container">
              <img
                src={getUploadUrl(`trees/${photos[galleryPhotoIndex].filename}`)}
                alt={`${tree.tree_type} - Photo ${galleryPhotoIndex + 1}`}
                className="photo-gallery-image"
              />

              {photos.length > 1 && (
                <>
                  <button 
                    className="photo-gallery-nav prev"
                    onClick={goToPrevGalleryPhoto}
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>
                  <button 
                    className="photo-gallery-nav next"
                    onClick={goToNextGalleryPhoto}
                    aria-label="Next photo"
                  >
                    ›
                  </button>

                  <div className="photo-gallery-info">
                    <span className="photo-gallery-counter">
                      {galleryPhotoIndex + 1} / {photos.length}
                    </span>
                  </div>
                  
                  <div className="photo-gallery-thumbnails">
                    {photos.map((photo, index) => (
                      <img
                        key={index}
                        src={getUploadUrl(`trees/${photo.filename}`)}
                        alt={`Thumbnail ${index + 1}`}
                        className={`photo-gallery-thumbnail ${index === galleryPhotoIndex ? 'active' : ''}`}
                        onClick={() => setGalleryPhotoIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TreeCard;
