import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  const roomUsers = {}; 
  const socketToUser = {}; 

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    
    socket.on("room:join", ({ roomId, username }) => {
      console.log(`${username} joining room ${roomId}`);
      
      socket.join(roomId);
      
      socketToUser[socket.id] = { roomId, username };
      
      if (!roomUsers[roomId]) {
        roomUsers[roomId] = {};
      }
      
      if (!roomUsers[roomId][username]) {
        roomUsers[roomId][username] = [];
      }
      roomUsers[roomId][username].push(socket.id);
      
      const usersInRoom = Object.keys(roomUsers[roomId]);
      console.log(`Users in room ${roomId}:`, usersInRoom);
      
      io.to(roomId).emit("room:users", usersInRoom);
      
      if (roomUsers[roomId][username].length === 1) {
        socket.to(roomId).emit("user:joined", { username });
      }
    });

    socket.on("room:leave", ({ roomId, username }) => {
      console.log(`${username} leaving room ${roomId}`);
      socket.leave(roomId);
      removeUserFromRoom(socket.id, roomId, username);
    });

    socket.on("music:play", ({ roomId, trackId, currentTime = 0 }) => {
      console.log(`Music play event in room ${roomId}:`, trackId, 'at time:', currentTime);
      io.to(roomId).emit("music:sync", { 
        action: "play",
        isPlaying: true, 
        trackId,
        currentTime,
        timestamp: Date.now()
      });
    });

    socket.on("music:pause", ({ roomId, currentTime = 0 }) => {
      console.log(`Music pause event in room ${roomId} at time:`, currentTime);
      io.to(roomId).emit("music:sync", { 
        action: "pause",
        isPlaying: false,
        currentTime,
        timestamp: Date.now()
      });
    });

    socket.on("music:seek", ({ roomId, currentTime, isPlaying }) => {
      console.log(`Music seek in room ${roomId} to time:`, currentTime);
      io.to(roomId).emit("music:sync", { 
        action: "seek",
        currentTime,
        isPlaying,
        timestamp: Date.now()
      });
    });

    socket.on("track:change", ({ roomId, trackId, autoPlay = true }) => {
      console.log(`Track change in room ${roomId} to:`, trackId);
      io.to(roomId).emit("music:sync", {
        action: "trackChange",
        trackId,
        isPlaying: autoPlay,
        currentTime: 0,
        timestamp: Date.now()
      });
    });

    socket.on("music:next", ({ roomId }) => {
      console.log(`Next track event in room ${roomId}`);
      socket.to(roomId).emit("music:next", {
        timestamp: Date.now()
      });
    });

    socket.on("room:update", ({ roomId, updates }) => {
      console.log(`Room update in ${roomId}:`, updates);
      socket.to(roomId).emit("room:updated", {
        ...updates,
        timestamp: Date.now()
      });
    });

    socket.on("music:add", ({ roomId, track }) => {
      console.log(`Track added to room ${roomId}:`, track.title);
      socket.to(roomId).emit("playlist:updated", {
        action: "add",
        track,
        timestamp: Date.now()
      });
    });

    socket.on("music:remove", ({ roomId, trackId }) => {
      console.log(`Track removed from room ${roomId}:`, trackId);
      socket.to(roomId).emit("playlist:updated", {
        action: "remove",
        trackId,
        timestamp: Date.now()
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      
      const userInfo = socketToUser[socket.id];
      if (userInfo) {
        const { roomId, username } = userInfo;
        removeUserFromRoom(socket.id, roomId, username);
        delete socketToUser[socket.id];
      }
    });

    function removeUserFromRoom(socketId, roomId, username) {
      if (roomUsers[roomId] && roomUsers[roomId][username]) {
        roomUsers[roomId][username] = roomUsers[roomId][username].filter(id => id !== socketId);
        
        if (roomUsers[roomId][username].length === 0) {
          delete roomUsers[roomId][username];
          
          socket.to(roomId).emit("user:left", { username });
          
          const usersInRoom = Object.keys(roomUsers[roomId]);
          io.to(roomId).emit("room:users", usersInRoom);
          
          console.log(`${username} completely left room ${roomId}`);
        }
        
        if (Object.keys(roomUsers[roomId]).length === 0) {
          delete roomUsers[roomId];
          console.log(`Room ${roomId} is now empty and cleaned up`);
        }
      }
    }

    socket.on("ping", ({ roomId }) => {
      socket.emit("pong", { 
        timestamp: Date.now(),
        roomId 
      });
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  io.engine.on("connection_error", (err) => {
    console.error("Connection error:", err.req);
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    console.error("Error context:", err.context);
  });

  httpServer.listen(port, () => {
    console.log(`> Server running on http://${hostname}:${port}`);
    console.log(`> Socket.IO server is ready for connections`);
  });
});
