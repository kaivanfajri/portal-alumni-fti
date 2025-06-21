const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const jobController = require('../controllers/jobController');
const alumniController = require('../controllers/alumniController');

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

// Login routes (pindahkan ke controller)
router.get('/alumni/login', alumniController.showLoginForm);
router.post('/alumni/login', alumniController.loginAlumni);

// Halaman dashboard alumni (hanya jika login)
router.get('/alumni/dashboard', requireAlumniAuth, alumniController.showDashboard);

// Tracer Study routes
router.get('/alumni/tracerStudy', requireAlumniAuth, alumniController.showTracerStudyForm);
router.post('/alumni/tracerStudy', requireAlumniAuth, alumniController.submitTracerStudy);
router.get('/alumni/editTracerStudy', requireAlumniAuth, alumniController.showEditTracerStudy);
router.put('/alumni/tracerStudy', requireAlumniAuth, alumniController.updateTracerStudy);

// Job routes
router.get('/alumni/upload-job', requireAlumniAuth, jobController.showUploadJobForm);
router.post('/alumni/upload-job', requireAlumniAuth, jobController.submitUploadJob);
router.get('/alumni/list-job', requireAlumniAuth, jobController.listJob);
router.get('/alumni/list-jobDisetujui', jobController.listJobDisetujui);
router.get('/alumni/detail-job/:id', requireAlumniAuth, jobController.detailJob);

// Logout
router.get('/alumni/logout', alumniController.logoutAlumni);

module.exports = router;
