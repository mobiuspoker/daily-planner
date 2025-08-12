import { X, Calendar, Clock, FileText, Info } from "lucide-react";
import "./AboutModal.css";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>About Daily Planner</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="about-content">
          <div className="about-section">
            <div className="app-info">
              <h3>Daily Planner</h3>
              <p className="version">Version 1.0.0</p>
              <p className="description">
                A minimalist daily task planner with a paper-like aesthetic. 
                Designed to help you focus on what matters today.
              </p>
              <p className="creator">Created by Patrick Howard</p>
            </div>
          </div>

          <div className="about-section features-section">
            <h4>Features</h4>
            <div className="features-list">
              <div className="feature-item">
                <Calendar size={16} />
                <span>Daily task management</span>
              </div>
              <div className="feature-item">
                <Clock size={16} />
                <span>Smart time parsing & notifications</span>
              </div>
              <div className="feature-item">
                <FileText size={16} />
                <span>Weekly & monthly summaries</span>
              </div>
              <div className="feature-item">
                <Info size={16} />
                <span>Automatic midnight task archival</span>
              </div>
            </div>
          </div>

          <div className="about-footer">
            <p>© 2025 Patrick Howard. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}