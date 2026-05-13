import React from "react";
import { Send } from "lucide-react";

function ChatInput({ value, onChange, onSend, disabled = false }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="input-wrapper">
      <input
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="chat-input"
        disabled={disabled}
      />
      <button
        onClick={onSend}
        disabled={!value.trim() || disabled}
        className="send-button"
      >
        <Send size={20} />
      </button>
    </div>
  );
}

export default ChatInput;
