const db = require('../config/db');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const alumniController = {
    // Register
    showRegisterForm: (req, res) => {
        res.render('alumni/register', {
            error: null,
            formData: null,
        });
    },

    registerAlumni: (req, res) => {
        const { nim, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.render('alumni/register', {
                error: 'Password dan konfirmasi password tidak sama',
                formData: req.body,
            });
        }

        bcrypt.hash(password, saltRounds, (hashErr, hashedPassword) => {
            if (hashErr) {
                console.error('Hashing error:', hashErr);
                return res.render('alumni/register', {
                    error: 'Terjadi kesalahan sistem',
                    formData: req.body,
                });
            }

            db.query('SELECT * FROM alumni WHERE nim = ? OR email = ?', [nim, email], (err, existingAlumni) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.render('alumni/register', {
                        error: 'Terjadi kesalahan database',
                        formData: req.body,
                    });
                }

                if (existingAlumni.length > 0) {
                    return res.render('alumni/register', {
                        error: 'NIM atau email sudah terdaftar',
                        formData: req.body,
                    });
                }

                const currentDate = new Date();
                db.query('INSERT INTO alumni (nim, email, password, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [nim, email, hashedPassword, 'aktif', currentDate, currentDate], (err, result) => {
                    if (err) {
                        console.error('Insert error:', err);
                        return res.render('alumni/register', {
                            error: 'Gagal menyimpan data alumni',
                            formData: req.body,
                        });
                    }
                    res.redirect('/alumni/login');
                });
            });
        });
    },

    // Login
    showLoginForm: (req, res) => {
        res.render('alumni/login', {
            error: null,
            formAlumni: { nim: '' },
        });
    },

    loginAlumni: (req, res) => {
        const { nim, password } = req.body;

        db.query('SELECT * FROM alumni WHERE nim = ? LIMIT 1', [nim], (err, results) => {
            if (err) {
                console.error(err);
                return res.render('alumni/login', {
                    error: 'Terjadi kesalahan sistem.',
                    formAlumni: { nim },
                });
            }

            if (results.length === 0) {
                return res.render('alumni/login', {
                    error: 'NIM tidak ditemukan.',
                    formAlumni: { nim },
                });
            }

            const alumni = results[0];

            if (alumni.status !== 'aktif') {
                return res.render('alumni/login', {
                    error: 'Akun Anda belum aktif.',
                    formAlumni: { nim },
                });
            }

            bcrypt.compare(password, alumni.password, (compareErr, passwordMatch) => {
                if (compareErr) {
                    console.error(compareErr);
                    return res.render('alumni/login', {
                        error: 'Terjadi kesalahan sistem.',
                        formAlumni: { nim },
                    });
                }

                if (!passwordMatch) {
                    return res.render('alumni/login', {
                        error: 'Password salah.',
                        formAlumni: { nim },
                    });
                }

                req.session.alumni = {
                    id: alumni.id,
                    nim: alumni.nim,
                    email: alumni.email,
                };

                return res.redirect('/alumni/dashboard');
            });
        });
    },

    // Dashboard
    showDashboard: (req, res) => {
        const alumniId = req.session.alumni.id;

        const checkTracerQuery = 'SELECT * FROM tracer_study WHERE alumni_id = ?';
        db.query(checkTracerQuery, [alumniId], (err, tracerResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Terjadi kesalahan sistem');
            }

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
    },

    // Tracer Study
    showTracerStudyForm: (req, res) => {
        const alumniId = req.session.alumni.id;

        const checkQuery = 'SELECT * FROM tracer_study WHERE alumni_id = ?';
        db.query(checkQuery, [alumniId], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Terjadi kesalahan sistem');
            }

            if (results.length > 0) {
                return res.redirect('/alumni/editTracerStudy');
            }

            res.render('alumni/tracerStudy', {
                alumni: req.session.alumni,
                title: 'Tracer Study',
            });
        });
    },

    submitTracerStudy: (req, res) => {
        const alumniId = req.session.alumni.id;
        const { status_kerja, nama_perusahaan, posisi, lama_tunggu_kerja, sesuai_bidang, gaji_range, kepuasan_kerja, saran_kampus } = req.body;

        if (!status_kerja) {
            return res.status(400).json({
                success: false,
                message: 'Status kerja harus dipilih',
            });
        }

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
    },

    showEditTracerStudy: (req, res) => {
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
    },

    updateTracerStudy: (req, res) => {
        const alumniId = req.session.alumni.id;
        const { status_kerja, nama_perusahaan, posisi, lama_tunggu_kerja, sesuai_bidang, gaji_range, kepuasan_kerja, saran_kampus } = req.body;

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
    },

    // Upload Postingan
    showUploadPostinganForm: (req, res) => {
        res.render('alumni/upload-postingan', { 
            error: null,
            alumni: req.session.alumni
        });
    },

    submitUploadPostingan: (req, res) => {
        // Proses simpan postingan di sini
        // Untuk sementara redirect ke dashboard
        res.redirect('/alumni/dashboard');
    },

    // Logout
    logoutAlumni: (req, res) => {
        req.session.destroy(() => {
            res.redirect('/alumni/login');
        });
    },
};

module.exports = alumniController;
