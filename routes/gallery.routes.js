const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/gallery.controller');
const { isAuthenticated } = require('../middleware/auth');

// Публичные
router.get('/albums', galleryController.getAlbums);
router.get('/albums/:id', galleryController.getAlbum);

// Админские
router.get('/admin/albums', isAuthenticated, galleryController.getAllAlbumsAdmin);
router.post('/albums', isAuthenticated, galleryController.createAlbum);
router.put('/albums/:id', isAuthenticated, galleryController.updateAlbum);
router.delete('/albums/:id', isAuthenticated, galleryController.deleteAlbum);

module.exports = router;