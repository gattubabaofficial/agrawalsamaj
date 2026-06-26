"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  MessageCircle, Users, Hash, Send, PlusCircle, Search, 
  User, Check, ChevronRight, Loader2, Plus, LogOut, CheckCheck
} from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/api";

interface ChatMessage {
  message_id: string;
  sender_id: string;
  sender_name?: string;
  receiver_id?: string;
  group_id?: string;
  content: string;
  sent_at: string;
}

interface Conversation {
  type: "personal" | "group";
  id: string; // user_id or group_id
  name: string;
  role?: string;
  is_member?: boolean;
  group_type?: string;
  location?: string;
  profile_photo?: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface ChatGroup {
  group_id: string;
  name: string;
  type: string;
  location: string | null;
  is_joined: boolean;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetUserId = searchParams.get("userId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Tab control
  const [sidebarTab, setSidebarTab] = useState<"all" | "personal" | "group" | "explore">("all");
  
  // Loading states
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Group exploration list
  const [allGroups, setAllGroups] = useState<ChatGroup[]>([]);
  
  // User profile lookup (from local storage / me API)
  const [currentUser, setCurrentUser] = useState<{ user_id: string; first_name: string; surname: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch current user
  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axios.get(`${getApiBaseUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentUser(res.data);
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      }
    };
    fetchMe();
  }, []);

  // 2. Fetch conversations list
  const fetchConversations = async (autoSelectId?: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get(`${getApiBaseUrl()}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);

      if (autoSelectId) {
        const found = res.data.find((c: Conversation) => c.id === autoSelectId);
        if (found) {
          setActiveChat(found);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setLoadingConv(false);
    }
  };

  // 3. Fetch groups for exploration
  const fetchGroups = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get(`${getApiBaseUrl()}/chat/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllGroups(res.data);
    } catch (err) {
      console.error("Failed to load groups list", err);
    }
  };

  // 4. Load messages for the active conversation
  const fetchMessages = async (chat: Conversation) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoadingMsg(true);
    try {
      let endpoint = "";
      if (chat.type === "personal") {
        endpoint = `${getApiBaseUrl()}/chat/messages/${chat.id}`;
      } else {
        endpoint = `${getApiBaseUrl()}/chat/groups/${chat.id}/messages`;
      }
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch message history", err);
    } finally {
      setLoadingMsg(false);
    }
  };

  // Setup WS Connection
  const getWsUrl = (): string => {
    const token = localStorage.getItem("token") || "";
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname === "0.0.0.0" ? "localhost" : window.location.hostname;
      return `ws://${hostname}:8000/api/v1/chat/ws?token=${token}`;
    }
    return `ws://localhost:8000/api/v1/chat/ws?token=${token}`;
  };

  const connectWebSocket = () => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected successfully.");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          // Verify if message belongs to current user
          // For personal DMs, if sender or receiver matches target, push.
          // For group DMs, if group_id matches target group.
          if (activeChat) {
            const isMyDM = payload.type === "personal" && activeChat.type === "personal" &&
              ((payload.sender_id === activeChat.id && payload.receiver_id === currentUser?.user_id) ||
               (payload.sender_id === currentUser?.user_id && payload.receiver_id === activeChat.id));

            const isMyGroupMsg = payload.type === "group" && activeChat.type === "group" &&
              payload.group_id === activeChat.id;

            if (isMyDM || isMyGroupMsg) {
              setMessages((prev) => {
                // Prevent duplicate pushing
                if (prev.some(m => m.message_id === payload.message_id)) return prev;
                return [...prev, {
                  message_id: payload.message_id,
                  sender_id: payload.sender_id,
                  sender_name: payload.sender_name,
                  content: payload.content,
                  sent_at: payload.sent_at
                }];
              });
            }
          }

          // Trigger conversation list reload to update recent last messages
          fetchConversations();
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket encountered error", err);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected. Retrying in 5 seconds...");
        setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
    } catch (err) {
      console.error("Failed to establish websocket connection", err);
    }
  };

  // Handle active switching
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat);
    }
  }, [activeChat]);

  // Connect WebSocket & Poll Backup
  useEffect(() => {
    fetchConversations();
    fetchGroups();
    connectWebSocket();

    // Polling fallback checks if ws is offline
    pollingTimerRef.current = setInterval(() => {
      const isWsOffline = !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN;
      if (isWsOffline && activeChat) {
        // Fetch fresh message history if WebSocket is down
        const token = localStorage.getItem("token");
        if (!token) return;
        let endpoint = activeChat.type === "personal" 
          ? `${getApiBaseUrl()}/chat/messages/${activeChat.id}`
          : `${getApiBaseUrl()}/chat/groups/${activeChat.id}/messages`;

        axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => setMessages(res.data))
          .catch(err => console.error("Polling fetch failed", err));
      }
      
      // Periodically refresh list of recent conversations
      fetchConversations();
    }, 4000);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [activeChat, currentUser]);

  // Handle query parameter redirection (new chat trigger)
  useEffect(() => {
    if (targetUserId) {
      // First, check if conversation already exists in lists
      const existing = conversations.find(c => c.id === targetUserId && c.type === "personal");
      if (existing) {
        setActiveChat(existing);
        // Clear param to prevent looping
        router.replace("/dashboard/chat");
      } else {
        // Resolve target user name
        const resolveUser = async () => {
          const token = localStorage.getItem("token");
          if (!token) return;
          try {
            const membersRes = await axios.get(`${getApiBaseUrl()}/membership/members`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const usersRes = await axios.get(`${getApiBaseUrl()}/membership/users`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const allUsers = [...membersRes.data, ...usersRes.data];
            const match = allUsers.find(u => u.user_id === targetUserId);
            if (match) {
              const tempConv: Conversation = {
                type: "personal",
                id: match.user_id,
                name: `${match.first_name} ${match.surname}`,
                role: match.role,
                is_member: match.is_member,
                profile_photo: match.profile_photo,
                last_message: "Click to start typing your first message...",
                last_message_time: new Date().toISOString(),
                unread_count: 0
              };
              setConversations(prev => [tempConv, ...prev]);
              setActiveChat(tempConv);
            }
          } catch (err) {
            console.error("Failed to resolve target user details", err);
          }
        };
        resolveUser();
        router.replace(window.location.pathname);
      }
    }
  }, [targetUserId, conversations]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send Message function
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setSendingMsg(true);
    const content = inputText;
    setInputText("");

    try {
      let endpoint = "";
      if (activeChat.type === "personal") {
        endpoint = `${getApiBaseUrl()}/chat/messages/${activeChat.id}`;
      } else {
        endpoint = `${getApiBaseUrl()}/chat/groups/${activeChat.id}/messages`;
      }

      const res = await axios.post(endpoint, { content }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update message list immediately
      setMessages((prev) => [
        ...prev,
        {
          message_id: res.data.message_id,
          sender_id: res.data.sender_id,
          sender_name: res.data.sender_name || "You",
          content: res.data.content,
          sent_at: res.data.sent_at
        }
      ]);

      fetchConversations();
    } catch (err) {
      console.error("Failed to send message", err);
      setInputText(content); // restore content on failure
    } finally {
      setSendingMsg(false);
    }
  };

  // Join group function
  const handleJoinGroup = async (groupId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await axios.post(`${getApiBaseUrl()}/chat/groups/${groupId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroups();
      fetchConversations();
    } catch (err) {
      console.error("Failed to join group", err);
    }
  };

  // Leave group function
  const handleLeaveGroup = async (groupId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await axios.post(`${getApiBaseUrl()}/chat/groups/${groupId}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroups();
      fetchConversations();
      if (activeChat?.id === groupId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to leave group", err);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (sidebarTab === "all") return true;
    return c.type === sidebarTab;
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6 bg-zinc-50 border border-zinc-200 overflow-hidden rounded-2xl shadow-sm">
      {/* Sidebar Navigation */}
      <div className="w-80 border-r border-zinc-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-zinc-800 text-lg">Samaj Chat Channels</h2>
            <MessageCircle className="w-5 h-5 text-amber-500" />
          </div>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search chat or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            />
          </div>

          {/* Tabs */}
          <div className="flex bg-zinc-100 p-1 rounded-xl gap-1 text-[11px] font-semibold text-zinc-500">
            <button 
              onClick={() => setSidebarTab("all")}
              className={`flex-1 py-1.5 rounded-lg text-center transition-colors cursor-pointer ${sidebarTab === "all" ? "bg-white text-amber-600 shadow-sm" : "hover:text-zinc-800"}`}
            >
              All
            </button>
            <button 
              onClick={() => setSidebarTab("personal")}
              className={`flex-1 py-1.5 rounded-lg text-center transition-colors cursor-pointer ${sidebarTab === "personal" ? "bg-white text-amber-600 shadow-sm" : "hover:text-zinc-800"}`}
            >
              DMs
            </button>
            <button 
              onClick={() => setSidebarTab("group")}
              className={`flex-1 py-1.5 rounded-lg text-center transition-colors cursor-pointer ${sidebarTab === "group" ? "bg-white text-amber-600 shadow-sm" : "hover:text-zinc-800"}`}
            >
              Groups
            </button>
            <button 
              onClick={() => setSidebarTab("explore")}
              className={`flex-1 py-1.5 rounded-lg text-center transition-colors cursor-pointer ${sidebarTab === "explore" ? "bg-white text-amber-600 shadow-sm" : "hover:text-zinc-800"}`}
            >
              Explore
            </button>
          </div>
        </div>

        {/* Conversation / Channel list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {sidebarTab === "explore" ? (
            <div className="space-y-3 p-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Explore Location Groups</h3>
              {allGroups.filter(g => g.type === "location").map(g => (
                <div key={g.group_id} className="p-3 border border-zinc-150 rounded-xl space-y-2.5 bg-zinc-50/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-zinc-800 text-sm">{g.name}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Colony/Area: {g.location}</p>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs border border-amber-100">
                      <Hash className="w-4 h-4" />
                    </span>
                  </div>
                  {g.is_joined ? (
                    <button 
                      onClick={() => handleLeaveGroup(g.group_id)}
                      className="w-full py-1.5 border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Leave Group
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleJoinGroup(g.group_id)}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Join Group
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : loadingConv ? (
            <div className="p-6 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span className="text-xs">Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 text-xs">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = activeChat?.id === c.id;
              const initials = c.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <button
                  key={`${c.type}-${c.id}`}
                  onClick={() => setActiveChat(c)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left relative ${
                    isActive ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-zinc-50 border border-transparent"
                  }`}
                >
                  {c.profile_photo ? (
                    <img 
                      src={c.profile_photo} 
                      alt={c.name}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border ${
                      c.type === "group" 
                        ? "bg-amber-50 text-amber-700 border-amber-200" 
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}>
                      {c.type === "group" ? <Users className="w-4 h-4" /> : initials}
                    </div>
                  )}

                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-semibold text-zinc-800 text-xs truncate">{c.name}</h4>
                      <span className="text-[9px] text-zinc-400">
                        {c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{c.last_message}</p>
                  </div>
                  {isActive && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <ChevronRight className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#f8f9fa] relative min-w-0">
        {/* Background decorative pattern for chat area */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23d97706\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

        {activeChat ? (
          <>
            {/* Active Header */}
            <div className="h-16 px-6 border-b border-zinc-200 bg-white flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white font-bold text-sm">
                  {activeChat.type === "group" ? <Users className="w-5 h-5" /> : activeChat.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-800 text-sm leading-none">{activeChat.name}</h3>
                  <span className="text-[10px] text-zinc-500 mt-1.5 block capitalize">
                    {activeChat.type === "group" 
                      ? `${activeChat.group_type || "General"} Group ${activeChat.location ? `· ${activeChat.location}` : ""}`
                      : `${activeChat.role || "Guest User"} Directory DM`}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10 flex flex-col">
              {loadingMsg ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs">Loading message logs...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs italic">
                  No messages exchanged. Send a message to start conversation.
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === currentUser?.user_id;
                  const time = new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={m.message_id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-md ${isMe ? "bg-amber-100 rounded-l-2xl rounded-tr-2xl text-amber-950 border border-amber-200/50" : "bg-white rounded-r-2xl rounded-tl-2xl text-zinc-800 border border-zinc-200"} p-3 shadow-sm relative group`}>
                        {!isMe && activeChat.type === "group" && (
                          <span className="text-[10px] font-bold text-amber-600 mb-1.5 block leading-none">{m.sender_name || "Samaj Member"}</span>
                        )}
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{m.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-zinc-400">
                          <span>{time}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-zinc-50 border-t border-zinc-200 z-10">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Send a message to ${activeChat.name}...`}
                  className="flex-1 py-2.5 px-4 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                />
                <button 
                  type="submit"
                  disabled={sendingMsg || !inputText.trim()}
                  className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white flex items-center justify-center shadow-sm transition-colors flex-shrink-0 cursor-pointer"
                >
                  {sendingMsg ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 ml-0.5" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
            <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-300 mb-5 shadow-sm">
              <MessageCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-800 mb-1">Agrawal Samaj Communications</h2>
            <p className="text-xs text-zinc-500 max-w-sm">Select an active chat group, colony-based forum, or direct message from the sidebar list to start talking.</p>
          </div>
        )}
      </div>
    </div>
  );
}
