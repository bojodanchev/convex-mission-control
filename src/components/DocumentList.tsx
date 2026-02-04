import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const DocumentList: React.FC = () => {
  const documents = useQuery(api.documents.list, { limit: 50 });
  const createDocument = useMutation(api.documents.create);
  const [isCreating, setIsCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");

  if (!documents) {
    return <div className="loading">Loading documents...</div>;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    await createDocument({
      title: newDocTitle,
      content: "# New Document\n\nStart writing...",
      type: "note",
    });
    setNewDocTitle("");
    setIsCreating(false);
  };

  return (
    <div className="document-list-container">
      <div className="docs-header">
        <h3>📄 Knowledge Base</h3>
        <button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? "Cancel" : "+ New Doc"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="create-doc-form">
          <input
            type="text"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            placeholder="Document Title"
            autoFocus
          />
          <button type="submit">Create</button>
        </form>
      )}

      <div className="docs-grid">
        {documents.map((doc) => (
          <div key={doc._id} className="doc-card">
            <div className="doc-icon">
              {doc.type === "standup" ? "📊" : "📄"}
            </div>
            <div className="doc-info">
              <h4>{doc.title}</h4>
              <span className="doc-meta">
                {new Date(doc.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentList;
