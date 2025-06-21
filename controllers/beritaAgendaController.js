const db = require('../config/db');
const path = require('path');
const fs = require('fs');

const beritaAgendaController = {
    tampilkanDaftar: (req, res) => {
        const query = 'SELECT * FROM berita_agenda ORDER BY tanggal_dibuat DESC';
        db.query(query, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Terjadi kesalahan server');
            }

            res.render('admin/kelolaBeritaAgenda', {
                beritaAgenda: results,
                admin: req.session.admin,
                messages: req.flash(),
            });
        });
    },

    tampilkanFormTambah: (req, res) => {
        res.render('admin/tambahBeritaAgenda', {
            admin: req.session.admin,
            messages: req.flash(),
        });
    },

    tambahData: (req, res) => {
        // Pastikan file terupload dengan benar
        if (!req.file) {
            console.log('No file uploaded');
        } else {
            console.log('File uploaded:', req.file);
        }

        const { judul, isi, jenis, tanggal_acara, lokasi } = req.body;
        const cover_gambar = req.file ? req.file.filename : null;
        const dibuat_oleh = req.session.admin.id;

        // Validasi data
        if (!judul || !isi || !jenis || !tanggal_acara) {
            // Hapus file yang sudah diupload jika validasi gagal
            if (req.file) {
                fs.unlinkSync(path.join(__dirname, '../public/uploads', req.file.filename));
            }
            req.flash('error', 'Harap isi semua field wajib');
            return res.redirect('/admin/kelolaBeritaAgenda/tambah');
        }

        const query = `
            INSERT INTO berita_agenda 
            (judul, isi, jenis, cover_gambar, tanggal_dibuat, tanggal_acara, lokasi, dibuat_oleh)
            VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)
        `;

        db.query(query, [judul, isi, jenis, cover_gambar, tanggal_acara, lokasi, dibuat_oleh], (err) => {
            if (err) {
                console.error(err);
                // Hapus file jika query gagal
                if (req.file) {
                    fs.unlinkSync(path.join(__dirname, '../public/uploads', req.file.filename));
                }
                req.flash('error', 'Gagal menambahkan data');
                return res.redirect('/admin/kelolaBeritaAgenda/tambah');
            }

            req.flash('success', 'Data berhasil ditambahkan');
            res.redirect('/admin/kelolaBeritaAgenda');
        });
    },

    tampilkanFormEdit: (req, res) => {
        const { id } = req.params;
        const query = 'SELECT * FROM berita_agenda WHERE id = ?';

        db.query(query, [id], (err, results) => {
            if (err) {
                console.error(err);
                req.flash('error', 'Terjadi kesalahan server');
                return res.redirect('/admin/kelolaBeritaAgenda');
            }

            if (results.length === 0) {
                req.flash('error', 'Data tidak ditemukan');
                return res.redirect('/admin/kelolaBeritaAgenda');
            }

            res.render('admin/editBeritaAgenda', {
                data: results[0],
                admin: req.session.admin,
                messages: req.flash(),
            });
        });
    },

    editData: (req, res) => {
        const { id } = req.params;
        const { judul, isi, jenis, tanggal_acara, lokasi, gambar_lama } = req.body;

        let cover_gambar = gambar_lama;
        let oldImagePath = '';

        // Jika ada file baru diupload
        if (req.file) {
            // Simpan path gambar lama untuk dihapus nanti
            if (gambar_lama) {
                oldImagePath = path.join(__dirname, '../public/uploads', gambar_lama);
            }
            cover_gambar = req.file.filename;
        }

        const query = `
            UPDATE berita_agenda 
            SET judul = ?, isi = ?, jenis = ?, cover_gambar = ?, 
                tanggal_acara = ?, lokasi = ?, updated_at = NOW()
            WHERE id = ?
        `;

        db.query(query, [judul, isi, jenis, cover_gambar, tanggal_acara, lokasi, id], (err) => {
            if (err) {
                console.error(err);
                // Hapus file baru jika query gagal
                if (req.file) {
                    fs.unlinkSync(path.join(__dirname, '../public/uploads', req.file.filename));
                }
                req.flash('error', 'Gagal memperbarui data');
                return res.redirect(`/admin/kelolaBeritaAgenda/edit/${id}`);
            }

            // Hapus gambar lama setelah update berhasil
            if (req.file && oldImagePath && fs.existsSync(oldImagePath)) {
                fs.unlink(oldImagePath, (err) => {
                    if (err) console.error('Gagal menghapus gambar lama:', err);
                });
            }

            req.flash('success', 'Data berhasil diperbarui');
            res.redirect('/admin/kelolaBeritaAgenda');
        });
    },

    hapusData: (req, res) => {
        const { id } = req.params;

        // Pertama dapatkan nama file gambar untuk dihapus
        db.query('SELECT cover_gambar FROM berita_agenda WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error(err);
                req.flash('error', 'Gagal menghapus data');
                return res.redirect('/admin/kelolaBeritaAgenda');
            }

            if (results.length > 0 && results[0].cover_gambar) {
                // Hapus file gambar dari sistem penyimpanan
                // Implementasi tergantung bagaimana Anda menyimpan file
            }

            // Hapus data dari database
            db.query('DELETE FROM berita_agenda WHERE id = ?', [id], (err) => {
                if (err) {
                    console.error(err);
                    req.flash('error', 'Gagal menghapus data');
                    return res.redirect('/admin/kelolaBeritaAgenda');
                }

                req.flash('success', 'Data berhasil dihapus');
                res.redirect('/admin/kelolaBeritaAgenda');
            });
        });
    },
};

module.exports = beritaAgendaController;
