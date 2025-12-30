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

  // --- Unified State: ใช้ตัวแปรชุดเดียวทั้ง "สร้าง" และ "แก้ไข" ---
  // แบบนี้จะจัดการง่ายกว่าแยก state ครับ
  const [titleInput, setTitleInput] = useState("");
  const [contentInput, setContentInput] = useState("");
  const [langInput, setLangInput] = useState("javascript");
  const [visibilityInput, setVisibilityInput] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [tagsInput, setTagsInput] = useState("");

  const [selectedCode, setSelectedCode] = useState<CodeSnippet | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 1. Load User
  useEffect(() => {
    const storedUserStr = localStorage.getItem("user");
    if (storedUserStr) {
      try {
        setCurrentUser(JSON.parse(storedUserStr));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // 2. Load Data & Handle URL ID
  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const data = await getCodes();
    if (Array.isArray(data)) {
      setCodes(data);

      // ถ้ามี ID ใน URL ให้เลือก Snippet นั้นมาโชว์
      if (id) {
        const foundSnippet = data.find((code) => code.id === id);
        if (foundSnippet) {
          handleSelectCode(foundSnippet);
        }
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // --- Helpers ---

  // รีเซ็ตฟอร์มกลับไปหน้า "Create New Paste"
  const resetToCreateMode = () => {
    setSelectedCode(null);
    setIsEditing(false);
    // เคลียร์ค่า Input
    setTitleInput("");
    setContentInput("");
    setLangInput("javascript");
    setVisibilityInput("PUBLIC");
    setTagsInput("");
    navigate("/"); // ลบ ID ออกจาก URL
  };

  // เตรียมข้อมูลลงฟอร์มเมื่อกด "Edit"
  const startEditMode = () => {
    if (!selectedCode) return;
    setIsEditing(true);

    // ✅ ดึงค่าเก่ามาใส่ Input (แก้ปัญหาแก้ไขไม่ได้)
    setTitleInput(selectedCode.title);
    setContentInput(selectedCode.content);
    setLangInput(selectedCode.language);
    setVisibilityInput(selectedCode.visibility);

    // ✅ แปลง Tags Object Array -> String (เช่น "react, js") เพื่อโชว์ใน Input
    const tagsString = selectedCode.tags
      ? selectedCode.tags.map((t) => t.name).join(", ")
      : "";
    setTagsInput(tagsString);
  };

  const handleSelectCode = (code: CodeSnippet) => {
    setSelectedCode(code);
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Actions ---

  const handleCreate = async () => {
    if (!contentInput) return alert("กรุณาใส่เนื้อหา Code");

    const titleToSend = currentUser ? titleInput || "Untitled" : "Untitled";
    const langToSend = currentUser ? langInput : "text";

    try {
      // แปลง String -> Array
      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");

      await createCodeService({
        title: titleToSend,
        content: contentInput,
        language: langToSend,
        visibility: visibilityInput,
        tags: tagsArray,
      });

      resetToCreateMode();
      fetchData();
      alert("Paste created successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCode) return;
    try {
      // แปลง String -> Array สำหรับอัปเดต
      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");

      // ✅ ส่งครบทุก field (แก้ปัญหาอัปเดตได้ไม่ครบ)
      await updateCodeService(selectedCode.id, {
        title: titleInput,
        content: contentInput,
        language: langInput,
        visibility: visibilityInput,
        tags: tagsArray, 
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
      resetToCreateMode();
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

    // อัปเดต selectedCode ทันทีเพื่อให้เลข Like เปลี่ยน
    const updatedList = await getCodes();
    const updatedItem = updatedList.find((c) => c.id === id);
    if (updatedItem && selectedCode?.id === id) {
      setSelectedCode(updatedItem);
    }
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
          {/* WARNING BANNER (เฉพาะ Guest) */}
          {!currentUser && !selectedCode && (
            <div style={styles.warningBanner}>
              <span style={{ marginRight: "10px", fontSize: "18px" }}>ⓘ</span>
              <span>
                You are currently not logged in...{" "}
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
                // ✅ ใช้ตัวแปร State กลาง (contentInput)
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
              />
            )}
          </div>

          {/* SETTINGS AREA (แสดงเมื่อ Login และ (กำลังสร้าง หรือ กำลังแก้ไข)) */}
          {currentUser && (!selectedCode || isEditing) && (
            <div style={styles.settingsPanel}>
              <h4
                style={{
                  color: "#fff",
                  borderBottom: "1px solid #444",
                  paddingBottom: "5px",
                }}
              >
                {isEditing ? "Edit Settings" : "Optional Paste Settings"}
              </h4>

              <div style={styles.formGroup}>
                <label style={styles.label}>Paste Title:</label>
                <input
                  style={styles.input}
                  // ✅ ใช้ตัวแปร State กลาง
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                />
              </div>

              <div style={styles.row}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Syntax Highlight:</label>
                  {/* ✅ ลบ disabled ออก เพื่อให้แก้ไขได้ */}
                  <select
                    style={styles.select}
                    value={langInput}
                    onChange={(e) => setLangInput(e.target.value)}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="text">None (Text)</option>
                  </select>
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Paste Exposure:</label>
                  <select
                    style={styles.select}
                    value={visibilityInput}
                    onChange={(e) => setVisibilityInput(e.target.value as any)}
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
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
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
                      onClick={() => {
                        setIsEditing(false);
                        // ถ้ากดยกเลิก ให้คืนค่า Content เดิมกลับมา (ถ้าต้องการ)
                        if (selectedCode) setContentInput(selectedCode.content);
                      }}
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

          {/* ACTIONS BAR - View Mode */}
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
                  {/* ✅ เรียก startEditMode แทนการ set state เอง */}
                  <button
                    style={{ ...styles.actionBtn, color: "#fb8c00" }}
                    onClick={startEditMode}
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
                  handleSelectCode(code);
                  navigate(`/snippet/${code.id}`);
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