import type { CodeSnippet } from "../types";


// Mock Data เพิ่ม likes และ likedBy
let MOCK_CODES: CodeSnippet[] = [
  {
    codeId: 101,
    title: "วิธีใช้ React Hooks เบื้องต้น",
    content: "const [count, setCount] = useState(0);",
    visibility: true,
    createdBy: "u001",
    lastModified: "2023-10-01",
    createdDate: "2023-10-01",
    tags: [{ tagId: 1, tagName: "React" }],
    likes: 10,              // มีคนกดไลก์แล้ว 10 คน
    likedBy: ["u999"]       // สมมติมี user อื่นกดไปแล้ว
  },
  {
    codeId: 102,
    title: "NestJS Controller Example",
    content: "@Controller('cats') export class CatsController { ... }",
    visibility: true,
    createdBy: "u002",
    lastModified: "2023-10-02",
    createdDate: "2023-10-02",
    tags: [{ tagId: 3, tagName: "NestJS" }],
    likes: 0,
    likedBy: []
  }
];

export const getCodes = async (): Promise<CodeSnippet[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...MOCK_CODES]; // ส่ง Copy กลับไป
};

// จำลองการกด Like
export const likeCodeService = async (codeId: number, userId: string): Promise<CodeSnippet | null> => {
    // หา Code ตัวนั้น
    const index = MOCK_CODES.findIndex(c => c.codeId === codeId);
    if (index === -1) return null;

    // เช็คว่าเคยกดไปยัง
    const code = MOCK_CODES[index];
    if (code.likedBy.includes(userId)) {
        throw new Error("คุณกด Like ไปแล้ว!");
    }

    // อัปเดตข้อมูล
    code.likes += 1;
    code.likedBy.push(userId);
    
    return code;
};

// จำลองการแก้ไข Code
export const updateCodeService = async (codeId: number, newTitle: string, newContent: string) => {
    const index = MOCK_CODES.findIndex(c => c.codeId === codeId);
    if (index !== -1) {
        MOCK_CODES[index].title = newTitle;
        MOCK_CODES[index].content = newContent;
    }
};

// จำลองการลบ Code
export const deleteCodeService = async (codeId: number) => {
    MOCK_CODES = MOCK_CODES.filter(c => c.codeId !== codeId);
};