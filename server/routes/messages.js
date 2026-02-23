const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Message = require('../models/Message');
const auth    = require('../middleware/authMiddleware');
const router  = express.Router();

// ── AUDIO ─────────────────────────────────────────────────────────
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/audio';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext    = path.extname(file.originalname) || '.webm';
    cb(null, 'voice-' + unique + ext);
  },
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) return cb(null, true);
    cb(new Error('Audio uniquement'));
  },
});

// ── FICHIERS ──────────────────────────────────────────────────────
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/files';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext    = path.extname(file.originalname);
    cb(null, 'file-' + unique + ext);
  },
});

const imageExts = [
  'jpg','jpeg','png','gif','webp',
  'bmp','svg','tiff','ico','heic','heif','avif',
];

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
  storage: fileStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isImageMime = file.mimetype.startsWith('image/');
    const ext         = path.extname(file.originalname).replace('.', '').toLowerCase();
    const isImageExt  = imageExts.includes(ext);

    if (isImageMime || isImageExt || allowedMimes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Format non supporte'));
  },
});

// GET /api/messages/:userId — historique conversation
router.get('/:userId', auth, async (req, res) => {
  try {
    const myId     = req.user._id;
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

// POST /api/messages/voice — message vocal
router.post('/voice', auth, uploadAudio.single('audio'), async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Fichier audio manquant' });

    const audioUrl = '/uploads/audio/' + req.file.filename;
    const message  = await Message.create({
      sender:   req.user._id,
      receiver: receiverId,
      type:     'voice',
      audioUrl,
    });
    await message.populate('sender', 'username avatar');
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/messages/file — fichier ou image
router.post('/file', auth, uploadFile.single('file'), async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Fichier manquant' });

    const ext     = path.extname(req.file.originalname).replace('.', '').toLowerCase();
    const isImage = req.file.mimetype.startsWith('image/') || imageExts.includes(ext);
    const fileUrl = '/uploads/files/' + req.file.filename;

    const message = await Message.create({
      sender:   req.user._id,
      receiver: receiverId,
      type:     isImage ? 'image' : 'file',
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
    await message.populate('sender', 'username avatar');
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
