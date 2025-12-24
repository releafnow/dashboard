import { useState, useEffect, useMemo } from 'react';

const ITEMS_PER_PAGE_OPTIONS = [6, 9, 12, 15];
const DEFAULT_ITEMS_PER_PAGE = 12;

const usePagination = (items = [], initialItemsPerPage = DEFAULT_ITEMS_PER_PAGE) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const totalPages = useMemo(() => {
    return Math.ceil(items.length / itemsPerPage);
  }, [items.length, itemsPerPage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const paginationInfo = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, items.length),
      total: items.length,
    };
  }, [items.length, currentPage, itemsPerPage]);

  // Reset to page 1 when items per page changes or when items array changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, items.length]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedItems,
    paginationInfo,
    setItemsPerPage,
    handlePageChange,
    ITEMS_PER_PAGE_OPTIONS,
  };
};

export default usePagination;
