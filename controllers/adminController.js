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

// Tampilkan semua pesan dari alumni
exports.showInbox = function (req, res) {
    const query = `
        SELECT 
            cm.id,
            cm.pesan,
            cm.status,
            cm.tanggal_kirim,
            cm.tanggal_dibalas,
            cm.balasan,
            cm.dibalas_oleh,
            ap.nama_lengkap AS alumni_nama,
            a.email AS alumni_email
        FROM contact_messages cm
        JOIN alumni a ON cm.alumni_id = a.id
        JOIN alumni_profiles ap ON a.id = ap.alumni_id
        ORDER BY cm.tanggal_kirim DESC
    `;

    db.query(query, (err, messages) => {
        if (err) {
            console.error('Error fetching messages:', err);
            req.flash('error_msg', 'Gagal memuat pesan');
            return res.redirect('/admin/dashboard');
        }

        res.render('admin/inbox', {
            title: 'Kotak Masuk',
            messages,
            admin: req.session.admin,
        });
    });
};

// Tampilkan detail pesan dan form balas
exports.showMessageDetail = function (req, res) {
    const messageId = req.params.id;

    const query = `
        SELECT 
            cm.*,
            ap.nama_lengkap AS alumni_nama,
            a.email AS alumni_email
        FROM contact_messages cm
        JOIN alumni a ON cm.alumni_id = a.id
        JOIN alumni_profiles ap ON a.id = ap.alumni_id
        WHERE cm.id = ?
    `;

    db.query(query, [messageId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Error fetching message:', err);
            req.flash('error_msg', 'Pesan tidak ditemukan');
            return res.redirect('/admin/inbox');
        }

        res.render('admin/detailPesan', {
            title: 'Detail Pesan',
            message: results[0],
            admin: req.session.admin,
        });
    });
};

// Proses balas pesan
exports.replyMessage = function (req, res) {
    const messageId = req.params.id;
    const { balasan } = req.body;
    const adminId = req.session.admin.id;

    const updateQuery = `
        UPDATE contact_messages 
        SET 
            balasan = ?,
            dibalas_oleh = ?,
            status = 'dibalas',
            tanggal_dibalas = NOW()
        WHERE id = ?
    `;

    db.query(updateQuery, [balasan, adminId, messageId], (err, result) => {
        if (err) {
            console.error('Error replying message:', err);
            req.flash('error_msg', 'Gagal mengirim balasan');
            return res.redirect(`/admin/pesan/${messageId}`);
        }

        req.flash('success_msg', 'Balasan berhasil dikirim!');
        res.redirect(`/admin/pesan/${messageId}`);
    });
};

// Logout
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
};
