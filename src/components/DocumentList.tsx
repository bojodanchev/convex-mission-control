import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import DocumentViewer from "./DocumentViewer";

const DocumentList: React.FC = () => {
  const documents = useQuery(api.documents.list, { limit: 50 });
  const createDocument = useMutation(api.documents.create);
  const updateDocument = useMutation(api.documents.update);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState<"note" | "research" | "protocol" | "deliverable">("note");
  const [filterType, setFilterType] = useState<string | "all">("all");
  const [selectedDoc, setSelectedDoc] = useState<(Doc<"documents"> & { createdByName?: string }) | null>(null);

  if (!documents) {
    return <div className="loading">Loading documents...</div>;
  }

  const filteredDocs = filterType === "all" 
    ? documents 
    : documents.filter(d => d.type === filterType);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    
    await createDocument({
      title: newDocTitle,
      content: `# ${newDocTitle}\n\nStart writing...`,
      type: newDocType,
    });
    
    setNewDocTitle("");
    setIsCreating(false);
  };

  const handleUpdate = async (id: string, updates: { title?: string; content?: string }) => {
    await updateDocument({ id, ...updates });
    // Refresh selected doc
    if (selectedDoc) {
      setSelectedDoc({ ...selectedDoc, ...updates, updatedAt: Date.now() });
    }
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

  const docTypes = [
    { value: "all", label: "All Types", icon: "📁" },
    { value: "research", label: "Research", icon: "🔬" },
    { value: "protocol", label: "Protocol", icon: "📋" },
    { value: "deliverable", label: "Deliverable", icon: "📦" },
    { value: "note", label: "Note", icon: "📝" },
    { value: "standup", label: "Standup", icon: "📊" },
  ];

  return (
    <div className="document-list-container">
      <div className="docs-header">
        <div className="docs-title-section">
          <h3>📄 Knowledge Base</h3>
          <span className="docs-count">{filteredDocs.length} documents</span>
        </div>
        <button 
          className="create-doc-btn"
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? "Cancel" : "+ New Document"}
        </button>
      </div>

      <div className="docs-filter-bar">
        {docTypes.map(type => (
          <button
            key={type.value}
            className={`filter-pill ${filterType === type.value ? "active" : ""}`}
            onClick={() => setFilterType(type.value)}
          >
            <span>{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="create-doc-form">
          <div className="form-row">
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="Document Title"
              autoFocus
              className="doc-title-input"
            />
            <select 
              value={newDocType} 
              onChange={(e) => setNewDocType(e.target.value as any)}
              className="doc-type-select"
            >
              <option value="note">📝 Note</option>
              <option value="research">🔬 Research</option>
              <option value="protocol">📋 Protocol</option>
              <option value="deliverable">📦 Deliverable</option>
            </select>
            <button type="submit" className="create-btn">Create</button>
          </div>
        </form>
      )}

      {filteredDocs.length === 0 ? (
        <div className="empty-docs">
          <p>No documents found</p>
          {filterType !== "all" && (
            <button onClick={() => setFilterType("all")}>Clear filter</button>
          )}
        </div>
      ) : (
        <div className="docs-grid">
          {filteredDocs.map((doc) => (
            <div 
              key={doc._id} 
              className="doc-card"
              onClick={() => setSelectedDoc(doc as any)}
            >
              <div className="doc-icon">{getTypeIcon(doc.type)}</div>
              <div className="doc-info">
                <h4>{doc.title}</h4>
                <div className="doc-meta">
                  <span className="doc-type">{getTypeLabel(doc.type)}</span>
                  <span>•</span>
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDoc && (
        <DocumentViewer
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
};

export default DocumentList;
