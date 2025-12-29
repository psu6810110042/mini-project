import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCodes } from '../services/codeService';
import type { CodeSnippet, User } from '../types';
// 1. อย่าลืม Import Type 'User' เข้ามาด้วย


const Dashboard = () => {
  const navigate = useNavigate();
  
  const [codes, setCodes] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 2. เพิ่ม State สำหรับเก็บข้อมูลคนที่ Login อยู่ปัจจุบัน
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // 3. ดึงข้อมูล User จาก LocalStorage มาเช็ค Role
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    const fetchData = async () => {
      try {
        const data = await getCodes();
        setCodes(data);
      } catch (error) {
        console.error("Error fetching codes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // 4. สร้างฟังก์ชันลบ (เฉพาะ Admin)
  const handleDelete = (id: number) => {
    // กันเหนียว: เช็คอีกรอบว่าใช่ Admin ไหม
    if (currentUser?.role !== 'admin') {
      alert("คุณไม่มีสิทธิ์ทำรายการนี้!");
      return;
    }

    // จำลองการลบออกจากหน้าจอ (ของจริงต้องยิง API DELETE)
    const confirmed = confirm(`ต้องการลบ Code ID ${id} ใช่ไหม?`);
    if (confirmed) {
      setCodes(codes.filter(c => c.codeId !== id)); // ลบออกจาก State
      alert('ลบข้อมูลเรียบร้อย (Admin Action)');
    }
  };

  if (loading) return <p>กำลังโหลดข้อมูล...</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Code Sharing Feed</h2>
        <div>
           {/* แสดงชื่อคน Login และ Role */}
           <span style={{marginRight: '10px', color: '#666'}}>
             Logged in as: <strong>{currentUser?.email} ({currentUser?.role})</strong>
           </span>
           <button onClick={handleLogout} style={{ backgroundColor: '#ff4d4f', color: 'white' }}>Logout</button>
        </div>
      </div>

      {codes.map((item) => (
        <div key={item.codeId} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '15px', borderRadius: '8px', position: 'relative' }}>
          
          <h3>{item.title}</h3>
          
          {/* ... (ส่วน Tag และ Content เหมือนเดิม) ... */}
          <div style={{ marginBottom: '10px' }}>
             {item.tags.map(tag => (
               <span key={tag.tagId} style={{ backgroundColor: '#eee', padding: '2px 8px', borderRadius: '4px', marginRight: '5px', fontSize: '12px' , color:'grey'}}>#{tag.tagName}</span>
             ))}
          </div>
          <pre style={{ backgroundColor: '#f4f4f4', padding: '10px', overflowX: 'auto' , color: 'black' }}><code>{item.content}</code></pre>
          <p style={{ fontSize: '12px', color: '#666' }}>By User: {item.createdBy}</p>

          <div style={{ marginTop: '10px' }}>
            <button onClick={() => alert(`Liked code ${item.codeId}`)} style={{ marginRight: '10px' }}>
              ❤️ Like
            </button>

            {/* 5. ไฮไลท์สำคัญ! เช็คว่าถ้าเป็น Admin ให้โชว์ปุ่มลบ */}
            {currentUser?.role === 'admin' && (
              <button 
                onClick={() => handleDelete(item.codeId)} 
                style={{ backgroundColor: 'red', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}
              >
                🗑️ Delete (Admin Only)
              </button>
            )}
          </div>

        </div>
      ))}
    </div>
  );
};

export default Dashboard;