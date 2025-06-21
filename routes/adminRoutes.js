const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig');
const adminController = require('../controllers/adminController');
const tracerStudyController = require('../controllers/tracerStudyController');
const jobController = require('../controllers/jobController');
const beritaAgendaController = require('../controllers/beritaAgendaController');

// Halaman login admin
router.get('/login', adminController.showLoginForm);

// Proses login admin
router.post('/login', adminController.login);

// Halaman dashboard admin (setelah login)
router.get('/dashboard', adminController.ensureAdmin, adminController.dashboard);

// Halaman kelola-data-alumni
router.get('/kelolaDataAlumni', adminController.ensureAdmin, adminController.showKelolaDataAlumni);

// Export Tracer Study Data
router.get('/exportTracerStudy', adminController.ensureAdmin, tracerStudyController.exportTracerStudy);
router.post('/exportTracerStudy/generate', adminController.ensureAdmin, tracerStudyController.generateExport);

// Halaman moderasi job posting
router.get('/moderasi-job-posting', adminController.ensureAdmin, jobController.showModerasiJobPosting);

// Approve job posting
router.post('/approve-job/:id', adminController.ensureAdmin, jobController.approveJob);

// Reject job posting
router.post('/reject-job/:id', adminController.ensureAdmin, jobController.rejectJob);

// Daftar job yang sudah disetujui oleh admin (untuk publik)
router.get('/list-approved-jobs', jobController.listApprovedJobs);
// Routes untuk mengelola berita/agenda
router.get('/kelolaBeritaAgenda', adminController.ensureAdmin, beritaAgendaController.tampilkanDaftar);
router.get('/kelolaBeritaAgenda/tambah', adminController.ensureAdmin, beritaAgendaController.tampilkanFormTambah);

// Route tambah data dengan upload file
router.post('/kelolaBeritaAgenda/tambah', adminController.ensureAdmin, upload.single('cover_gambar'), beritaAgendaController.tambahData);

router.get('/kelolaBeritaAgenda/edit/:id', adminController.ensureAdmin, beritaAgendaController.tampilkanFormEdit);

router.post('/kelolaBeritaAgenda/edit/:id', adminController.ensureAdmin, upload.single('cover_gambar'), beritaAgendaController.editData);

router.post('/kelolaBeritaAgenda/hapus/:id', adminController.ensureAdmin, beritaAgendaController.hapusData);

// Logout admin
router.get('/logout', adminController.logout);

module.exports = router;
