const express = require('express');
const router = express.Router();
const certificatesController = require('../controllers/certificates.controller');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validateId } = require('../middleware/validate');

const staff = [isAuthenticated, requireRole('admin', 'manager')];

router.get('/', certificatesController.getCertificates);
router.get('/admin/all', ...staff, certificatesController.getAllCertificatesAdmin);
router.get('/:id', validateId('id'), optionalAuth, certificatesController.getCertificate);

router.post('/', ...staff, certificatesController.createCertificate);
router.put('/:id', ...staff, validateId('id'), certificatesController.updateCertificate);
router.delete('/:id', ...staff, validateId('id'), certificatesController.deleteCertificate);

module.exports = router;
