import React, { useState, useEffect } from 'react';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { 
  listSummaryFiles, 
  deleteSummaryFile,
  getDestinationFolder,
  SummaryFile 
} from '../services/summaryService';
import { generateWeeklyNow, generateMonthlyNow } from '../services/summaryScheduler';
import { setSetting } from '../services/settingsService';
import { Trash2, CalendarDays, Calendar, Copy } from 'lucide-react';
import './SummaryViewer.css';

export const SummaryViewer: React.FC = () => {
  const [files, setFiles] = useState<SummaryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SummaryFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

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
    try {
      await generateWeeklyNow();
      await loadFiles();
    } catch (error) {
      console.error('Error generating weekly summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMonthly = async () => {
    setIsLoading(true);
    try {
      await generateMonthlyNow();
      await loadFiles();
    } catch (error) {
      console.error('Error generating monthly summary:', error);
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
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[month - 1]} ${year}`;
    }
    return fileName;
  };

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

  return (
    <div className="summary-viewer">
      <div className="summary-content">
        <div className="summary-actions">
          <button 
            onClick={handleGenerateWeekly} 
            disabled={isLoading}
            className="summary-action-button"
          >
            Generate Weekly
          </button>
          <button 
            onClick={handleGenerateMonthly} 
            disabled={isLoading}
            className="summary-action-button"
          >
            Generate Monthly
          </button>
        </div>

        <div className="summary-files">
          {files.length === 0 && !selectedFile ? (
            <div className="empty-state">
              <p>No summaries yet</p>
              <p className="empty-hint">Generate your first weekly or monthly summary above</p>
            </div>
          ) : (
            files.map((file) => (
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
                <button
                  className="delete-button"
                  onClick={(e) => handleDelete(file, e)}
                  aria-label="Delete summary"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

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