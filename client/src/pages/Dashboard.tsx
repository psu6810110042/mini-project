import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCodes, createCodeService, likeCodeService, deleteCodeService, updateCodeService } from '../services/codeService';
import type { CodeSnippet, User } from '../types';

const Dashboard = () => {
  const navigate = useNavigate();
  
  const [codes, setCodes] = useState<CodeSnippet[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- State สำหรับการสร้างโพสต์ใหม่ (Create) ---
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newLang, setNewLang] = useState("javascript");
  const [newVisibility, setNewVisibility] = useState<'PUBLIC'|'PRIVATE'>('PUBLIC');
  const [newTags, setNewTags] = useState(""); // รับเป็น string แล้วค่อย split ,

  // --- State สำหรับการแก้ไข (Edit) ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    // โหลด User และ Token
    const storedToken = localStorage.getItem('token');
    const storedUserStr = localStorage.getItem('user'); // ต้องมั่นใจว่าตอน Login เก็บ user ไว้แล้ว
    
    // ถ้าไม่มี Token ดีดออก
    if (!storedToken) {
        navigate('/login');
        return;
    }

    // ถ้ามี User ใน LocalStorage ให้ดึงมาใช้
    if (storedUserStr) {
        try {
            setCurrentUser(JSON.parse(storedUserStr));
        } catch (e) {
            console.error("User parse error", e);
        }
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    const data = await getCodes();
    if (Array.isArray(data)) {
        setCodes(data);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // --- 1. สร้าง Code ใหม่ ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        // แปลง Tags จาก "react, js" -> ["react", "js"]
        const tagsArray = newTags.split(',').map(t => t.trim()).filter(t => t !== "");

        await createCodeService({
            title: newTitle,
            content: newContent,
            language: newLang,
            visibility: newVisibility,
            tags: tagsArray
        });
        
        // Reset Form & Refresh Data
        setNewTitle(""); setNewContent(""); setNewTags(""); setShowCreate(false);
        fetchData(); 
        alert("สร้าง Code สำเร็จ!");
    } catch (err: any) {
        alert("สร้างไม่สำเร็จ: " + err.message);
    }
  };

  // --- 2. กด Like ---
  const handleLike = async (id: string) => {
      try {
          await likeCodeService(id);
          fetchData(); // โหลดใหม่เพื่อให้เห็นจำนวนไลก์ล่าสุด
      } catch (err: any) {
          alert("Error: " + err.message);
      }
  };

  // --- 3. ลบ Code ---
  const handleDelete = async (id: string) => {
      if (!confirm("ยืนยันการลบ?")) return;
      try {
        await deleteCodeService(id);
        fetchData();
      } catch (err) {
        alert("ลบไม่สำเร็จ (คุณอาจไม่ใช่เจ้าของ หรือ Admin)");
      }
  };

  // --- 4. เริ่มแก้ไข / บันทึก ---
  const startEdit = (code: CodeSnippet) => {
      setEditingId(code.id);
      setEditTitle(code.title);
      setEditContent(code.content);
  };

  const saveEdit = async (id: string) => {
      try {
        await updateCodeService(id, { title: editTitle, content: editContent });
        setEditingId(null);
        fetchData();
      } catch (err) {
        alert("แก้ไขไม่สำเร็จ");
      }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>💻 Code Sharing Feed</h2>
        <div>
           <span style={{marginRight: '15px', color: '#555'}}>
             User: <strong>{currentUser?.username}</strong> ({currentUser?.role})
           </span>
           <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* ปุ่มเปิดฟอร์มสร้างโพสต์ */}
      <button 
        onClick={() => setShowCreate(!showCreate)} 
        style={showCreate ? styles.cancelBtn : styles.createBtn}
      >
        {showCreate ? '❌ ปิดหน้าต่างสร้าง' : '➕ เขียน Code ใหม่'}
      </button>

      {/* Form สร้างโพสต์ (แสดงเมื่อกดปุ่ม) */}
      {showCreate && (
          <form onSubmit={handleCreate} style={styles.createForm}>
              <h3>สร้าง Snippet ใหม่</h3>
              <input 
                placeholder="หัวข้อ Code (Title)" 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                required 
                style={styles.input}
              />
              <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                <select value={newLang} onChange={e => setNewLang(e.target.value)} style={styles.input}>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML</option>
                </select>
                <select value={newVisibility} onChange={e => setNewVisibility(e.target.value as any)} style={styles.input}>
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                </select>
              </div>
              <input 
                placeholder="Tags (คั่นด้วยจุลภาค เช่น react, web)" 
                value={newTags} 
                onChange={e => setNewTags(e.target.value)} 
                style={styles.input}
              />
              <textarea 
                placeholder="วาง Code ที่นี่..." 
                value={newContent} 
                onChange={e => setNewContent(e.target.value)} 
                required 
                rows={5}
                style={styles.textarea}
              />
              <button type="submit" style={styles.submitBtn}>โพสต์เลย 🚀</button>
          </form>
      )}

      <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid #eee'}}/>

      {/* รายการ Code (Feed) */}
      {codes.length === 0 && <p style={{textAlign:'center', color:'#888'}}>ยังไม่มีข้อมูล หรือกำลังโหลด...</p>}

      {codes.map((item) => {
        // ✅ เช็คสิทธิ์: เป็นเจ้าของ หรือ Admin
        const isOwner = currentUser?.id === item.author.id;
        const isAdmin = currentUser?.role === 'ADMIN';
        const canManage = isOwner || isAdmin;
        const canEdit = isOwner || isAdmin; // ตาม Backend: Admin แก้ได้, Author แก้ได้

        // ✅ เช็คว่าเรากด Like ไปยัง (ดูใน array likes)
        const isLiked = item.likes.some(u => u.id === currentUser?.id);
        const isEditing = editingId === item.id;

        return (
            <div key={item.id} style={styles.card}>
            
            {/* --- Title Section --- */}
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                {isEditing ? (
                    <input 
                        value={editTitle} 
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={{...styles.input, marginBottom: 0}}
                    />
                ) : (
                    <h3 style={{margin: '0 0 5px 0', color: '#333'}}>
                        {item.title} 
                        <span style={styles.badge}>{item.language}</span>
                        {item.visibility === 'PRIVATE' && <span style={styles.privateBadge}>🔒 Private</span>}
                    </h3>
                )}
            </div>

            {/* --- Tags --- */}
            <div style={{ marginBottom: '10px' }}>
                {item.tags.map(tag => (
                  <span key={tag.id} style={styles.tag}>#{tag.name}</span>
                ))}
            </div>

            {/* --- Code Content --- */}
            {isEditing ? (
                <textarea 
                    value={editContent} 
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    style={styles.textarea}
                />
            ) : (
                <pre style={styles.codeBlock}>
                    <code>{item.content}</code>
                </pre>
            )}

            {/* --- Footer (Author & Actions) --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <button onClick={() => handleLike(item.id)} style={styles.likeBtn}>
                        {isLiked ? '❤️' : '🤍'} {item.likes.length}
                    </button>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                        By: <b>{item.author.username}</b> 
                        <span style={{marginLeft: '5px', color:'#999'}}>
                             ({new Date(item.createdAt).toLocaleDateString()})
                        </span>
                    </span>
                </div>

                <div>
                    {isEditing ? (
                        <>
                            <button onClick={() => saveEdit(item.id)} style={styles.saveBtn}>💾 Save</button>
                            <button onClick={() => setEditingId(null)} style={styles.cancelActionBtn}>❌</button>
                        </>
                    ) : (
                        <>
                            {canEdit && (
                                <button onClick={() => startEdit(item)} style={styles.editBtn}>✏️</button>
                            )}
                            {canManage && (
                                <button onClick={() => handleDelete(item.id)} style={styles.deleteBtn}>🗑️</button>
                            )}
                        </>
                    )}
                </div>
            </div>
            </div>
        );
      })}
    </div>
  );
};

// CSS Styles (Inline เพื่อความง่ายในการ Copy)
const styles = {
    card: { border: '1px solid #ddd', padding: '20px', marginBottom: '20px', borderRadius: '12px', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    createForm: { background: '#f9f9f9', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #eee' },
    input: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' as const },
    textarea: { width: '100%', padding: '10px', fontFamily: 'monospace', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: '#fff', boxSizing: 'border-box' as const },
    codeBlock: { backgroundColor: '#282c34', color: '#abb2bf', padding: '15px', borderRadius: '8px', overflowX: 'auto' as const, fontSize: '14px' },
    tag: { backgroundColor: '#e1f5fe', color: '#0277bd', padding: '3px 8px', borderRadius: '4px', marginRight: '5px', fontSize: '12px' },
    badge: { backgroundColor: '#eee', color: '#333', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', marginLeft: '8px', verticalAlign: 'middle' },
    privateBadge: { backgroundColor: '#ffebee', color: '#c62828', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', marginLeft: '5px', verticalAlign: 'middle' },
    
    // Buttons
    createBtn: { width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' as const },
    cancelBtn: { width: '100%', padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' },
    submitBtn: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' as const },
    logoutBtn: { backgroundColor: '#ff4d4f', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
    
    likeBtn: { background: 'none', border: '1px solid #ddd', padding: '5px 10px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' },
    editBtn: { backgroundColor: '#ffc107', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
    deleteBtn: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
    saveBtn: { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
    cancelActionBtn: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
};

export default Dashboard;