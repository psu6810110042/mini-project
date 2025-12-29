import type { CodeSnippet } from "../types";


// ข้อมูลจำลอง (Mock Data)
const MOCK_CODES: CodeSnippet[] = [
  {
    codeId: 101,
    title: "วิธีใช้ React Hooks เบื้องต้น",
    content: "const [count, setCount] = useState(0);",
    visibility: true,
    createdBy: "u001",
    createdDate : "22/12/2025",
    lastModified: "2023-10-01",
    tags: [{ tagId: 1, tagName: "React" }, { tagId: 2, tagName: "Frontend" }]
  },
  {
    codeId: 102,
    title: "NestJS Controller Example",
    content: "@Controller('cats') export class CatsController { ... }",
    visibility: true,
    createdBy: "u002",
    createdDate : "24/12/2025",
    lastModified: "2023-10-02",
    tags: [{ tagId: 3, tagName: "NestJS" }, { tagId: 4, tagName: "Backend" }]
  }
];

// ฟังก์ชันสำหรับเรียกข้อมูล (Return Promise เหมือน Axios)
export const getCodes = async (): Promise<CodeSnippet[]> => {
  // จำลองโหลดข้อมูล 0.5 วินาที
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_CODES;
};