const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const tracerStudyController = require('../controllers/tracerStudyController');
const jobController = require('../controllers/jobController');

// Halaman login admin
router.get('/login', adminController.showLoginForm);

// Proses login admin
router.post('/login', adminController.login);

// Halaman dashboard admin (setelah login)
router.get('/dashboard', adminController.ensureAdmin, adminController.dashboard);

//Halaman kelola-data-alumni
router.get('/kelolaDataAlumni', adminController.showKelolaDataAlumni);

// Export Tracer Study Data
router.get('/exportTracerStudy', tracerStudyController.exportTracerStudy);
router.post('/exportTracerStudy/generate', tracerStudyController.generateExport);
// Halaman moderasi job posting
router.get('/moderasi-job-posting', adminController.ensureAdmin, jobController.showModerasiJobPosting);

// Approve job posting
router.post('/approve-job/:id', adminController.ensureAdmin, jobController.approveJob);

// Reject job posting
router.post('/reject-job/:id', adminController.ensureAdmin, jobController.rejectJob);

// Logout admin
router.get('/logout', adminController.logout);

module.exports = router;
