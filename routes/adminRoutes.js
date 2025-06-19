const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Halaman login admin
router.get('/login', adminController.showLoginForm);

// Proses login admin
router.post('/login', adminController.login);

// Halaman dashboard admin (setelah login)
router.get('/dashboard', adminController.ensureAdmin, adminController.dashboard);

//Halaman kelola-data-alumni
router.get('/kelolaDataAlumni', adminController.showKelolaDataAlumni);

// Logout admin
router.get('/logout', adminController.logout);

module.exports = router;
