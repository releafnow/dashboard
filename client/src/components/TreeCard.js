import React from 'react';
import { getUploadUrl } from '../utils/api';
import './TreeCard.css';

const TreeCard = ({ tree, isAdmin, onEdit, onDelete, onStatusChange }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTokens = (tokens) => {
    return parseFloat(tokens).toFixed(2);
  };

  return (
    <div className="tree-card">
      <div className="tree-card-image">
        <img
          src={getUploadUrl(`trees/${tree.photo}`)}
          alt={tree.tree_type}
          loading="lazy"
        />
        <div className={`tree-status-badge status-${tree.status}`}>
          {tree.status}
        </div>
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
