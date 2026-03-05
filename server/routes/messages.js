const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');
const Message  = require('../models/Message');
const auth     = require('../middleware/authMiddleware');
const router   = express.Router();

// ── CLOUDINARY CONFIG ─────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── MULTER (mémoire uniquement, pas de disque) ────────────────────
const storage = multer.memoryStorage();

const uploadAudio = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.originalname.endsWith('.webm')) {
      return cb(null, true);
    }
    cb(new Error('Audio uniquement'));
  },
});

const imageExts = ['jpg','jpeg','png','gif','webp','bmp','svg','tiff','ico','heic','heif','avif'];

const allowedMimes = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
];

const uploadFile = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isImageMime = file.mimetype.startsWith('image/');
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
    if (isImageMime || imageExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Format non supporté'));
  },
});

// ── HELPER: upload buffer vers Cloudinary ────────────────────────
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// GET /api/messages/:userId — historique conversation
router.get('/:userId', auth, async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: myId,   receiver: userId },
        { sender: userId, receiver: myId   },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender',   'username avatar')
      .populate('receiver', 'username avatar');

    await Message.updateMany(
      { sender: userId, receiver: myId, read: false },
      { read: true }
    );

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/messages/voice — message vocal → Cloudinary
router.post('/voice', auth, uploadAudio.single('audio'), async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Fichier audio manquant' });

    const result = await uploadToCloudinary(req.file.buffer, {
      resource_type: 'auto', // webm/audio = video sur Cloudinary
      folder: 'chat-app/audio',
    });

    const message = await Message.create({
      sender:   req.user._id,
      receiver: receiverId,
      type:     'voice',
      audioUrl: result.secure_url,
    });
    await message.populate('sender', 'username avatar');
    res.status(201).json({ message });
  } catch (err) {
    console.error('voice upload error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/messages/file — fichier ou image → Cloudinary
router.post('/file', auth, uploadFile.single('file'), async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Fichier manquant' });

    const ext     = path.extname(req.file.originalname).replace('.', '').toLowerCase();
    const isImage = req.file.mimetype.startsWith('image/') || imageExts.includes(ext);

    const result = await uploadToCloudinary(req.file.buffer, {
      resource_type: isImage ? 'image' : 'raw',
      folder: isImage ? 'chat-app/images' : 'chat-app/files',
      public_id: path.basename(req.file.originalname, path.extname(req.file.originalname)),
      use_filename: true,
      unique_filename: true,
    });

    const message = await Message.create({
      sender:   req.user._id,
      receiver: receiverId,
      type:     isImage ? 'image' : 'file',
      fileUrl:  result.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
    await message.populate('sender', 'username avatar');
    res.status(201).json({ message });
  } catch (err) {
    console.error('file upload error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
