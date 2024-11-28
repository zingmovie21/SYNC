const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Store rooms and their state
const rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected');
    let currentRoom = null;

    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substring(2, 8);
        rooms[roomId] = {
            host: socket.id,
            state: {
                isPlaying: false,
                time: 0,
                trackIndex: 0
            },
            users: new Set([socket.id])
        };
        
        socket.join(roomId);
        currentRoom = roomId;
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].users.add(socket.id);
            socket.join(roomId);
            currentRoom = roomId;
            socket.emit('syncState', rooms[roomId].state);
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('play', (roomId) => {
        if (rooms[roomId] && rooms[roomId].users.has(socket.id)) {
            rooms[roomId].state.isPlaying = true;
            io.to(roomId).emit('play');
        }
    });

    socket.on('pause', (roomId) => {
        if (rooms[roomId] && rooms[roomId].users.has(socket.id)) {
            rooms[roomId].state.isPlaying = false;
            io.to(roomId).emit('pause');
        }
    });

    socket.on('updatePosition', ({ position, roomId }) => {
        if (rooms[roomId] && rooms[roomId].users.has(socket.id)) {
            rooms[roomId].state.time = position;
            socket.to(roomId).emit('syncPosition', position);
        }
    });

    socket.on('trackChange', ({ index, roomId }) => {
        if (rooms[roomId] && rooms[roomId].users.has(socket.id)) {
            rooms[roomId].state.trackIndex = index;
            socket.to(roomId).emit('trackChange', index);
        }
    });

    socket.on('disconnect', () => {
        if (currentRoom) {
            if (rooms[currentRoom]) {
                rooms[currentRoom].users.delete(socket.id);
                if (rooms[currentRoom].users.size === 0) {
                    delete rooms[currentRoom];
                }
            }
            socket.leave(currentRoom);
        }
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});