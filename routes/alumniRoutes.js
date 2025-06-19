const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// GET halaman login
router.get('/login', (req, res) => {
    res.render('alumni/login', { error: null });
});

// POST proses login
router.post('/login', (req, res) => {
    const { nim, password } = req.body;

    const query = 'SELECT * FROM alumni WHERE nim = ? LIMIT 1';
    db.query(query, [nim], async (err, results) => {
        if (err) {
            console.error(err);
            return res.render('alumni/login', { error: 'Terjadi kesalahan sistem.' });
        }

        if (results.length === 0) {
            return res.render('alumni/login', { error: 'NIM tidak ditemukan.' });
        }

        const alumni = results[0];

        // Cek status
        if (alumni.status !== 'aktif') {
            return res.render('alumni/login', { error: 'Akun Anda belum aktif.' });
        }

        const passwordMatch = await bcrypt.compare(password, alumni.password);

        if (!passwordMatch) {
            return res.render('alumni/login', { error: 'Password salah.' });
        }

        // Simpan data alumni ke session
        req.session.alumni = {
            id: alumni.id,
            nim: alumni.nim,
            email: alumni.email,
        };

        return res.redirect('/alumni/dashboard');
    });
});

// Halaman dashboard alumni (hanya jika login)
router.get('/dashboard', (req, res) => {
    if (!req.session.alumni) {
        return res.redirect('/alumni/login');
    }

    res.render('alumni/dashboard', {
        alumni: req.session.alumni,
    });
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/alumni/login');
    });
});

module.exports = router;
