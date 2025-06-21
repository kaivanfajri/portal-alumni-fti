const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// Setup multer untuk upload gambar
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Tentukan folder tempat menyimpan file gambar
        cb(null, path.join(__dirname, '../public/uploads/')); // Sesuaikan path ke folder uploads
    },
    filename: (req, file, cb) => {
        // Simpan gambar dengan nama file yang unik menggunakan timestamp dan ekstensi asli
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage }).single('jobImage');

// Tampilkan form upload job dengan kategori dari database
exports.showUploadJobForm = (req, res) => {
    const query = 'SELECT * FROM kategori_lowongan';
    db.query(query, (err, categories) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.render('alumni/upload-job', { error: 'Gagal mengambil data kategori.', alumni: req.session.alumni });
        }
        res.render('alumni/upload-job', { categories, error: null, alumni: req.session.alumni });
    });
};

// Proses submit upload job
exports.submitUploadJob = (req, res) => {
    upload(req, res, (err) => {
        // Helper untuk render dengan kategori
        const renderWithCategories = (params) => {
            db.query('SELECT * FROM kategori_lowongan', (err2, categories) => {
                res.render('alumni/upload-job', { ...params, categories, alumni: req.session.alumni });
            });
        };

        if (err) {
            console.error('Error uploading file:', err);
            return renderWithCategories({ error: 'Terjadi kesalahan saat mengupload file.' });
        }

        const { jobTitle, jobDescription, jobCategory } = req.body;
        const alumniId = req.session.alumni ? req.session.alumni.id : null;
        let jobImage = null;

        // Jika file gambar di-upload, simpan nama file
        if (req.file) {
            jobImage = req.file.filename;
        }

        // Validasi input
        if (!jobTitle || !jobDescription || !jobCategory) {
            return renderWithCategories({ error: 'Semua field wajib diisi.' });
        }

        // Query untuk menyimpan lowongan pekerjaan ke dalam tabel lowongan_kerja
        const query = `
            INSERT INTO lowongan_kerja (alumni_id, judul_lowongan, kategori_id, deskripsi, gambar, status_moderasi, catatan_admin, tanggal_review, reviewed_by, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL, NOW(), NOW())
        `;

        // Memasukkan data ke dalam query
        const values = [alumniId, jobTitle, jobCategory, jobDescription, jobImage];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Error insert job:', err);
                return renderWithCategories({ error: 'Gagal menyimpan data lowongan.' });
            }
            renderWithCategories({ success: true, error: null });
        });
    });
};

// List semua job yang sudah diapprove (untuk alumni)
exports.listJob = (req, res) => {
    const alumniId = req.session.alumni ? req.session.alumni.id : null;
    if (!alumniId) {
        return res.redirect('/alumni/login');
    }
    const query = `SELECT l.*, k.nama_kategori FROM lowongan_kerja l LEFT JOIN kategori_lowongan k ON l.kategori_id = k.id WHERE l.alumni_id = ? ORDER BY l.created_at DESC`;
    db.query(query, [alumniId], (err, jobs) => {
        if (err) {
            console.error('Error fetch jobs:', err);
            return res.render('error', { message: 'Gagal mengambil data lowongan.' });
        }
        res.render('alumni/list-job', { jobs, alumni: req.session.alumni });
    });
};

// Detail job
exports.detailJob = (req, res) => {
    const jobId = req.params.id;
    const query = 'SELECT * FROM lowongan_kerja WHERE id = ?';
    db.query(query, [jobId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Error fetch job detail:', err);
            return res.render('error', { message: 'Lowongan tidak ditemukan.' });
        }
        const job = results[0];
        res.render('alumni/detail-job', { job, alumni: req.session.alumni });
    });
};

// Tampilkan semua job untuk moderasi admin
exports.showModerasiJobPosting = (req, res) => {
    const query = 'SELECT lowongan_kerja.*, kategori_lowongan.nama_kategori FROM lowongan_kerja INNER JOIN kategori_lowongan ON lowongan_kerja.kategori_id = kategori_lowongan.id WHERE lowongan_kerja.status_moderasi = "pending" ORDER BY lowongan_kerja.created_at DESC';
    db.query(query, (err, jobs) => {
        if (err) {
            console.error('Error fetching jobs:', err);
            return res.render('error', { message: 'Gagal mengambil data lowongan.' });
        }
        res.render('admin/moderasi-job-posting', { jobs });
    });
};

// Approve job posting
exports.approveJob = (req, res) => {
    const jobId = req.params.id;
    const query = 'UPDATE lowongan_kerja SET status_moderasi = "disetujui", tanggal_review = NOW(), reviewed_by = ? WHERE id = ?';
    db.query(query, [req.session.admin.id, jobId], (err) => {
        if (err) {
            console.error('Error approving job:', err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
};


// Reject job posting dan hapus dari database
exports.rejectJob = (req, res) => {
    const jobId = req.params.id;
    const query = 'UPDATE lowongan_kerja SET status_moderasi = "ditolak", tanggal_review = NOW(), reviewed_by = ? WHERE id = ?';
    db.query(query, [req.session.admin.id, jobId], (err) => {
        if (err) {
            console.error('Error rejecting job:', err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
};

// Menampilkan daftar job yang disetujui oleh admin (untuk publik)
exports.listApprovedJobs = (req, res) => {
    const query = `
        SELECT lowongan_kerja.*, kategori_lowongan.nama_kategori
        FROM lowongan_kerja
        INNER JOIN kategori_lowongan ON lowongan_kerja.kategori_id = kategori_lowongan.id
        WHERE lowongan_kerja.status_moderasi = "disetujui"
        ORDER BY lowongan_kerja.created_at DESC
    `;
    db.query(query, (err, jobs) => {
        if (err) {
            console.error('Error fetching approved jobs:', err);
            return res.render('error', { message: 'Gagal mengambil data lowongan.' });
        }
        res.render('public/list-approved-jobs', { jobs });
    });
};

// List lowongan kerja yang disetujui
exports.listJobDisetujui = (req, res) => {
    const query = 'SELECT l.*, k.nama_kategori FROM lowongan_kerja l LEFT JOIN kategori_lowongan k ON l.kategori_id = k.id WHERE l.status_moderasi = "disetujui" ORDER BY l.created_at DESC';
    db.query(query, (err, jobs) => {
        if (err) {
            console.error('Error fetch jobs:', err);
            return res.render('error', { message: 'Gagal mengambil data lowongan.' });
        }
        res.render('alumni/list-jobDisetujui', { jobs });
    });
};

// Menampilkan daftar job yang di-upload oleh alumni yang sedang login
exports.listUploadedJobs = (req, res) => {
    const alumniId = req.session.alumni ? req.session.alumni.id : null;
    if (!alumniId) {
        return res.redirect('/alumni/login');
    }

    const query = `
        SELECT lowongan_kerja.*, kategori_lowongan.nama_kategori 
        FROM lowongan_kerja
        INNER JOIN kategori_lowongan ON lowongan_kerja.kategori_id = kategori_lowongan.id 
        WHERE lowongan_kerja.alumni_id = ? 
        ORDER BY lowongan_kerja.created_at DESC
    `;
    db.query(query, [alumniId], (err, jobs) => {
        if (err) {
            console.error('Error fetching uploaded jobs:', err);
            return res.render('error', { message: 'Gagal mengambil data lowongan.' });
        }
        res.render('alumni/list-uploaded-jobs', { jobs });
    });
};
