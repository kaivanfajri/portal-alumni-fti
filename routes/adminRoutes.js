const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig');
const adminController = require('../controllers/adminController');
const tracerStudyController = require('../controllers/tracerStudyController');
const jobController = require('../controllers/jobController');
const beritaAgendaController = require('../controllers/beritaAgendaController');
const artikelController = require('../controllers/artikelController');
const galleryController = require('../controllers/galleryController');
const notifikasiController = require('../controllers/notifikasiController');
const forumDiskusiController = require('../controllers/forumDiskusiController');

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

// Halaman kelola postingan
router.get('/kelola-postingan', adminController.ensureAdmin, artikelController.showKelolaPostingan);


// Kelola Posting
    router.get('/kelola-postingan/:id/setujui', adminController.ensureAdmin, artikelController.setujuiPostingan);
    router.get('/kelola-postingan/:id/tolak', adminController.ensureAdmin, artikelController.tolakPostingan);
    router.get('/kelola-postingan/:id/hapus', adminController.ensureAdmin, artikelController.hapusPostingan);

// GALERI ROUTES
router.get('/kelola-galeri', adminController.ensureAdmin, galleryController.ShowKelolagaleri);

// Tampilkan daftar semua album
router.get('/gallery/albums', adminController.ensureAdmin, galleryController.ShowKelolagaleri);

// Tampilkan form tambah album
router.get('/gallery/albums/add', adminController.ensureAdmin, galleryController.showAddAlbumForm);

// Proses tambah album
router.post('/gallery/albums/add', adminController.ensureAdmin, galleryController.addAlbum);

// Tampilkan detail album dengan foto-foto
router.get('/gallery/albums/:id', adminController.ensureAdmin, galleryController.viewAlbumDetail);

// Tampilkan form edit album
router.get('/gallery/albums/:id/edit', adminController.ensureAdmin, galleryController.showEditAlbumForm);

// Proses update album
router.post('/gallery/albums/:id/edit', adminController.ensureAdmin, galleryController.updateAlbum);

// Hapus album
router.delete('/gallery/albums/:id', adminController.ensureAdmin, galleryController.deleteAlbum);

// PHOTO ROUTES
// Tampilkan form upload foto ke album
router.get('/gallery/albums/:id/upload', adminController.ensureAdmin, galleryController.showUploadPhotoForm);

// Proses upload foto ke album
router.post('/gallery/albums/:id/upload', adminController.ensureAdmin, galleryController.uploadPhoto);

// Update keterangan foto
router.put('/gallery/photos/:id/caption', adminController.ensureAdmin, galleryController.updatePhotoCaption);

// Hapus foto dari album
router.delete('/gallery/photos/:id', adminController.ensureAdmin, galleryController.deletePhoto);

//NOTIFIKASI
router.get('/notifikasi', adminController.ensureAdmin, notifikasiController.getAllNotifications);
router.get('/notifikasi/buat', adminController.ensureAdmin, notifikasiController.showCreateForm);
router.post('/notifikasi/buat', adminController.ensureAdmin, notifikasiController.createNotification);
router.get('/notifikasi/alumni-list', adminController.ensureAdmin, notifikasiController.getAlumniList);
router.get('/notifikasi/:id', adminController.ensureAdmin, notifikasiController.getNotificationDetails);
router.post('/notifikasi/:id/hapus', adminController.ensureAdmin, notifikasiController.deleteNotification);

// Forum Diskusi Routes
router.get('/forum-diskusi', adminController.ensureAdmin, forumDiskusiController.list);
router.get('/forum-diskusi/edit/:id', adminController.ensureAdmin, forumDiskusiController.showEditForm);
router.post('/forum-diskusi/edit/:id', adminController.ensureAdmin, forumDiskusiController.edit);
router.post('/forum-diskusi/delete/:id', adminController.ensureAdmin, forumDiskusiController.delete);

// Logout admin
router.get('/logout', adminController.logout);

module.exports = router;
