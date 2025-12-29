import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCodes, likeCodeService, deleteCodeService, updateCodeService } from '../services/codeService';
import type { CodeSnippet, User } from '../types';


const Dashboard = () => {
  const navigate = useNavigate();
  
  const [codes, setCodes] = useState<CodeSnippet[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // State สำหรับเก็บว่ากำลังแก้ Code ไหนอยู่ (เก็บ ID ของ Code)
  const [editingId, setEditingId] = useState<number | null>(null);
  // State สำหรับเก็บข้อมูลที่กำลังพิมพ์แก้ไข
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    // โหลด User
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
        navigate('/'); // ถ้าไม่มี User ให้เด้งไป Login
    }

    // โหลดข้อมูล
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await getCodes();
      setCodes(data);
    } catch (error) {
      console.error("Error fetching codes:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // --- Logic 1: กด Like ---
  const handleLike = async (codeId: number) => {
      if (!currentUser) return;
      try {
          // เรียก Service
          await likeCodeService(codeId, currentUser.uid);
          // อัปเดตหน้าจอทันทีโดยไม่ต้องโหลดใหม่ (Optimistic Update)
          setCodes(codes.map(code => {
              if (code.codeId === codeId) {
                  return { 
                      ...code, 
                      likes: code.likes + 1, 
                      likedBy: [...code.likedBy, currentUser.uid] 
                  };
              }
              return code;
          }));
      } catch (err: any) {
          alert(err.message);
      }
  };

  // --- Logic 2: ลบ Code (ของตัวเอง หรือ Admin) ---
  const handleDelete = async (codeId: number) => {
      if (!confirm("ต้องการลบ Code นี้ใช่ไหม?")) return;
      
      await deleteCodeService(codeId); // แจ้ง Service
      setCodes(codes.filter(c => c.codeId !== codeId)); // ลบออกจากหน้าจอ
  };

  // --- Logic 3: เริ่มโหมดแก้ไข ---
  const startEdit = (code: CodeSnippet) => {
      setEditingId(code.codeId);
      setEditTitle(code.title);
      setEditContent(code.content);
  };

  // --- Logic 4: บันทึกการแก้ไข ---
  const saveEdit = async (codeId: number) => {
      await updateCodeService(codeId, editTitle, editContent);
      
      // อัปเดตหน้าจอ
      setCodes(codes.map(c => {
          if (c.codeId === codeId) {
              return { ...c, title: editTitle, content: editContent };
          }
          return c;
      }));
      
      setEditingId(null); // ออกจากโหมดแก้ไข
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Code Sharing Feed</h2>
        <div>
           <span style={{marginRight: '10px', color: '#666'}}>
             User: <strong>{currentUser?.email}</strong>
           </span>
           <button onClick={handleLogout} style={{ backgroundColor: '#ff4d4f', color: 'white' }}>Logout</button>
        </div>
      </div>

      {codes.map((item) => {
        // เช็คว่าเป็นเจ้าของโพสต์ไหม?
        const isOwner = currentUser?.uid === item.createdBy;
        // เช็คว่าเป็น Admin ไหม?
        const isAdmin = currentUser?.role === 'admin';
        // เช็คว่าเคยไลก์ไปหรือยัง?
        const isLiked = currentUser && item.likedBy.includes(currentUser.uid);
        // เช็คว่ากำลังแก้ไข Item นี้อยู่ไหม?
        const isEditing = editingId === item.codeId;

        return (
            <div key={item.codeId} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '15px', borderRadius: '8px', background: '#fff' }}>
            
            {/* --- ส่วนหัวข้อ (Title) --- */}
            {isEditing ? (
                <input 
                    type="text" 
                    value={editTitle} 
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ width: '100%', padding: '5px', fontSize: '1.2em', marginBottom: '10px' }}
                />
            ) : (
                <h3>{item.title}</h3>
            )}
            
            <div style={{ marginBottom: '10px' }}>
                {item.tags.map(tag => (
                <span key={tag.tagId} style={{ backgroundColor: '#eee', padding: '2px 8px', borderRadius: '4px', marginRight: '5px', fontSize: '12px' }}>#{tag.tagName}</span>
                ))}
            </div>

            {/* --- ส่วนเนื้อหา Code --- */}
            {isEditing ? (
                <textarea 
                    value={editContent} 
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                    style={{ width: '100%', padding: '10px', fontFamily: 'monospace', backgroundColor: '#f4f4f4' }}
                />
            ) : (
                <pre style={{ backgroundColor: '#f4f4f4', padding: '10px', overflowX: 'auto', color: '#333' }}>
                    <code>{item.content}</code>
                </pre>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                
                {/* ปุ่ม Like + จำนวน */}
                <div>
                    <button 
                        onClick={() => handleLike(item.codeId)} 
                        disabled={!!isLiked} // ถ้า Like แล้วให้กดไม่ได้
                        style={{ 
                            marginRight: '10px', 
                            opacity: isLiked ? 0.6 : 1,
                            cursor: isLiked ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLiked ? '❤️ Liked' : '🤍 Like'} ({item.likes})
                    </button>
                    <span style={{ fontSize: '12px', color: '#666' }}>By: {item.createdBy}</span>
                </div>

                {/* ปุ่มจัดการ (Edit / Delete / Save / Cancel) */}
                <div>
                    {isEditing ? (
                        <>
                            <button onClick={() => saveEdit(item.codeId)} style={{ marginRight: '5px', backgroundColor: '#4CAF50', color: 'white' }}>💾 Save</button>
                            <button onClick={() => setEditingId(null)} style={{ backgroundColor: '#999', color: 'white' }}>❌ Cancel</button>
                        </>
                    ) : (
                        <>
                            {/* แสดงปุ่ม Edit เฉพาะเจ้าของ */}
                            {isOwner && (
                                <button onClick={() => startEdit(item)} style={{ marginRight: '5px', backgroundColor: '#faad14', color: 'white' }}>✏️ Edit</button>
                            )}
                            
                            {/* แสดงปุ่ม Delete ถ้าเป็นเจ้าของ หรือ Admin */}
                            {(isOwner || isAdmin) && (
                                <button onClick={() => handleDelete(item.codeId)} style={{ backgroundColor: '#ff4d4f', color: 'white' }}>🗑️ Delete</button>
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

export default Dashboard;