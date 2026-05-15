# 4.4.3 Tích Hợp SSE và Hiển Thị Streaming Token

## Kết nối SSE từ phía client

`AIChatInterface` sử dụng `fetch()` API gốc của trình duyệt thay vì `EventSource` để kết nối SSE. Lý do: `EventSource` không hỗ trợ POST request hay custom header — không thể gửi JWT token xác thực. `fetch()` hỗ trợ đầy đủ:

```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Trong handleSend():
const response = await fetch(`${API_BASE}/ai/chat`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...authHeaders(),
  },
  body: JSON.stringify({
    message: userMessage,
    conversation_id: conversationId,
  }),
  signal: abortRef.current?.signal,  // Cho phép cancel
});
```

`AbortController` được lưu trong `abortRef` — khi user nhấn nút Stop hoặc component unmount, `abortRef.current?.abort()` hủy fetch request đang chạy, ngắt stream.

## Parse SSE stream thủ công

Server trả về `text/event-stream` — phải parse thủ công từ ReadableStream:

```typescript
const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop()!;  // Giữ lại chunk chưa hoàn chỉnh
  
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = JSON.parse(line.slice(6));
      processEvent(eventType, data);
    }
    if (line.startsWith("event: ")) {
      eventType = line.slice(7);
    }
  }
}
```

`buffer` tích lũy bytes chưa đầy một dòng — quan trọng khi TCP segment cắt giữa event. `lines.pop()` lấy ra phần chưa hoàn chỉnh và giữ lại cho chunk tiếp theo.

## Xử lý từng loại event

```typescript
function processEvent(event: string, data: unknown) {
  switch (event) {
    case "routing":
      const r = data as { agent_name: string; tickers: string[] };
      setRoutingInfo({ agentName: r.agent_name, tickers: r.tickers });
      // Tạo placeholder message với streaming=true
      setMessages(prev => [...prev, {
        role: "ai", content: "", format: "text",
        streaming: true, agentName: r.agent_name,
      }]);
      break;
      
    case "token":
      const { text } = data as { text: string };
      // Append delta vào message cuối
      setMessages(prev => {
        const msgs = [...prev];
        const last = msgs[msgs.length - 1];
        msgs[msgs.length - 1] = { ...last, content: last.content + text };
        return msgs;
      });
      break;
      
    case "done":
      const d = data as { conversation_id: string; tools_used: string[] };
      setConversationId(d.conversation_id);
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], 
          streaming: false, toolsUsed: d.tools_used };
        return msgs;
      });
      break;
      
    case "error":
      setMessages(prev => [...prev, {
        role: "ai", content: (data as any).detail,
        format: "text", error: true,
      }]);
      break;
  }
}
```

## Hiển thị streaming token

Component `ChatMessage` nhận prop `streaming: boolean`. Khi `streaming=true`, component hiển thị text hiện có kèm theo **cursor nhấp nháy** (CSS animation) — tạo hiệu ứng "đang gõ". Khi `streaming=false`, cursor biến mất và message hiển thị hoàn chỉnh.

Content được render qua Markdown parser — model thường trả về Markdown có `**bold**`, `# heading`, bảng, code block. Khi streaming, text tích lũy từng token một nên Markdown có thể tạm thời không hợp lệ (ví dụ `**chưa đóng`) — parser cần xử lý gracefully.

## Hiển thị tools đang chạy

Khi agent gọi tool, server emit event `tool` với tên tool. Frontend hiển thị badge "🔧 Đang tra cứu dữ liệu..." trong thời gian tool thực thi:

```typescript
case "tool":
  const { name } = data as { name: string };
  setActiveTools(prev => [...new Set([...prev, name])]);
  break;
```

Sau khi stream xong (`done` event), `activeTools` được clear và `toolsUsed` được set vào message — hiển thị danh sách tools đã dùng dưới message hoàn chỉnh.

## Agent label hiển thị

Event `routing` cung cấp `agent_name` (ví dụ "Trợ lý Phân tích thị trường"). Label này được hiển thị trên message AI như caption — giúp người dùng hiểu ai đang trả lời câu hỏi của họ mà không cần biết chi tiết về kiến trúc multi-agent bên trong.
