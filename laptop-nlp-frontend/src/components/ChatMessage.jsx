import React from "react";
import { Bot, User } from "lucide-react";

function ChatMessage({ sender, text }) {
  const isBot = sender === "assistant" || sender === "bot";
  const isUser = sender === "user";

  return (
    <div className={`message-row ${isUser ? "user-row" : "bot-row"}`}>
      {/* Bot Avatar */}
      {isBot && (
        <div className="avatar bot-avatar">
          <Bot size={16} color="#60a5fa" />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={`message-bubble ${isUser ? "user-bubble" : "bot-bubble"}`}
      >
        <p>{text}</p>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="avatar user-avatar">
          <User size={16} color="#c7d2fe" />
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
