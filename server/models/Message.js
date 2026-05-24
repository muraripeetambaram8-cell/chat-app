const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  room:    { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  fileUrl: { type: String },
  type:    { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  reactions: [{
    emoji:  { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);