import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ChatMessageProps {
  role: "user" | "ai";
  content: string;
  format?: "text" | "table" | "chart";
  data?: any[];
}

export const ChatMessage = ({ role, content, format = "text", data }: ChatMessageProps) => {
  const isAI = role === "ai";

  const renderTable = () => {
    if (!data || data.length === 0) return null;
    const headers = Object.keys(data[0]);
    return (
      <div className="overflow-x-auto mt-4 rounded-lg border border-[var(--border-color)]">
        <table className="w-full text-sm text-left">
          <thead className="bg-[var(--border-color)]/30 text-xs uppercase">
            <tr>
              {headers.map(h => <th key={h} className="px-4 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--border-color)]/10">
                {headers.map(h => <td key={h} className="px-4 py-3">{row[h]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderChart = () => {
    if (!data || data.length === 0) return null;
    return (
      <div className="h-64 w-full mt-4 p-4 border border-[var(--border-color)] rounded-lg bg-[var(--card-bg)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis dataKey="name" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border-color)", borderRadius: "8px" }}
              itemStyle={{ color: "var(--color-primary)" }}
            />
            <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className={`flex w-full mb-4 ${isAI ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[85%] rounded-2xl p-4 ${isAI ? "bg-[var(--card-bg)] border border-[var(--border-color)]" : "bg-[var(--color-primary)] text-white"}`}>
        <div className="text-sm font-medium mb-1 opacity-70">{isAI ? "FinAI" : "You"}</div>

        {isAI ? (
          <div className="text-sm leading-relaxed prose-chat">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="ml-2 text-sm">{children}</li>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  return isBlock ? (
                    <code className="block bg-[var(--border-color)]/20 rounded-lg px-3 py-2 text-xs font-mono my-2 whitespace-pre-wrap">{children}</code>
                  ) : (
                    <code className="bg-[var(--border-color)]/30 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                  );
                },
                pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[var(--color-primary)]/40 pl-3 my-2 italic opacity-80">{children}</blockquote>
                ),
                h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-0.5">{children}</h3>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="w-full text-xs border-collapse border border-[var(--border-color)]/40">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-[var(--border-color)]/20">{children}</thead>,
                th: ({ children }) => <th className="px-3 py-1.5 text-left border border-[var(--border-color)]/40 font-semibold">{children}</th>,
                td: ({ children }) => <td className="px-3 py-1.5 border border-[var(--border-color)]/30">{children}</td>,
                hr: () => <hr className="my-3 border-[var(--border-color)]/30" />,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline underline-offset-2 hover:opacity-70">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{content}</div>
        )}

        {format === "table" && renderTable()}
        {format === "chart" && renderChart()}
      </div>
    </div>
  );
};
