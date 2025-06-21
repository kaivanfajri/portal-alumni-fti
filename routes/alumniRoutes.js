const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const jobController = require('../controllers/jobController');

// Middleware untuk check session alumni
const requireAlumniAuth = (req, res, next) => {
    if (!req.session.alumni) {
        return res.redirect('/alumni/login');
    }
    next();
};

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
router.get('/dashboard', requireAlumniAuth, (req, res) => {
    const alumniId = req.session.alumni.id;

    // Cek apakah alumni sudah mengisi tracer study
    const checkTracerQuery = 'SELECT * FROM tracer_study WHERE alumni_id = ?';
    db.query(checkTracerQuery, [alumniId], (err, tracerResults) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Terjadi kesalahan sistem');
        }

        // Get alumni profile data
        const profileQuery = `
            SELECT ap.*, a.nim, a.email
            FROM alumni_profiles ap
            JOIN alumni a ON ap.alumni_id = a.id
            WHERE a.id = ?
        `;

        db.query(profileQuery, [alumniId], (err, profileResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Terjadi kesalahan sistem');
            }

            const profile = profileResults[0] || null;
            const hasTracerStudy = tracerResults.length > 0;
            const tracerStudy = tracerResults[0] || null;

            res.render('alumni/dashboard', {
                alumni: req.session.alumni,
                profile: profile,
                hasTracerStudy: hasTracerStudy,
                tracerStudy: tracerStudy,
            });
        });
    });
});

// GET halaman tracer study
router.get('/tracerStudy', requireAlumniAuth, (req, res) => {
    const alumniId = req.session.alumni.id;

    // Cek apakah alumni sudah mengisi tracer study
    const checkQuery = 'SELECT * FROM tracer_study WHERE alumni_id = ?';
    db.query(checkQuery, [alumniId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Terjadi kesalahan sistem');
        }

        if (results.length > 0) {
            // Jika sudah mengisi, redirect ke dashboard atau halaman edit
            return res.redirect('/alumni/dashboard?message=tracer_already_filled');
        }

        res.render('alumni/tracerStudy', {
            alumni: req.session.alumni,
            title: 'Tracer Study',
        });
    });
});

// POST submit tracer study
router.post('/tracerStudy', requireAlumniAuth, (req, res) => {
    const alumniId = req.session.alumni.id;
    const { status_kerja, nama_perusahaan, posisi, lama_tunggu_kerja, sesuai_bidang, gaji_range, kepuasan_kerja, saran_kampus } = req.body;

    // Validasi data required
    if (!status_kerja) {
        return res.status(400).json({
            success: false,
            message: 'Status kerja harus dipilih',
        });
    }

    // Cek apakah alumni sudah mengisi tracer study
    const checkQuery = 'SELECT id FROM tracer_study WHERE alumni_id = ?';
    db.query(checkQuery, [alumniId], (err, results) => {
        if (err) {
            console.error('Error checking existing tracer study:', err);
            return res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan sistem',
            });
        }

        if (results.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Anda sudah mengisi tracer study sebelumnya',
            });
        }

        // Insert data tracer study
        const insertQuery = `
            INSERT INTO tracer_study (
                alumni_id, 
                status_kerja, 
                nama_perusahaan, 
                posisi, 
                lama_tunggu_kerja, 
                sesuai_bidang, 
                gaji_range, 
                kepuasan_kerja, 
                saran_kampus, 
                tanggal_isi, 
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const values = [alumniId, status_kerja, nama_perusahaan || null, posisi || null, lama_tunggu_kerja || null, sesuai_bidang || null, gaji_range || null, kepuasan_kerja || null, saran_kampus || null];

        db.query(insertQuery, values, (err, result) => {
            if (err) {
                console.error('Error inserting tracer study:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Gagal menyimpan tracer study',
                });
            }

            res.json({
                success: true,
                message: 'Tracer study berhasil disimpan',
                data: {
                    id: result.insertId,
                },
            });
        });
    });
});

// GET halaman edit tracer study
router.get('/editTracerStudy', requireAlumniAuth, (req, res) => {
    const alumniId = req.session.alumni.id;

    const query = 'SELECT * FROM tracer_study WHERE alumni_id = ?';
    db.query(query, [alumniId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Terjadi kesalahan sistem');
        }

        if (results.length === 0) {
            return res.redirect('/alumni/tracerStudy');
        }

        res.render('alumni/editTracerStudy', {
            alumni: req.session.alumni,
            tracerStudy: results[0],
            title: 'Edit Tracer Study',
        });
    });
});

// PUT update tracer study
router.put('/tracerStudy', requireAlumniAuth, (req, res) => {
    const alumniId = req.session.alumni.id;
    const { status_kerja, nama_perusahaan, posisi, lama_tunggu_kerja, sesuai_bidang, gaji_range, kepuasan_kerja, saran_kampus } = req.body;

    // Validasi data required
    if (!status_kerja) {
        return res.status(400).json({
            success: false,
            message: 'Status kerja harus dipilih',
        });
    }

    const updateQuery = `
        UPDATE tracer_study SET 
            status_kerja = ?, 
            nama_perusahaan = ?, 
            posisi = ?, 
            lama_tunggu_kerja = ?, 
            sesuai_bidang = ?, 
            gaji_range = ?, 
            kepuasan_kerja = ?, 
            saran_kampus = ?, 
            updated_at = NOW()
        WHERE alumni_id = ?
    `;

    const values = [status_kerja, nama_perusahaan || null, posisi || null, lama_tunggu_kerja || null, sesuai_bidang || null, gaji_range || null, kepuasan_kerja || null, saran_kampus || null, alumniId];

    db.query(updateQuery, values, (err, result) => {
        if (err) {
            console.error('Error updating tracer study:', err);
            return res.status(500).json({
                success: false,
                message: 'Gagal mengupdate tracer study',
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data tracer study tidak ditemukan',
            });
        }

        res.json({
            success: true,
            message: 'Tracer study berhasil diupdate',
        });
    });
});

// GET halaman upload job
router.get('/upload-job', requireAlumniAuth, jobController.showUploadJobForm);

// POST proses upload job (insert ke database)
router.post('/upload-job', requireAlumniAuth, jobController.submitUploadJob);

// List semua job yang sudah diapprove (untuk alumni)
router.get('/list-job', requireAlumniAuth, jobController.listJob);

// Route untuk menampilkan daftar lowongan kerja yang disetujui
router.get('/list-jobDisetujui', jobController.listJobDisetujui);

// Detail job
router.get('/detail-job/:id', requireAlumniAuth, jobController.detailJob);

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/alumni/login');
    });
});

module.exports = router;
