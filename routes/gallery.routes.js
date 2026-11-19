const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/gallery.controller');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validateId } = require('../middleware/validate');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.get('/albums', galleryController.getAlbums);
router.get('/albums/:id', validateId('id'), optionalAuth, galleryController.getAlbum);

router.get('/admin/albums', ...staff, galleryController.getAllAlbumsAdmin);
router.post('/albums', ...staff, galleryController.createAlbum);
router.put('/albums/:id', ...staff, validateId('id'), galleryController.updateAlbum);
router.delete('/albums/:id', ...staff, validateId('id'), galleryController.deleteAlbum);

module.exports = router;
