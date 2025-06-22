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

// Logout admin
router.get('/logout', adminController.logout);

// Middleware untuk memastikan admin sudah login
router.use(adminController.ensureAdmin);

// ======================
// DASHBOARD & UTAMA
// ======================

// Halaman dashboard admin
router.get('/dashboard', adminController.dashboard);

// ======================
// MANAJEMEN ALUMNI
// ======================

// Kelola data alumni
router.get('/kelolaDataAlumni', dataalumniController.showKelolaDataAlumni);

// Ekspor data alumni
router.get('/kelolaDataAlumni/export', dataalumniController.exportAlumni);

// Edit data alumni
router.get('/kelolaDataAlumni/edit/:id', dataalumniController.editAlumni);
router.post('/kelolaDataAlumni/edit/:id', dataalumniController.updateAlumni);

// Hapus alumni
router.post('/kelolaDataAlumni/hapus/:id', dataalumniController.deleteAlumni);

// ======================
// TRACER STUDY
// ======================

// Ekspor data tracer study
router.get('/exportTracerStudy', tracerStudyController.exportTracerStudy);
router.post('/exportTracerStudy/generate', tracerStudyController.generateExport);

// ======================
// LOWONGAN PEKERJAAN
// ======================

// Moderasi job posting
router.get('/moderasi-job-posting', jobController.showModerasiJobPosting);

// Approve/reject job posting
router.post('/approve-job/:id', jobController.approveJob);
router.post('/reject-job/:id', jobController.rejectJob);

// Daftar job yang sudah disetujui
router.get('/list-approved-jobs', jobController.listApprovedJobs);

// ======================
// BERITA & AGENDA
// ======================

// Kelola berita/agenda
router.get('/kelolaBeritaAgenda', beritaAgendaController.tampilkanDaftar);
router.get('/kelolaBeritaAgenda/tambah', beritaAgendaController.tampilkanFormTambah);
router.post('/kelolaBeritaAgenda/tambah', upload.single('cover_gambar'), beritaAgendaController.tambahData);

// Edit berita/agenda
router.get('/kelolaBeritaAgenda/edit/:id', beritaAgendaController.tampilkanFormEdit);
router.post('/kelolaBeritaAgenda/edit/:id', upload.single('cover_gambar'), beritaAgendaController.editData);

// Hapus berita/agenda
router.post('/kelolaBeritaAgenda/hapus/:id', beritaAgendaController.hapusData);

// ======================
// MANAJEMEN POSTINGAN ALUMNI
// ======================

// Kelola postingan (pending approval)
router.get('/kelola-postingan', artikelController.showKelolaPostingan);

// Riwayat postingan (approved/rejected)
router.get('/riwayat-postingan', artikelController.riwayatPostingan);

// Aksi moderasi postingan
router.post('/kelola-postingan/:id/setujui', artikelController.setujuiPostingan);
router.post('/kelola-postingan/:id/tolak', artikelController.tolakPostingan);
router.post('/kelola-postingan/:id/hapus', artikelController.hapusPostingan);

// ======================
// MANAJEMEN PESAN
// ======================

// Kotak masuk
router.get('/inbox', adminController.showInbox);

// Detail pesan & balas
router.get('/pesan/:id', adminController.showMessageDetail);
router.post('/pesan/:id/balas', adminController.replyMessage);

//eskport riwayat excel
router.get('/riwayat-postingan/export',adminController.ensureAdmin, artikelController.exportRiwayatExcel );     

module.exports = router;