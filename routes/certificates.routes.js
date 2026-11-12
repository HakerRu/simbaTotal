const express = require('express');
const router = express.Router();
const certificatesController = require('../controllers/certificates.controller');
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.get('/', certificatesController.getCertificates);
router.get('/admin/all', ...staff, certificatesController.getAllCertificatesAdmin);
router.get('/:id', certificatesController.getCertificate);

router.post('/', ...staff, certificatesController.createCertificate);
router.put('/:id', ...staff, certificatesController.updateCertificate);
router.delete('/:id', ...staff, certificatesController.deleteCertificate);

module.exports = router;
