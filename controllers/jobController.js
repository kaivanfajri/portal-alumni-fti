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
            return res.render('alumni/upload-job', { error: 'Gagal mengambil data kategori.' });
        }
        res.render('alumni/upload-job', { categories, error: null });
    });
};

// Proses submit upload job
exports.submitUploadJob = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            return res.render('alumni/upload-job', { error: 'Terjadi kesalahan saat mengupload file.' });
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
            return res.render('alumni/upload-job', { error: 'Semua field wajib diisi.' });
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
                return res.render('alumni/upload-job', { error: 'Gagal menyimpan data lowongan.' });
            }
            res.render('alumni/upload-job', { success: true });
        });
    });
};

// List semua job yang sudah diapprove (untuk alumni)
exports.listJob = (req, res) => {
    const query = 'SELECT * FROM lowongan_kerja WHERE status_moderasi = "disetujui" ORDER BY created_at DESC';
    db.query(query, (err, lowongan_kerja) => {
        if (err) {
            console.error('Error fetch jobs:', err);
            return res.render('error', { message: 'Gagal mengambil data lowongan.' });
        }
        res.render('alumni/list-job', { lowongan_kerja });
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
        res.render('alumni/detail-job', { job });
    });
};

// Tampilkan semua job untuk moderasi admin
exports.showModerasiJobPosting = (req, res) => {
    const query = 'SELECT * FROM lowongan_kerja WHERE status_moderasi = "pending" ORDER BY created_at DESC';
    db.query(query, (err, jobs) => {
        if (err) {
            console.error('Error fetch jobs:', err);
            return res.render('error', { message: 'Gagal mengambil data lowongan.' });
        }
        res.render('admin/moderasi-job-posting', { jobs });
    });
};

// Approve job posting
exports.approveJob = (req, res) => {
    const jobId = req.params.id;
    const query = 'UPDATE lowongan_kerja SET status_moderasi = "disetujui" WHERE id = ?';
    db.query(query, [jobId], (err) => {
        if (err) {
            console.error('Error approve job:', err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
};

// Reject job posting dan hapus dari database
exports.rejectJob = (req, res) => {
    const jobId = req.params.id;
    const query = 'DELETE FROM lowongan_kerja WHERE id = ?';
    db.query(query, [jobId], (err) => {
        if (err) {
            console.error('Error reject (delete) job:', err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
};
