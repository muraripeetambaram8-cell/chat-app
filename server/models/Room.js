const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name:      { type: String, required: true, unique: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPrivate: { type: Boolean, default: false },
  password:  { type: String, default: null },
  members:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);