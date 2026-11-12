const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/gallery.controller');
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.get('/albums', galleryController.getAlbums);
router.get('/albums/:id', galleryController.getAlbum);

router.get('/admin/albums', ...staff, galleryController.getAllAlbumsAdmin);
router.post('/albums', ...staff, galleryController.createAlbum);
router.put('/albums/:id', ...staff, galleryController.updateAlbum);
router.delete('/albums/:id', ...staff, galleryController.deleteAlbum);

module.exports = router;
