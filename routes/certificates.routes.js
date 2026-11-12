const express = require('express');
const router = express.Router();
const certificatesController = require('../controllers/certificates.controller');
const { isAuthenticated } = require('../middleware/auth');

// Публичные
router.get('/', certificatesController.getCertificates);
router.get('/:id', certificatesController.getCertificate);

// Админские
router.get('/admin/all', isAuthenticated, certificatesController.getAllCertificatesAdmin);
router.post('/', isAuthenticated, certificatesController.createCertificate);
router.put('/:id', isAuthenticated, certificatesController.updateCertificate);
router.delete('/:id', isAuthenticated, certificatesController.deleteCertificate);

module.exports = router;