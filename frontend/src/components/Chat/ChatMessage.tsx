import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
              contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
              itemStyle={{ color: 'var(--color-primary)' }}
            />
            <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className={`flex w-full mb-6 ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] rounded-2xl p-4 ${isAI ? 'bg-[var(--card-bg)] border border-[var(--border-color)]' : 'bg-[var(--color-primary)] text-white'}`}>
        <div className="text-sm font-medium mb-1 opacity-70">
          {isAI ? 'FinAI' : 'You'}
        </div>
        <div className="whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
        {format === "table" && renderTable()}
        {format === "chart" && renderChart()}
      </div>
    </div>
  );
};
