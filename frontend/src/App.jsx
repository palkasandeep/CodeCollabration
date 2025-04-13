import { useEffect, useState, useRef } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const socket = io("http://localhost:5000");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [users, setUsers] = useState([]);
  const [userList, setUserList] = useState([]);
  const [code, setCode] = useState("");
  const [typingMessage, setTypingMessage] = useState("");
  const [messages, setMessages] = useState([]); // To store chat messages
  const [newMessage, setNewMessage] = useState(""); // For new message input
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    socket.on("user-joined", (updatedUsers) => {
      const newUsers = updatedUsers.filter((u) => !userList.includes(u));
      const leftUsers = userList.filter((u) => !updatedUsers.includes(u));

      newUsers.forEach((user) => {
        if (user !== username) toast.success(`${user} joined the room`);
      });

      leftUsers.forEach((user) => {
        if (user !== username) toast.warn(`${user} left the room`);
      });

      setUsers(updatedUsers);
      setUserList(updatedUsers);
    });

    socket.on("codeupdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("user-typing", ({ user }) => {
      if (user !== username) {
        setTypingMessage(`${user} is typing...`);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingMessage("");
        }, 2000);
      }
    });

    socket.on("chat-message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]); // Update chat messages
    });

    return () => {
      socket.off("user-joined");
      socket.off("codeupdate");
      socket.off("user-typing");
      socket.off("chat-message");
    };
  }, [userList, username]);

  const handleJoin = () => {
    if (!roomId || !username) return;
    socket.emit("join", { roomId, userName: username });
    setJoined(true);
  };

  const handleLeave = () => {
    socket.emit("leaveRoom", { roomId, userName: username });
    setJoined(false);
    setUsers([]);
    setUserList([]);
    setRoomId("");
    setUsername("");
    setCode("");
    setTypingMessage("");
    setMessages([]); // Clear messages when leaving
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert("Room ID copied to clipboard!");
  };

  const handleOnChange = (newCode) => {
    setCode(newCode);
    socket.emit("Codechange", { roomId, code: newCode });
    socket.emit("typing", { roomId, user: username });
  };

  // Chat system
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = { user: username, content: newMessage, roomId };
      socket.emit("send-message", message); // Emit message to server
      setNewMessage(""); // Clear input after sending
    }
  };

  if (!joined) {
    return (
      <div className="join-Container">
        <div className="join-form">
          <h1>Join Code Room</h1>
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleJoin}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="editor-container">
        <div className="sidebar">
          <div className="room-info">
            <h2>Room: {roomId}</h2>
            <button onClick={handleCopyRoomId}>Copy Room ID</button>
          </div>

          <div className="user-info">
            <h3>Welcome, {username}</h3>
            <h4>Users in Room:</h4>
            <ul>
              {users.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>

          <div className="lang-select">
            <label htmlFor="lang">Language:</label>
            <select
              id="lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
            <button className="leave-button" onClick={handleLeave}>
              Leave Room
            </button>
          </div>

          {typingMessage && <p className="typing-indicator">✍️ {typingMessage}</p>}
        </div>

        <div className="code-editor">
          <Editor
            height="90vh"
            language={language}
            value={code}
            onChange={handleOnChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
        </div>
      </div>

      {/* Chat System */}
      <div className="chat-container">
        <div className="chat-box">
          <ul>
            {messages.map((msg, idx) => (
              <li key={idx}>
                <strong>{msg.user}: </strong>{msg.content}
              </li>
            ))}
          </ul>
        </div>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>

      <ToastContainer position="bottom-right" autoClose={2000} />
    </>
  );
};

export default App;
