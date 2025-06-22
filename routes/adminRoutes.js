const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig');
const adminController = require('../controllers/adminController');
const tracerStudyController = require('../controllers/tracerStudyController');
const jobController = require('../controllers/jobController');
const beritaAgendaController = require('../controllers/beritaAgendaController');
const dataalumniController = require('../controllers/dataalumniController');
const artikelController = require('../controllers/artikelController');

// Halaman login admin
router.get('/login', adminController.showLoginForm);

// Proses login admin
router.post('/login', adminController.login);

// Halaman dashboard admin (setelah login)
router.get('/dashboard', adminController.ensureAdmin, adminController.dashboard);

// Rute untuk kelola data alumni
router.get('/kelolaDataAlumni', adminController.ensureAdmin, dataalumniController.showKelolaDataAlumni);

// Route untuk ekspor data alumni
router.get('/kelolaDataAlumni/export', adminController.ensureAdmin, dataalumniController.exportAlumni);

// Menampilkan form edit alumni
router.get('/kelolaDataAlumni/edit/:id', adminController.ensureAdmin, dataalumniController.editAlumni);

// Proses edit alumni
router.post('/kelolaDataAlumni/edit/:id', adminController.ensureAdmin, dataalumniController.updateAlumni);

// Hapus alumni
router.post('/kelolaDataAlumni/hapus/:id', adminController.ensureAdmin, dataalumniController.deleteAlumni);

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

// Halaman kelola postingan
router.get('/kelola-postingan', adminController.ensureAdmin, artikelController.showKelolaPostingan);


// Daftar pesan
router.get('/inbox', adminController.ensureAdmin, adminController.showInbox);

// Detail pesan + balas
router.get('/pesan/:id', adminController.ensureAdmin, adminController.showMessageDetail);
router.post('/pesan/:id/balas', adminController.ensureAdmin, adminController.replyMessage);

// Kelola Posting
router.post('/kelola-postingan/:id/setujui', adminController.ensureAdmin, artikelController.setujuiPostingan);
router.post('/kelola-postingan/:id/tolak', adminController.ensureAdmin, artikelController.tolakPostingan);
router.post('/kelola-postingan/:id/hapus', adminController.ensureAdmin, artikelController.hapusPostingan);


// Logout admin
router.get('/logout', adminController.logout);

module.exports = router;