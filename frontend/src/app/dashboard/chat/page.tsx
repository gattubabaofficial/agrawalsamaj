"use client";

import { MessageCircle, Users, Hash, Send, PlusCircle } from "lucide-react";
import { useState } from "react";

export default function ChatPage() {
  const [hasJoinedMembersOnly, setHasJoinedMembersOnly] = useState(false);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  // Mock messages for UI presentation
  const mockMessages = [
    { id: 1, sender: "Ramesh Agrawal", text: "Has anyone booked the Bhavan for Nov 15?", time: "10:30 AM", isMe: false },
    { id: 2, sender: "You", text: "Yes, I believe it's booked for a marriage function.", time: "10:45 AM", isMe: true },
    { id: 3, sender: "Suresh Agrawal", text: "Will the Diwali Milan passes be available online?", time: "11:00 AM", isMe: false },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6 bg-zinc-50">
      {/* Chat Sidebar */}
      <div className="w-80 border-r border-zinc-200 bg-white flex flex-col">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <h2 className="font-bold text-zinc-900">Your Groups</h2>
          <button className="text-amber-500 hover:text-amber-600 transition-colors">
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Members Only Group Item */}
          {!hasJoinedMembersOnly ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mx-auto">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900">Members Only Group</h3>
                <p className="text-xs text-amber-700 mt-1">Join the community discussion with all registered members.</p>
              </div>
              <button 
                onClick={() => {
                  setHasJoinedMembersOnly(true);
                  setActiveChat("members");
                }}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                Join Group
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setActiveChat("members")}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${activeChat === "members" ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-zinc-900 truncate">Members Only</h3>
                  <span className="text-xs text-zinc-500">11:00 AM</span>
                </div>
                <p className="text-xs text-zinc-500 truncate">Suresh: Will the Diwali Milan passes...</p>
              </div>
            </button>
          )}

          {/* Dummy group for visual */}
          <button 
            onClick={() => setActiveChat("committee")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${activeChat === "committee" ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
          >
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white flex-shrink-0">
              <Hash className="w-5 h-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-semibold text-zinc-900 truncate">Event Committee</h3>
                <span className="text-xs text-zinc-500">Yesterday</span>
              </div>
              <p className="text-xs text-zinc-500 truncate">Let's finalize the catering menu.</p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5] relative">
        {/* Background decorative pattern for chat area */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 border-b border-zinc-200 bg-white flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white">
                  {activeChat === "members" ? <Users className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">
                    {activeChat === "members" ? "Members Only" : "Event Committee"}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {activeChat === "members" ? "All registered samaj members" : "Private group"}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10">
              {mockMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-md ${msg.isMe ? "bg-amber-100 rounded-l-2xl rounded-tr-2xl" : "bg-white rounded-r-2xl rounded-tl-2xl"} p-3 shadow-sm relative group`}>
                    {!msg.isMe && <span className="text-xs font-bold text-amber-600 mb-1 block">{msg.sender}</span>}
                    <p className="text-sm text-zinc-800 leading-relaxed">{msg.text}</p>
                    <span className="text-[10px] text-zinc-400 block text-right mt-1">{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 z-10">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="flex-1 py-3 px-4 rounded-full border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
                <button className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-sm transition-colors flex-shrink-0">
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
            <div className="w-20 h-20 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-300 mb-6 shadow-sm">
              <MessageCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Welcome to Group Chats</h2>
            <p className="text-zinc-500 max-w-md">Select a group from the sidebar to start messaging, or join the Members Only group to connect with the community.</p>
          </div>
        )}
      </div>
    </div>
  );
}
