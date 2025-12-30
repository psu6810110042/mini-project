import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getCodes,
  createCodeService,
  likeCodeService,
  deleteCodeService,
  updateCodeService,
} from "../services/codeService";
import type { CodeSnippet, User } from "../types";

const Dashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [codes, setCodes] = useState<CodeSnippet[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- State สำหรับ Create/Edit ---
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newLang, setNewLang] = useState("javascript");
  const [newVisibility, setNewVisibility] = useState<"PUBLIC" | "PRIVATE">(
    "PUBLIC",
  );
  const [newTags, setNewTags] = useState("");

  const [selectedCode, setSelectedCode] = useState<CodeSnippet | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const storedUserStr = localStorage.getItem("user");
    if (storedUserStr) {
      try {
        setCurrentUser(JSON.parse(storedUserStr));
      } catch (e) {
        console.error(e);
      }
    }
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const data = await getCodes();
    if (Array.isArray(data)) {
      setCodes(data);

      // ✅ 4. เพิ่ม Logic: ถ้ามี id ใน URL ให้เลือก Snippet นั้นขึ้นมาโชว์เลย
      if (id) {
        const foundSnippet = data.find((code) => code.id === id);
        if (foundSnippet) {
          setSelectedCode(foundSnippet); // แสดงผลทันที
          // เลื่อนหน้าจอขึ้นบนสุด (เผื่อดูในมือถือ)
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // --- Actions ---
  const handleCreate = async () => {
    if (!newContent) return alert("กรุณาใส่เนื้อหา Code");

    const titleToSend = currentUser ? newTitle || "Untitled" : "Untitled";
    const langToSend = currentUser ? newLang : "text";

    try {
      const tagsArray = newTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");
      await createCodeService({
        title: titleToSend,
        content: newContent,
        language: langToSend,
        visibility: newVisibility,
        tags: tagsArray,
      });
      setNewTitle("");
      setNewContent("");
      setNewTags("");
      fetchData();
      alert("Paste created successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCode) return;
    try {
      await updateCodeService(selectedCode.id, {
        title: selectedCode.title,
        content: selectedCode.content,
      });
      setIsEditing(false);
      fetchData();
      alert("Updated!");
    } catch (err) {
      alert("Update failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this paste?")) return;
    try {
      await deleteCodeService(id);
      setSelectedCode(null);
      fetchData();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleLike = async (id: string) => {
    if (!currentUser) {
      alert("กรุณาเข้าสู่ระบบเพื่อกด Like");
      return;
    }
    await likeCodeService(id);
    fetchData();
    if (selectedCode && selectedCode.id === id) {
      const updatedList = await getCodes();
      const updatedItem = updatedList.find((c) => c.id === id);
      if (updatedItem) setSelectedCode(updatedItem);
    }
  };

  const resetToCreateMode = () => {
    setSelectedCode(null);
    setIsEditing(false);
  };

  return (
    <div style={styles.pageContainer}>
      {/* 1. NAVBAR */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <h1 style={styles.logo} onClick={resetToCreateMode}>
              PASTEBIN
              <span style={{ fontSize: "12px", color: "#ccc" }}> clone</span>
            </h1>
            <button style={styles.navBtn} onClick={resetToCreateMode}>
              + New Paste
            </button>
          </div>

          <div style={styles.searchBarContainer}>
            <input placeholder="Search..." style={styles.searchInput} />
            <button style={styles.searchBtn}>🔍</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {currentUser ? (
              <>
                <span style={{ color: "#ccc", fontSize: "14px" }}>
                  Welcome, <b>{currentUser.username}</b>
                </span>
                <button onClick={handleLogout} style={styles.logoutBtn}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  style={styles.loginBtn}
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/register")}
                  style={styles.registerBtn}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 2. MAIN LAYOUT */}
      <div style={styles.mainLayout}>
        {/* --- LEFT COLUMN: Editor --- */}
        <div style={styles.leftColumn}>
          {/* ✅ WARNING BANNER (เฉพาะ Guest) */}
          {!currentUser && !selectedCode && (
            <div style={styles.warningBanner}>
              <span style={{ marginRight: "10px", fontSize: "18px" }}>ⓘ</span>
              <span>
                You are currently not logged in, this means you can not edit or
                delete anything you paste.{" "}
                <span onClick={() => navigate("/register")} style={styles.link}>
                  Sign Up
                </span>
                {" or "}
                <span onClick={() => navigate("/login")} style={styles.link}>
                  Login
                </span>
              </span>
            </div>
          )}

          <div style={styles.editorHeader}>
            {selectedCode ? (
              <h3>
                {isEditing ? "Editing Paste" : selectedCode.title}
                {!isEditing && (
                  <span style={styles.badge}>{selectedCode.language}</span>
                )}
              </h3>
            ) : (
              <h3>New Paste</h3>
            )}
          </div>

          <div style={styles.editorContainer}>
            {selectedCode && !isEditing ? (
              // VIEW MODE
              <pre style={styles.codeView}>
                <code>{selectedCode.content}</code>
              </pre>
            ) : (
              // CREATE / EDIT MODE
              <textarea
                style={styles.textarea}
                placeholder="Paste your code here..."
                value={
                  selectedCode && isEditing ? selectedCode.content : newContent
                }
                onChange={(e) => {
                  if (isEditing && selectedCode)
                    setSelectedCode({
                      ...selectedCode,
                      content: e.target.value,
                    });
                  else setNewContent(e.target.value);
                }}
              />
            )}
          </div>

          {/* ✅ Settings Area & Create Button (เฉพาะ User ที่ Login แล้วเท่านั้น) */}
          {currentUser && (!selectedCode || isEditing) && (
            <div style={styles.settingsPanel}>
              <h4
                style={{
                  color: "#fff",
                  borderBottom: "1px solid #444",
                  paddingBottom: "5px",
                }}
              >
                Optional Paste Settings
              </h4>

              <div style={styles.formGroup}>
                <label style={styles.label}>Paste Title:</label>
                <input
                  style={styles.input}
                  value={
                    selectedCode && isEditing ? selectedCode.title : newTitle
                  }
                  onChange={(e) => {
                    if (isEditing && selectedCode)
                      setSelectedCode({
                        ...selectedCode,
                        title: e.target.value,
                      });
                    else setNewTitle(e.target.value);
                  }}
                />
              </div>

              <div style={styles.row}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Syntax Highlight:</label>
                  <select
                    style={styles.select}
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value)}
                    disabled={isEditing}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="text">None (Text)</option>
                  </select>
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Paste Exposure:</label>
                  <select
                    style={styles.select}
                    value={newVisibility}
                    onChange={(e) => setNewVisibility(e.target.value as any)}
                    disabled={isEditing}
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Tags:</label>
                <input
                  style={styles.input}
                  placeholder="react, api, tutorial"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  disabled={isEditing}
                />
              </div>

              <div style={{ marginTop: "20px" }}>
                {isEditing ? (
                  <>
                    <button style={styles.primaryBtn} onClick={handleUpdate}>
                      Save Changes
                    </button>
                    <button
                      style={styles.secondaryBtn}
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button style={styles.primaryBtn} onClick={handleCreate}>
                    Create New Paste
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ❌ เอาปุ่ม Create สำหรับ Guest ออกไปแล้ว ตามคำขอ */}

          {/* Actions Bar (Like/Edit/Delete) - View Mode */}
          {selectedCode && !isEditing && (
            <div style={styles.actionBar}>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  style={styles.actionBtn}
                  onClick={() => handleLike(selectedCode.id)}
                >
                  {currentUser &&
                  selectedCode.likes.some((u) => u.id === currentUser.id)
                    ? "❤️"
                    : "🤍"}{" "}
                  Like ({selectedCode.likes.length})
                </button>
                <span
                  style={{
                    color: "#888",
                    fontSize: "12px",
                    alignSelf: "center",
                  }}
                >
                  By {selectedCode.author.username} •{" "}
                  {new Date(selectedCode.createdAt).toLocaleDateString()}
                </span>
              </div>

              {(currentUser?.id === selectedCode.author.id ||
                currentUser?.role === "ADMIN") && (
                <div>
                  <button
                    style={{ ...styles.actionBtn, color: "#fb8c00" }}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.actionBtn, color: "#ff5252" }}
                    onClick={() => handleDelete(selectedCode.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- RIGHT COLUMN: Sidebar --- */}
        <div style={styles.rightColumn}>
          <div style={styles.sidebarHeader}>Public Pastes</div>
          <div style={styles.sidebarList}>
            {codes.map((code) => (
              <div
                key={code.id}
                style={{
                  ...styles.sidebarItem,
                  backgroundColor:
                    selectedCode?.id === code.id ? "#333" : "transparent",
                }}
                onClick={() => {
                  setSelectedCode(code);
                  setIsEditing(false);
                  navigate(`/snippet/${code.id}`);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <div style={styles.sidebarIcon}>
                  {code.visibility === "PRIVATE" ? "🔒" : "🌍"}
                </div>
                <div style={styles.sidebarInfo}>
                  <div style={styles.sidebarTitle}>
                    {code.title || "Untitled"}
                  </div>
                  <div style={styles.sidebarMeta}>
                    {code.language} |{" "}
                    {new Date(code.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  // ... (คงเดิม) ...
  pageContainer: {
    backgroundColor: "#181818",
    minHeight: "100vh",
    color: "#e0e0e0",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  navbar: {
    backgroundColor: "#222",
    borderBottom: "1px solid #333",
    padding: "10px 0",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 20px",
  },
  logo: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: "1px",
    cursor: "pointer",
  },
  navBtn: {
    backgroundColor: "#4caf50",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "3px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "12px",
    textTransform: "uppercase",
  },
  searchBarContainer: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: "3px",
    overflow: "hidden",
  },
  searchInput: {
    backgroundColor: "transparent",
    border: "none",
    color: "#fff",
    padding: "8px",
    outline: "none",
    minWidth: "300px",
  },
  searchBtn: {
    backgroundColor: "#444",
    border: "none",
    color: "#ccc",
    padding: "8px 12px",
    cursor: "pointer",
  },
  logoutBtn: {
    backgroundColor: "#333",
    color: "#ccc",
    border: "1px solid #555",
    padding: "5px 10px",
    borderRadius: "3px",
    cursor: "pointer",
  },
  loginBtn: {
    backgroundColor: "transparent",
    color: "#fff",
    border: "1px solid #fff",
    padding: "6px 15px",
    borderRadius: "3px",
    cursor: "pointer",
    marginRight: "10px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  registerBtn: {
    backgroundColor: "#fff",
    color: "#000",
    border: "none",
    padding: "7px 15px",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  },
  mainLayout: {
    maxWidth: "1200px",
    margin: "20px auto",
    display: "flex",
    gap: "20px",
    padding: "0 20px",
  },
  leftColumn: { flex: 3 },
  rightColumn: { flex: 1 },
  editorHeader: {
    borderBottom: "1px solid #333",
    paddingBottom: "10px",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  editorContainer: { marginBottom: "20px" },
  textarea: {
    width: "100%",
    minHeight: "400px",
    backgroundColor: "#222",
    color: "#d4d4d4",
    border: "1px solid #333",
    padding: "15px",
    fontFamily: "'Consolas', 'Monaco', monospace",
    fontSize: "14px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  codeView: {
    // width: "100%",
    minHeight: "400px",
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
    border: "1px solid #333",
    padding: "15px",
    fontFamily: "'Consolas', 'Monaco', monospace",
    fontSize: "14px",
    margin: 0,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  },
  settingsPanel: {
    backgroundColor: "#222",
    padding: "20px",
    border: "1px solid #333",
    borderRadius: "4px",
  },
  row: { display: "flex", gap: "20px" },
  formGroup: { marginBottom: "15px" },
  label: {
    display: "block",
    color: "#888",
    marginBottom: "5px",
    fontSize: "13px",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: "8px",
    backgroundColor: "#333",
    border: "1px solid #444",
    color: "#fff",
    borderRadius: "3px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "8px",
    backgroundColor: "#333",
    border: "1px solid #444",
    color: "#fff",
    borderRadius: "3px",
  },
  primaryBtn: {
    backgroundColor: "#f1c40f",
    color: "#000",
    fontWeight: "bold",
    padding: "10px 20px",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "14px",
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    color: "#ccc",
    padding: "10px 20px",
    border: "none",
    cursor: "pointer",
    marginLeft: "10px",
  },
  actionBar: {
    marginTop: "10px",
    padding: "15px",
    backgroundColor: "#222",
    border: "1px solid #333",
    display: "flex",
    justifyContent: "space-between",
  },
  actionBtn: {
    background: "none",
    border: "none",
    color: "#ccc",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "13px",
  },
  sidebarHeader: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#888",
    textTransform: "uppercase",
    borderBottom: "2px solid #4caf50",
    paddingBottom: "5px",
    marginBottom: "10px",
  },
  sidebarList: { display: "flex", flexDirection: "column", gap: "5px" },
  sidebarItem: {
    display: "flex",
    gap: "10px",
    padding: "8px",
    borderBottom: "1px solid #222",
    cursor: "pointer",
    borderRadius: "3px",
    transition: "background 0.2s",
  },
  sidebarIcon: { fontSize: "18px" },
  sidebarInfo: { overflow: "hidden" },
  sidebarTitle: {
    color: "#4caf50",
    fontWeight: "bold",
    fontSize: "13px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  sidebarMeta: { color: "#666", fontSize: "11px", marginTop: "2px" },
  badge: {
    backgroundColor: "#444",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: "3px",
    fontSize: "11px",
    marginLeft: "10px",
  },

  // Warning Banner Style
  warningBanner: {
    backgroundColor: "#2c2c2c",
    border: "1px solid #444",
    color: "#ccc",
    padding: "10px 15px",
    borderRadius: "4px",
    marginBottom: "20px",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
  },
  link: {
    color: "#64b5f6",
    cursor: "pointer",
    textDecoration: "underline",
  },
};

export default Dashboard;
