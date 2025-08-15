import React, { useState, useEffect, useMemo } from 'react';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { 
  listSummaryFiles, 
  deleteSummaryFile,
  SummaryFile 
} from '../services/summaryService';
import { generateWeeklyNow, generateMonthlyNow } from '../services/summaryScheduler';
import { Trash2, CalendarDays, Calendar, Copy, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';
import './SummaryViewer.css';

const ITEMS_PER_PAGE = 5;

export const SummaryViewer: React.FC = () => {
  const [files, setFiles] = useState<SummaryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SummaryFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'warning' } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'weekly' | 'monthly'>('all');

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    } else {
      setFileContent('');
    }
  }, [selectedFile]);

  useEffect(() => {
    // Reset to first page when search/filter changes
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const loadFiles = async () => {
    try {
      const summaryFiles = await listSummaryFiles();
      setFiles(summaryFiles);
    } catch (error) {
      console.error('Error loading summary files:', error);
    }
  };

  const loadFileContent = async (file: SummaryFile) => {
    try {
      const content = await readTextFile(file.path);
      setFileContent(content);
    } catch (error) {
      console.error('Error reading file:', error);
      setFileContent('Error loading file content');
    }
  };

  const handleGenerateWeekly = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await generateWeeklyNow();
      await loadFiles();
      
      // Check if the summary has no tasks
      if (result.plainMarkdown.includes('*No tasks completed during this period.*')) {
        setMessage({ 
          text: 'No tasks were completed last week. Summary created anyway.', 
          type: 'info' 
        });
        // Auto-clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error generating weekly summary:', error);
      setMessage({ 
        text: 'Failed to generate weekly summary. Please try again.', 
        type: 'warning' 
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMonthly = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await generateMonthlyNow();
      await loadFiles();
      
      // Check if the summary has no tasks
      if (result.plainMarkdown.includes('*No tasks completed during this period.*')) {
        setMessage({ 
          text: 'No tasks were completed last month. Summary created anyway.', 
          type: 'info' 
        });
        // Auto-clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error generating monthly summary:', error);
      setMessage({ 
        text: 'Failed to generate monthly summary. Please try again.', 
        type: 'warning' 
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (fileContent) {
      await navigator.clipboard.writeText(fileContent);
    }
  };

  const handleDelete = async (file: SummaryFile, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirm(`Delete this summary?`)) {
      try {
        await deleteSummaryFile(file.path);
        if (selectedFile?.path === file.path) {
          setSelectedFile(null);
        }
        await loadFiles();
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const formatFileLabel = (fileName: string): string => {
    if (fileName.startsWith('weekly-')) {
      const parts = fileName.replace('weekly-', '').replace('.md', '').split('-');
      const year = parts[0];
      const week = parts[1];
      return `Week ${week}, ${year}`;
    } else if (fileName.startsWith('monthly-')) {
      const parts = fileName.replace('monthly-', '').replace('.md', '').split('-');
      const year = parts[0];
      const month = parseInt(parts[1]);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[month - 1]} ${year}`;
    }
    return fileName;
  };

  // Calculate counts for each type
  const typeCounts = useMemo(() => {
    const counts = {
      all: files.length,
      weekly: files.filter(f => f.type === 'weekly').length,
      monthly: files.filter(f => f.type === 'monthly').length
    };
    return counts;
  }, [files]);

  // Filter and search logic
  const filteredFiles = useMemo(() => {
    let filtered = [...files];
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(file => file.type === filterType);
    }
    
    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(file => {
        const label = formatFileLabel(file.name).toLowerCase();
        return label.includes(searchLower);
      });
    }
    
    return filtered;
  }, [files, filterType, searchTerm]);

  // Sort and paginate files
  const sortedAndPaginatedFiles = useMemo(() => {
    // Sort files: monthly first, then by date descending
    const sorted = [...filteredFiles].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'monthly' ? -1 : 1;
      }
      return b.name.localeCompare(a.name);
    });
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sorted.slice(startIndex, endIndex);
  }, [filteredFiles, currentPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  }, [filteredFiles]);

  const renderMarkdown = (content: string): string => {
    let html = content
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Handle numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');
    
    // Handle bullet lists if any remain
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>(?!.*<ol).*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    html = html
      .replace(/\n\n/g, '</p><p>')
      .replace(/^([^<].*)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');
    
    return html;
  };

  const renderFileItem = (file: SummaryFile) => (
    <div
      key={file.path}
      className={`summary-file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
      onClick={() => setSelectedFile(file)}
    >
      {file.type === 'weekly' ? (
        <CalendarDays size={18} className="file-type-icon" />
      ) : (
        <Calendar size={18} className="file-type-icon" />
      )}
      <span className="file-label">{formatFileLabel(file.name)}</span>
      <span className="file-type-badge">
        {file.type === 'weekly' ? 'W' : 'M'}
      </span>
      <button
        className="delete-button"
        onClick={(e) => handleDelete(file, e)}
        aria-label="Delete summary"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <div className="summary-viewer">
      <div className="summary-content">
        <div className="summary-actions">
          <button 
            onClick={handleGenerateWeekly} 
            disabled={isLoading}
            className="summary-action-button"
          >
            Generate Previous Week
          </button>
          <button 
            onClick={handleGenerateMonthly} 
            disabled={isLoading}
            className="summary-action-button"
          >
            Generate Previous Month
          </button>
        </div>

        {message && (
          <div className={`summary-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="summary-controls">
          <div className="search-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search summaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <CustomDropdown
            id="filter-type"
            value={filterType}
            options={[
              { value: 'all', label: `All Summaries (${typeCounts.all})` },
              { value: 'weekly', label: `Weekly Only (${typeCounts.weekly})` },
              { value: 'monthly', label: `Monthly Only (${typeCounts.monthly})` }
            ]}
            onChange={(value) => setFilterType(value as 'all' | 'weekly' | 'monthly')}
          />
        </div>

        <div className="summary-files">
          {filteredFiles.length === 0 && !selectedFile ? (
            <div className="empty-state">
              <p>{searchTerm || filterType !== 'all' ? 'No summaries match your criteria' : 'No summaries yet'}</p>
              <p className="empty-hint">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Generate your first weekly or monthly summary above'}
              </p>
            </div>
          ) : (
            sortedAndPaginatedFiles.map(file => renderFileItem(file))
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="pagination-button"
              aria-label="First page"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-button"
              aria-label="Last page"
            >
              Last
            </button>
          </div>
        )}

        {selectedFile && (
          <div className="summary-preview">
            <button 
              onClick={handleCopy}
              className="copy-button"
              aria-label="Copy summary"
            >
              <Copy size={16} />
            </button>
            <div 
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(fileContent) }}
            />
          </div>
        )}
      </div>
    </div>
  );
};