const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// Get all public rooms
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false })
      .sort({ createdAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a room
router.post('/', auth, async (req, res) => {
  try {
    const { name, isPrivate, password } = req.body;
    const exists = await Room.findOne({ name });
    if (exists) return res.status(400).json({ message: 'Room already exists' });

    const hashed = password ? await bcrypt.hash(password, 10) : null;

    const room = await Room.create({
      name,
      createdBy: req.user.id,
      isPrivate: isPrivate || false,
      password: hashed,
      members: [req.user.id],
      admins: [req.user.id]
    });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Join a room (with password check)
router.post('/join/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Check if already a member
    if (room.members.includes(req.user.id)) {
      return res.json({ success: true, room });
    }

    // Check password if room has one
    if (room.password) {
      const match = await bcrypt.compare(req.body.password || '', room.password);
      if (!match) return res.status(401).json({ message: 'Wrong password!' });
    }

    // Check if private
    if (room.isPrivate) {
      return res.status(403).json({ message: 'This is a private room. You need an invite!' });
    }

    // Add member
    room.members.push(req.user.id);
    await room.save();
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Invite user to private room (admin only)
router.post('/invite/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (!room.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can invite!' });
    }

    const { userId } = req.body;
    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Kick user (admin only)
router.post('/kick/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (!room.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can kick users!' });
    }

    const { userId } = req.body;
    room.members = room.members.filter(m => m.toString() !== userId);
    await room.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete room (admin only)
router.delete('/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (!room.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can delete rooms!' });
    }

    await room.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get room members
router.get('/members/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).populate('members', 'username email');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room.members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;