import React, { useState } from "react";
import { Doc, Id } from "../../convex/_generated/dataModel";

interface DocumentViewerProps {
  document: Doc<"documents"> & { createdByName?: string };
  onClose: () => void;
  onUpdate: (id: Id<"documents">, updates: { title?: string; content?: string }) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(document.title);
  const [editContent, setEditContent] = useState(document.content);

  const handleSave = () => {
    onUpdate(document._id, { title: editTitle, content: editContent });
    setIsEditing(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "standup": return "📊";
      case "research": return "🔬";
      case "protocol": return "📋";
      case "deliverable": return "📦";
      default: return "📝";
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="document-viewer-overlay">
      <div className="document-viewer">
        <div className="viewer-header">
          <div className="viewer-title-section">
            <span className="doc-type-icon">{getTypeIcon(document.type)}</span>
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="edit-title-input"
              />
            ) : (
              <h2>{document.title}</h2>
            )}
            <span className="doc-type-badge">{getTypeLabel(document.type)}</span>
          </div>
          <div className="viewer-actions">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="save-btn">Save</button>
                <button onClick={() => setIsEditing(false)} className="cancel-btn">Cancel</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="edit-btn">Edit</button>
            )}
            <button onClick={onClose} className="close-btn">×</button>
          </div>
        </div>

        <div className="viewer-meta">
          <span>Created by: {document.createdByName || "Unknown"}</span>
          <span>•</span>
          <span>{new Date(document.createdAt).toLocaleDateString()}</span>
          <span>•</span>
          <span>Updated: {new Date(document.updatedAt).toLocaleDateString()}</span>
        </div>

        <div className="viewer-content">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="edit-content-textarea"
              rows={30}
            />
          ) : (
            <div className="markdown-content">
              {document.content.split('\n').map((line, i) => (
                <p key={i}>{line || <br />}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
