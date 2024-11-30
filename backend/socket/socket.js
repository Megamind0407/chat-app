import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();

// HTTP server setup
const server = http.createServer(app);

// WebSocket Server setup with optimized configurations
const io = new Server(server, {
    cors: {
        origin: ["https://localhost:3000" || "https://chat-app-ict4.onrender.com"], // Frontend domain
        methods: ["GET", "POST"],
    },
    pingTimeout: 10000, // Close inactive connections after 10 seconds
    pingInterval: 5000, // Check client availability every 5 seconds
    maxHttpBufferSize: 1e6, // Limit message size to 1 MB
});

const userSocketMap = new Map(); // Use Map for better performance and scalability

/**
 * Get the socket ID of a specific user by userId
 * @param {string} receiverId - The ID of the receiving user
 * @returns {string | undefined} - The socket ID of the receiver
 */
export const getReceiverSocketId = (receiverId) => {
    return userSocketMap.get(receiverId);
};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Retrieve userId from the connection query
    const userId = socket.handshake.query.userId;

    // Register the connected user
    if (userId && userId !== "undefined") {
        userSocketMap.set(userId, socket.id);
        console.log(`User registered: ${userId} -> ${socket.id}`);
    }

    // Broadcast the updated list of online users to all clients
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

    // Listen for disconnection events
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);

        // Remove the user from the map
        const disconnectedUserId = [...userSocketMap.entries()].find(
            ([, value]) => value === socket.id
        )?.[0];
        if (disconnectedUserId) {
            userSocketMap.delete(disconnectedUserId);
            console.log(`User unregistered: ${disconnectedUserId}`);
        }

        // Broadcast updated online users list
        io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    });

    // Additional custom event handling (if required)
    socket.on("sendMessage", (data) => {
        const { receiverId, message } = data;
        const receiverSocketId = getReceiverSocketId(receiverId);

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("receiveMessage", { message, senderId: userId });
        }
    });
});

// Export server and app for flexibility in external use
export { app, io, server };
