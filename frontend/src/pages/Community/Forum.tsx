import { useState } from "react";
import { 
  Star, MessageSquare, Share2, UploadCloud, 
  BarChart2, Bold, Italic, Link2, Image, Send 
} from "lucide-react";

export const Forum = () => {
  const [rating, setRating] = useState(0);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-color)] p-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Community Insights</h1>

      {/* Editor Section */}
      <div className="glass-card mb-10 w-full">
        <h2 className="text-lg font-semibold mb-4 text-[var(--color-primary)]">Share Your Analysis</h2>
        
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3 bg-[var(--border-color)]/20 p-2 rounded-lg border border-[var(--border-color)]">
          <button className="p-2 hover:bg-[var(--border-color)]/50 rounded transition-colors"><Bold size={16} /></button>
          <button className="p-2 hover:bg-[var(--border-color)]/50 rounded transition-colors"><Italic size={16} /></button>
          <div className="w-px h-6 bg-[var(--border-color)] mx-1"></div>
          <button className="p-2 hover:bg-[var(--border-color)]/50 rounded transition-colors flex items-center gap-2 text-sm font-medium">
            <Link2 size={16} /> Link
          </button>
          <button className="p-2 hover:bg-[var(--border-color)]/50 rounded transition-colors flex items-center gap-2 text-sm font-medium">
            <Image size={16} /> Image
          </button>
          <div className="w-px h-6 bg-[var(--border-color)] mx-1"></div>
          
          {/* Custom Financial Tools */}
          <button className="p-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 rounded transition-colors flex items-center gap-2 text-sm font-semibold">
            <BarChart2 size={16} /> Insert Live Chart
          </button>
          <button className="p-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 text-sm font-semibold">
            <UploadCloud size={16} /> Import PDF
          </button>
        </div>

        {/* Text Area */}
        <textarea 
          rows={5} 
          className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg p-4 resize-y text-[var(--text-color)] outline-none focus:border-[var(--color-primary)] transition-colors"
          placeholder="Write your market analysis here..."
        />

        <div className="flex justify-end mt-4">
          <button className="btn-primary flex items-center gap-2 py-2">
            <Send size={18} /> Publish
          </button>
        </div>
      </div>

      {/* Posts Section */}
      <h2 className="text-xl font-bold mb-6">Trending Discussions</h2>
      
      <div className="space-y-6">
        {/* Post Mock */}
        <div className="glass-card">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center font-bold text-[var(--color-primary)]">JS</div>
              <div>
                <div className="font-semibold text-sm">John Smith</div>
                <div className="text-xs text-[var(--text-color)]/50">2 hours ago &middot; Macro Economics</div>
              </div>
            </div>
            
            <button className="p-2 rounded hover:bg-[var(--border-color)]/30 transition-colors cursor-pointer text-[var(--text-color)]/70 hover:text-[var(--color-primary)] flex items-center gap-1 text-sm font-medium">
              <Share2 size={16} /> Share
            </button>
          </div>
          
          <h3 className="text-xl font-bold mb-3">Why Tech Stocks Are Ignoring Treasury Yields</h3>
          <p className="text-[var(--text-color)]/80 leading-relaxed mb-4">
            Historically, higher treasury yields apply downward pressure on high-growth tech stocks. However, current Q3 earnings indicate strong balance sheets and aggressive share buybacks, overriding the macro sentiment. Notice the chart below showing AAPL holding firm above its 50-day SMA despite the 10-year yield crossing 4.8%.
          </p>

          <div className="w-full h-48 bg-[var(--border-color)]/20 rounded-lg flex border border-[var(--border-color)] border-dashed items-center justify-center text-[var(--text-color)]/50 mb-6 font-medium">
            [ Interactive Chart Embed Rendered Here ]
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4 mt-4">
            
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 text-[var(--text-color)]/70 hover:text-[var(--color-primary)] transition-colors text-sm font-medium cursor-pointer">
                <MessageSquare size={18} /> 24 Comments
              </button>
              
              <div className="flex items-center gap-1 group">
                <span className="text-sm font-medium mr-2 text-[var(--text-color)]/70">Rate Analysis:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    <Star 
                      size={18} 
                      className={`cursor-pointer transition-colors ${
                        star <= rating 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-[var(--text-color)]/30 hover:text-yellow-400/50"
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Forum;
