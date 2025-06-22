const db = require('../config/db');
const ExcelJS = require('exceljs');

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
exports.detailKonten = (req, res) => {
  const artikelId = req.params.id;
  const sql = 'SELECT * FROM artikel WHERE id = ? AND status = "disetujui"';

  db.query(sql, [artikelId], (err, results) => {
    if (err) {
      return res.status(500).send('Terjadi kesalahan server');
    }

    if (results.length === 0) {
      return res.status(404).send('Artikel tidak ditemukan atau belum disetujui');
    }

    const konten = results[0];
    const tanggal = new Date(konten.tanggal_upload).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // ✅ Tambahkan alumni ke dalam res.render
    res.render('alumni/detail-konten', {
      konten,
      tanggal,
      alumni: req.session.alumni  // ← ini kunci agar navbar tidak error
    });
  });
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

// Setujui Postingan
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
      res.redirect('/admin/kelola-postingan?success=Postingan+berhasil+disetujui');
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
     res.render('alumni/list-postingan', {
  artikel: rows || [],
  error: err ? 'Gagal mengambil data.' : null,
  alumni: req.session.alumni
});
    }
  );
};

// RIWAYAT POSTINGAN UNTUK ADMIN
// Render halaman riwayat postingan (GET request untuk tampilan HTML)
exports.riwayatPostingan = (req, res) => {
  const query = `
  SELECT a.id, a.judul, a.status
  FROM artikel a
  WHERE a.status IN ('disetujui', 'ditolak')

  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching posting history:', err.sqlMessage); // ← DEBUG
      return res.status(500).render('admin/riwayat-postingan', {
        riwayat: [],
        error: 'Gagal mengambil data riwayat postingan',
        title: 'Riwayat Postingan',
        admin: req.session.admin
      });
    }

    res.render('admin/riwayat-postingan', {
      riwayat: results,
      success: req.query.success || null,
      error: null,
      title: 'Riwayat Postingan',
      admin: req.session.admin
    });
  });
};


exports.exportRiwayatExcel = async (req, res) => {
const query = `
    SELECT
        a.id,
        a.judul,
        a.isi,
        a.slug,
        a.gambar,
        COALESCE(adm.nama_lengkap, 'System')   AS reviewer,
        a.status,
        DATE_FORMAT(a.tanggal_upload, '%Y-%m-%d') AS tanggal_upload
    FROM artikel a
    JOIN alumni  al  ON a.alumni_id   = al.id
    LEFT JOIN admins adm ON a.reviewed_by = adm.id
    WHERE a.status IN ('disetujui', 'ditolak')
    ORDER BY a.tanggal_upload DESC
`;

  db.query(query, async (err, results) => {
    if (err) {
      console.error('[❌ SQL ERROR exportRiwayatExcel]:', err.sqlMessage || err.message);
      return res.redirect('/admin/riwayat-postingan?error=Gagal+export+Excel');
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Riwayat Postingan');

      // Atur header kolom
      worksheet.columns = [
        { header: 'ID',        key: 'id',        width: 6 },
        { header: 'Judul',     key: 'judul',     width: 40 },
        { header: 'Isi',       key: 'isi',       width: 60 },
        { header: 'Penulis',   key: 'penulis',   width: 25 },
        { header: 'Reviewer',  key: 'reviewer',  width: 25 },
        { header: 'Status',    key: 'status',    width: 12 },
        { header: 'Tanggal',   key: 'tanggal',   width: 15 },
      ];

      // Tambahkan data
      results.forEach(row => {
        worksheet.addRow(row);
      });

      // Set header response
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="riwayat_postingan.xlsx"'
      );

      // Kirim file Excel
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('[❌ EXCELJS ERROR]:', error.message);
      return res.redirect('/admin/riwayat-postingan?error=Gagal+buat+Excel');
    }
  });
};
