const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const jobController = require('../controllers/jobController');
const alumniController = require('../controllers/alumniController');
const artikelController = require('../controllers/artikelController');
const beritaAgendaController = require('../controllers/beritaAgendaController');
const upload = require('../config/multerConfig');
const galleryController = require('../controllers/galleryController');

// Registration routes
router.get('/alumni/register', alumniController.showRegisterForm);
router.post('/alumni/register', alumniController.registerAlumni);

// Middleware untuk check session alumni
const requireAlumniAuth = (req, res, next) => {
    if (!req.session.alumni) {
        return res.redirect('/alumni/login');
    }
    next();
};

// Login routes
router.get('/alumni/login', alumniController.showLoginForm);
router.post('/alumni/login', alumniController.loginAlumni);

// Rute profil alumni
router.get('/profilAlumni', requireAlumniAuth, alumniController.getProfilAlumni);
router.get('/alumni/InputProfilAlumni', requireAlumniAuth, alumniController.showInputProfileForm);
router.post('/alumni/profil', requireAlumniAuth, upload.single('foto_profil'), alumniController.saveProfile);

// Halaman dashboard alumni
router.get('/alumni/dashboard', requireAlumniAuth, alumniController.showDashboard);

// Daftar postingan alumni yang disetujui
router.get('/alumni/list-postingan', requireAlumniAuth, artikelController.daftarArtikel);

// Tracer Study routes
router.get('/alumni/tracerStudy', requireAlumniAuth, alumniController.showTracerStudyForm);
router.post('/alumni/tracerStudy', requireAlumniAuth, alumniController.submitTracerStudy);
router.get('/alumni/editTracerStudy', requireAlumniAuth, alumniController.showEditTracerStudy);
router.put('/alumni/tracerStudy', requireAlumniAuth, alumniController.updateTracerStudy);

// Hubungi Admin
router.get('/alumni/hubungiAdmin', requireAlumniAuth, alumniController.showHubungiAdmin);
router.post('/alumni/hubungiAdmin', requireAlumniAuth, alumniController.sendMessageToAdmin);

//Riwayat Hubungi Admin
router.get('/riwayatHubungiAdmin', requireAlumniAuth, alumniController.showRiwayatHubungiAdmin);
router.get('/riwayatHubungiAdmin/:id', requireAlumniAuth, alumniController.showDetailRiwayat);

// Job routes
router.get('/alumni/upload-job', requireAlumniAuth, jobController.showUploadJobForm);
router.post('/alumni/upload-job', requireAlumniAuth, jobController.submitUploadJob);
router.get('/alumni/list-job', requireAlumniAuth, jobController.listJob);
router.get('/alumni/list-jobDisetujui', jobController.listJobDisetujui);
router.get('/alumni/detail-job/:id', requireAlumniAuth, jobController.detailJob);


//Upload Postingan
router.get('/alumni/upload-postingan', requireAlumniAuth, alumniController.showUploadPostinganForm);
router.post('/alumni/upload-postingan', requireAlumniAuth, upload.single('gambar'), artikelController.uploadPostingan);

//detail artikel
router.get('/detail-konten/:id', requireAlumniAuth, artikelController.detailKonten);


// Logout
router.get('/alumni/logout', alumniController.logoutAlumni);

// berita agenda
router.get('/berita-agenda', beritaAgendaController.tampilkanBeritaPublic);
router.get('/berita-agenda/:id', beritaAgendaController.tampilkanDetailBeritaPublic);
router.get('/faq', (req, res) => {
    res.render('faq', { title: 'faq' });
});

//Alumni galeri
router.get('/alumni/gallery', requireAlumniAuth, galleryController.alumniGallery);
router.get('/alumni/gallery/:id', requireAlumniAuth, galleryController.detailAlumniGallery);



module.exports = router;