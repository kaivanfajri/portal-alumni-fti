const db = require('../config/db'); // pastikan path sesuai
const multer = require('multer');
const path = require('path');

// Set up multer storage and file handling
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

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diperbolehkan'));
        }
    }
}).single('gambar'); 

const forumDiskusiController = {
    // Tampilkan semua diskusi
    list: (req, res) => {
        const query = `
        SELECT forum_diskusi.*, alumni.nim
        FROM forum_diskusi
        LEFT JOIN alumni ON forum_diskusi.alumni_id = alumni.id
        ORDER BY forum_diskusi.tanggal_dibuat DESC
    `;
        db.query(query, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Gagal mengambil data forum diskusi');
            }
            res.render('admin/forumDiskusi', { forumList: results, admin: req.session.admin });
        });
    },

    // Tampilkan form edit
    showEditForm: (req, res) => {
        const id = req.params.id;
        db.query('SELECT * FROM forum_diskusi WHERE id = ?', [id], (err, results) => {
            if (err || results.length === 0) {
                return res.status(404).send('Data tidak ditemukan');
            }
            res.render('admin/editForumDiskusi', { forum: results[0], admin: req.session.admin });
        });
    },

    // Proses edit
      edit: (req, res) => {
        // First, upload the file before proceeding
        upload(req, res, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Gagal mengupload gambar');
            }

            // Proceed with the rest of the logic after upload is done
            const id = req.params.id;

            // Check if gambar_lama is present and if a new file is uploaded
            let gambar = req.body.gambar_lama || ''; // Keep existing gambar if no new file is uploaded
            if (req.file) {
                gambar = req.file.filename; // Get the uploaded file's name if a new file is uploaded
            }

            const { judul, isi, kategori, status } = req.body;

            const query = `
            UPDATE forum_diskusi SET judul=?, isi=?, gambar=?, kategori=?, status=?, updated_at=NOW()
            WHERE id=?
        `;

            db.query(query, [judul, isi, gambar, kategori, status, id], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Gagal mengedit forum diskusi');
                }
                res.redirect('/admin/forum-diskusi');
            });
        });
    },


    // Hapus
    delete: (req, res) => {
        const id = req.params.id;
        db.query('DELETE FROM forum_diskusi WHERE id = ?', [id], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Gagal menghapus forum diskusi');
            }
            res.redirect('/admin/forum-diskusi');
        });
    }
};

module.exports = forumDiskusiController;