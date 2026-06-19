"use client";

import { Send } from "lucide-react";

interface ChatTabProps {
  userRole: string;
  selectedChannel: string;
  setSelectedChannel: (val: string) => void;
  chatMessages: any[];
  newMsg: string;
  setNewMsg: (val: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
}

export default function ChatTab({
  userRole,
  selectedChannel,
  setSelectedChannel,
  chatMessages,
  newMsg,
  setNewMsg,
  handleSendMessage,
}: ChatTabProps) {
  return (
    <div className="flex flex-col gap-6 flex-grow text-black">
      <div>
        <p className="text-xs text-muted-text mt-0.5 font-semibold">Communicate with colony neighbors, Samaj members, or chat admins privately</p>
      </div>

      <div className="flex flex-col md:flex-row border border-gray-100 rounded-3xl overflow-hidden flex-grow min-h-[400px]">
        
        <div className="w-full md:w-60 bg-gray-50 border-r border-gray-100 p-4 flex flex-col gap-2">
          <h4 className="text-[10px] font-bold text-muted-text uppercase tracking-wider mb-2 px-2">Active Channels</h4>
          {[
            "General Member Group",
            "Non-Member Community Group",
            "Khushi Vihar Group",
            "Patrakar Road Group",
            "Private Chat (Admin)"
          ].map((ch) => (
            <button
              key={ch}
              onClick={() => setSelectedChannel(ch)}
              className={`text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all truncate ${
                selectedChannel === ch ? "bg-bhagwa text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              # {ch}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col bg-white p-4">
          <div className="border-b border-gray-100 pb-3 mb-4">
            <h3 className="font-extrabold text-sm text-gray-950"># {selectedChannel}</h3>
            <p className="text-[10px] text-gray-500 font-semibold">Active simulated WebSocket socket.io log room</p>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3 max-h-64 mb-4 pr-1">
            {chatMessages
              .filter(m => m.channel === selectedChannel)
              .map((m) => {
                const isAdminMsg = m.role === "ADMIN";
                const isMe = m.sender === "Ramesh Agrawal" || (userRole === "ADMIN" && m.sender === "Admin");

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[80%] rounded-2xl p-3 text-xs ${
                      isMe
                        ? "bg-bhagwa/10 border border-bhagwa/20 self-end text-right rounded-tr-none text-black"
                        : isAdminMsg
                        ? "bg-red-50 border border-red-100 self-start rounded-tl-none text-black"
                        : "bg-gray-50 border border-gray-100 self-start rounded-tl-none text-black"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1 justify-between">
                      <span className="text-bhagwa">{m.sender}</span>
                      <span className="text-[9px] text-muted-text font-medium">{m.time}</span>
                    </div>
                    <p className="font-medium text-left leading-relaxed">{m.content}</p>
                  </div>
                );
              })}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder="Write message content here..."
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-bhagwa text-black font-semibold"
            />
            <button
              type="submit"
              className="bg-bhagwa hover:bg-bhagwa-hover text-white p-2.5 rounded-xl transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
