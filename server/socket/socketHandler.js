const Message = require('../models/Message');
const Room = require('../models/Room');

module.exports = (io) => {
  const onlineUsers = {};

  io.on('connection', (socket) => {
    const { userId, username } = socket.handshake.auth;
    console.log(`${username} connected`);

    onlineUsers[userId] = username;
    io.emit('online_users', onlineUsers);

    socket.on('join_room', async (roomId) => {
      socket.join(roomId);
      console.log(`${username} joined room ${roomId}`);
      const history = await Message.find({ room: roomId })
        .sort({ createdAt: 1 }).limit(50).populate('sender', 'username');
      socket.emit('message_history', history);
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
    });

    socket.on('send_message', async ({ roomId, content, fileUrl, type }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) return;
        if (!room.members.includes(userId)) return;

        const msg = await Message.create({
          room: roomId, sender: userId,
          content, fileUrl, type: type || 'text'
        });
        const populated = await msg.populate('sender', 'username');
        io.to(roomId).emit('new_message', populated);
      } catch (err) {
        console.log('Message error:', err);
      }
    });

    // Kick user
    socket.on('kick_user', async ({ roomId, targetUserId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room.admins.includes(userId)) return;
        room.members = room.members.filter(m => m.toString() !== targetUserId);
        await room.save();
        io.to(roomId).emit('kicked', { roomId, userId: targetUserId });
        console.log(`${username} kicked ${targetUserId} from ${room.name}`);
      } catch (err) {
        console.log('Kick error:', err);
      }
    });

    // Delete room
    socket.on('delete_room', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room.admins.includes(userId)) return;
        await Message.deleteMany({ room: roomId });
        await room.deleteOne();
        io.to(roomId).emit('room_deleted', roomId);
        console.log(`${username} deleted room ${roomId}`);
      } catch (err) {
        console.log('Delete error:', err);
      }
    });
    // Add reaction
socket.on('add_reaction', async ({ messageId, emoji }) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) return;

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      r => r.userId.toString() !== userId
    );

    // Add new reaction
    message.reactions.push({ emoji, userId, username });
    await message.save();

    // Broadcast to room
    io.to(message.room.toString()).emit('reaction_updated', {
      messageId,
      reactions: message.reactions
    });
  } catch (err) {
    console.log('Reaction error:', err);
  }
});

    socket.on('typing_start', ({ roomId }) => {
      socket.to(roomId).emit('typing_indicator', { username, typing: true });
    });

    socket.on('typing_stop', ({ roomId }) => {
      socket.to(roomId).emit('typing_indicator', { username, typing: false });
    });

    socket.on('disconnect', () => {
      console.log(`${username} disconnected`);
      delete onlineUsers[userId];
      io.emit('online_users', onlineUsers);
    });
  });
};