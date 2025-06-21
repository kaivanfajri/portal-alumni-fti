const db = require('../config/db');

// Status constants
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'disetujui',
  REJECTED: 'ditolak'
};

// Upload Postingan oleh Alumni
exports.uploadPostingan = (req, res) => {
  const alumniId = req.session.alumni.id;
  const { judul, isi } = req.body;
  let gambar = null;
  
  if (req.file) {
    gambar = req.file.filename;
  }
  
  // Buat slug dari judul
  const slug = judul.toLowerCase()
    .replace(/[^\w\s]/gi, '') // Hapus karakter khusus
    .replace(/\s+/g, '-') // Ganti spasi dengan dash
    .replace(/-+/g, '-'); // Hapus multiple dash
  
  const tanggal_upload = new Date();
  const status = 'diajukan';
  
  const insertQuery = `INSERT INTO artikel (alumni_id, judul, slug, isi, gambar, status, tanggal_upload, updated_at) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.query(insertQuery, 
    [alumniId, judul, slug, isi, gambar, status, tanggal_upload, tanggal_upload], 
    (err, result) => {
      if (err) {
        console.error('Gagal menyimpan artikel:', err);
        return res.render('alumni/upload-postingan', {
          error: 'Gagal menyimpan postingan: ' + err.message,
          alumni: req.session.alumni
        });
      }
      res.redirect('/alumni/dashboard');
  });
};

// Daftar Artikel yang Disetujui
exports.daftarArtikel = (req, res) => {
  db.query(
    `SELECT a.*, al.nama as alumni_nama 
     FROM artikel a
     JOIN alumni al ON a.alumni_id = al.id
     WHERE a.status = "disetujui" 
     ORDER BY a.id DESC`,
    (err, rows) => {
      if (err) {
        console.error('Gagal mengambil data artikel:', err);
        return res.render('alumni/list-postingan', {
          artikel: [],
          error: 'Gagal mengambil data artikel: ' + err.message,
          alumni: req.session.alumni
        });
      }
      res.render('alumni/list-postingan', {
        artikel: rows || [],
        error: null,
        alumni: req.session.alumni
      });
    }
  );
};

// Detail Artikel
exports.detailArtikel = (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT a.*, al.nama as alumni_nama 
     FROM artikel a
     JOIN alumni al ON a.alumni_id = al.id
     WHERE a.id = ?`, 
    [id], 
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.status(404).render('alumni/detail-artikel', {
          artikel: null,
          error: 'Artikel tidak ditemukan',
          alumni: req.session.alumni
        });
      }
      res.render('alumni/detail-artikel', {
        artikel: rows[0],
        error: null,
        alumni: req.session.alumni
      });
    }
  );
};

exports.showKelolaPostingan = (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM artikel';
  const param = [];

  if (status && ['pending', 'disetujui', 'ditolak'].includes(status)) {
    sql += ' WHERE status = ?';
    param.push(status);
  }

  sql += ' ORDER BY tanggal_upload DESC';

  db.query(sql, param, (err, results) => {
    if (err) {
      console.error('Error fetching artikel:', err);
      return res.status(500).render('error', {
        message: 'Gagal mengambil data artikel',
        error: err,
      });
    }

    res.render('admin/kelola-postingan', {
      postingan: results,
      filter: status || 'all',
    });
  });
};

exports.setujuiPostingan = (req, res) => {
  console.log('Session admin saat setujui:', req.session.admin); // Log session admin
  const { id } = req.params;
  let reviewer = null;
  if (req.session && req.session.admin && req.session.admin.id) {
    reviewer = req.session.admin.id;
  }
  db.query(
    'UPDATE artikel SET status = ?, reviewed_by = ?, updated_at = NOW() WHERE id = ?',
    [STATUS.APPROVED, reviewer, id],
    (err) => {
      if (err) {
        console.error(err);
        return res.redirect('/admin/kelola-postingan?error=true');
      }
      res.redirect('/admin/kelola-postingan');
    }
  );
};

exports.tolakPostingan = (req, res) => {
  console.log('Session admin saat tolak:', req.session.admin); // Log session admin
  const { id } = req.params;
  let reviewer = null;
  if (req.session && req.session.admin && req.session.admin.id) {
    reviewer = req.session.admin.id;
  }
  db.query(
    'UPDATE artikel SET status = ?, reviewed_by = ?, updated_at = NOW() WHERE id = ?',
    [STATUS.REJECTED, reviewer, id],
    (err) => {
      if (err) {
        console.error(err);
        return res.redirect('/admin/kelola-postingan?error=true');
      }
      res.redirect('/admin/kelola-postingan');
    }
  );
};

exports.hapusPostingan = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM artikel WHERE id = ?', [id], (err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/admin/kelola-postingan');
  });
};

exports.daftarArtikel = (req, res) => {
  db.query(
    'SELECT * FROM artikel WHERE status = "disetujui" ORDER BY id DESC',
    (err, rows) => {
      res.render('alumni/daftar-artikel', {
        artikel: rows || [],
        error: err ? 'Gagal mengambil data.' : null
      });
    }
  );
};