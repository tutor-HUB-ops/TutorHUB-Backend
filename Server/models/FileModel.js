const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: String,
  originalName: String,
  path: String,
  mimeType: String,
  size: Number,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const FileModel= mongoose.model("File",fileSchema)
module.exports={FileModel}