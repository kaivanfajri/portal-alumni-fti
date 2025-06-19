const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Tampilkan halaman login
exports.showLoginForm = (req, res) => {
    res.render('admin/login', { error: null });
};

// Proses login admin
exports.login = (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM admins WHERE username = ? AND status = "aktif" LIMIT 1';

    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Query error:', err);
            return res.render('admin/login', { error: 'Terjadi kesalahan sistem' });
        }

        if (results.length === 0) {
            return res.render('admin/login', { error: 'Username tidak ditemukan atau nonaktif' });
        }

        const admin = results[0];

        // Bandingkan password
        bcrypt.compare(password, admin.password, (err, isMatch) => {
            if (err) {
                return res.render('admin/login', { error: 'Terjadi kesalahan' });
            }

            if (!isMatch) {
                return res.render('admin/login', { error: 'Password salah' });
            }

            // Simpan data ke session
            req.session.admin = {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                nama: admin.nama_lengkap,
            };

            return res.redirect('/admin/dashboard');
        });
    });
};

// Middleware untuk proteksi halaman
exports.ensureAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        return next();
    } else {
        return res.redirect('/admin/login');
    }
};

// Tampilkan dashboard admin
exports.dashboard = (req, res) => {
    res.render('admin/dashboard', { admin: req.session.admin });
};

// Menampilkan halaman kelola data alumni
exports.showKelolaDataAlumni = (req, res) => {
    const query = `
        SELECT 
            alumni.id AS alumni_id,
            alumni.nim,
            alumni.email,
            alumni.status,
            alumni_profiles.*
        FROM alumni
        INNER JOIN alumni_profiles ON alumni_profiles.alumni_id = alumni.id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Gagal mengambil data alumni:', err);
            return res.render('admin/kelolaDataAlumni', {
                title: 'Kelola Data Alumni',
                alumniProfiles: [],
                error: 'Gagal mengambil data alumni',
            });
        }

        const alumniProfiles = results.map((row) => ({
            alumni: {
                id: row.alumni_id,
                nim: row.nim,
                email: row.email,
                status: row.status,
            },
            nama_lengkap: row.nama_lengkap,
            program_studi: row.program_studi,
            tahun_masuk: row.tahun_masuk,
            tahun_lulus: row.tahun_lulus,
            pekerjaan_sekarang: row.pekerjaan_sekarang,
            nama_perusahaan: row.nama_perusahaan,
            foto_profil: row.foto_profil,
        }));

        res.render('admin/kelolaDataAlumni', {
            title: 'Kelola Data Alumni',
            alumniProfiles,
        });
    });
};

// Logout
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
};
