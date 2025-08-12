import React, { useState, useEffect } from 'react';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  listSummaryFiles, 
  openSummaryFile, 
  deleteSummaryFile,
  getDestinationFolder,
  SummaryFile 
} from '../services/summaryService';
import { generateWeeklyNow, generateMonthlyNow } from '../services/summaryScheduler';
import { setSetting } from '../services/settingsService';
import './SummaryViewer.css';

export const SummaryViewer: React.FC = () => {
  const [files, setFiles] = useState<SummaryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SummaryFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [destinationFolder, setDestinationFolder] = useState<string>('');

  useEffect(() => {
    loadFiles();
    loadDestinationFolder();
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
      if (!selectedFile && summaryFiles.length > 0) {
        setSelectedFile(summaryFiles[0]);
      }
    } catch (error) {
      console.error('Error loading summary files:', error);
    }
  };

  const loadDestinationFolder = async () => {
    const folder = await getDestinationFolder();
    setDestinationFolder(folder);
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

  const handleOpenInEditor = async () => {
    if (selectedFile) {
      await openSummaryFile(selectedFile.path);
    }
  };

  const handleCopy = async () => {
    if (fileContent) {
      await navigator.clipboard.writeText(fileContent);
    }
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    
    if (confirm(`Delete ${selectedFile.name}?`)) {
      try {
        await deleteSummaryFile(selectedFile.path);
        setSelectedFile(null);
        await loadFiles();
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const handleChooseFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Choose Summary Destination Folder'
    });

    if (selected && typeof selected === 'string') {
      await setSetting('summaryDestinationFolder', selected);
      setDestinationFolder(selected);
      await loadFiles();
    }
  };

  const formatFileDate = (fileName: string): string => {
    if (fileName.startsWith('weekly-')) {
      const weekId = fileName.replace('weekly-', '').replace('.md', '');
      return `Week ${weekId}`;
    } else if (fileName.startsWith('monthly-')) {
      const monthId = fileName.replace('monthly-', '').replace('.md', '');
      return monthId;
    }
    return fileName;
  };

  const renderMarkdown = (content: string): string => {
    return content
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^([^<].*)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');
  };

  return (
    <div className="summary-viewer">
      <div className="summary-header">
        <h1>Task Summaries</h1>
        <div className="summary-actions">
          <button 
            onClick={handleGenerateWeekly} 
            disabled={isLoading}
            className="action-button"
          >
            Generate Weekly Now
          </button>
          <button 
            onClick={handleGenerateMonthly} 
            disabled={isLoading}
            className="action-button"
          >
            Generate Monthly Now
          </button>
          <button 
            onClick={handleOpenInEditor}
            disabled={!selectedFile}
            className="action-button"
          >
            Open in Editor
          </button>
          <button 
            onClick={handleCopy}
            disabled={!fileContent}
            className="action-button"
          >
            Copy
          </button>
          <button 
            onClick={handleDelete}
            disabled={!selectedFile}
            className="action-button delete"
          >
            Delete
          </button>
          <button 
            onClick={handleChooseFolder}
            className="action-button"
          >
            Choose Folder...
          </button>
        </div>
      </div>

      <div className="summary-folder-info">
        <span>Destination: {destinationFolder}</span>
      </div>

      <div className="summary-content">
        <div className="summary-list">
          <h2>Summary Files</h2>
          <ul>
            {files.length === 0 ? (
              <li className="empty-state">No summaries yet</li>
            ) : (
              files.map((file) => (
                <li
                  key={file.path}
                  className={selectedFile?.path === file.path ? 'selected' : ''}
                  onClick={() => setSelectedFile(file)}
                >
                  <span className="file-type">{file.type === 'weekly' ? '📅' : '📆'}</span>
                  <span className="file-name">{formatFileDate(file.name)}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="summary-preview">
          {selectedFile ? (
            <>
              <h2>{selectedFile.name}</h2>
              <div 
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(fileContent) }}
              />
            </>
          ) : (
            <div className="empty-state">
              <p>Select a summary to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};