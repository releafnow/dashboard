import React from 'react';
import './PageHeader.css';

const PageHeader = ({ 
  title, 
  countInfo, 
  itemsPerPage, 
  itemsPerPageOptions, 
  onItemsPerPageChange,
  actionButton 
}) => {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>{title}</h1>
        {countInfo && (
          <p className="trees-count">
            Showing <span className="count-highlight">{countInfo.startIndex}-{countInfo.endIndex}</span> of <span className="count-total">{countInfo.total}</span> {countInfo.total === 1 ? 'tree' : 'trees'}
          </p>
        )}
      </div>
      <div className="header-actions">
        {itemsPerPageOptions && (
          <div className="items-per-page-selector">
            <label htmlFor="items-per-page">Show</label>
            <div className="select-wrapper">
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="items-per-page-select"
              >
                {itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {actionButton}
      </div>
    </div>
  );
};

export default PageHeader;
