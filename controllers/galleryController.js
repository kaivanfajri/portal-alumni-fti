const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup multer untuk upload gambar galeri
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/'));
    },
    filename: (req, file, cb) => {
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
}).array('photos', 10); // Maksimal 10 foto sekaligus

exports.ShowKelolagaleri = (req, res) => {
    const query = `
        SELECT ga.*, ad.nama_lengkap as dibuat_oleh_nama,
        (SELECT COUNT(*) FROM galeri_foto gf WHERE gf.album_id = ga.id) as jumlah_foto
        FROM galeri_album ga
        JOIN admins ad ON ga.dibuat_oleh = ad.id
        ORDER BY ga.tanggal_dibuat DESC
    `;
    
    db.query(query, (err, albums) => {
        if (err) {
            console.error('Error fetch albums:', err);
            return res.render('error', { message: 'Gagal mengambil data album.' });
        }
        
        res.render('admin/kelola-galeri', {
            title: 'Kelola Galeri',
            user: req.user,
            albums: albums // Kirim data albums ke view
        });
    });
};
// Tampilkan form tambah album
exports.showAddAlbumForm = (req, res) => {
    res.render('admin/add-album', { error: null });
};

// Proses tambah album
exports.addAlbum = (req, res) => {
    const { judul, deskripsi, tanggal_kegiatan, status } = req.body;
    const adminId = req.session.admin ? req.session.admin.id : null;

    // Validasi input
    if (!judul) {
        return res.render('admin/add-album', { error: 'Judul album wajib diisi.' });
    }

    const query = `
        INSERT INTO galeri_album (judul, deskripsi, tanggal_kegiatan, dibuat_oleh, status, tanggal_dibuat) 
        VALUES (?, ?, ?, ?, ?, NOW())
    `;

    const values = [judul, deskripsi || null, tanggal_kegiatan || null, adminId, status || 'aktif'];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error insert album:', err);
            return res.render('admin/add-album', { error: 'Gagal menyimpan album.' });
        }
        res.redirect('/admin/gallery/albums');
    });
};

// Tampilkan form edit album
exports.showEditAlbumForm = (req, res) => {
    const albumId = req.params.id;
    const query = 'SELECT * FROM galeri_album WHERE id = ?';
    
    db.query(query, [albumId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Error fetch album:', err);
            return res.render('error', { message: 'Album tidak ditemukan.' });
        }
        
        const album = results[0];
        res.render('admin/edit-album', { album, error: null });
    });
};

// Proses update album
exports.updateAlbum = (req, res) => {
    const albumId = req.params.id;
    const { judul, deskripsi, tanggal_kegiatan, status } = req.body;

    // Validasi input
    if (!judul) {
        return db.query('SELECT * FROM galeri_album WHERE id = ?', [albumId], (err, results) => {
            const album = results[0];
            res.render('admin/edit-album', { album, error: 'Judul album wajib diisi.' });
        });
    }

    const query = `
        UPDATE galeri_album
        SET judul = ?, deskripsi = ?, tanggal_kegiatan = ?, status = ?
        WHERE id = ?
    `;

    const values = [judul, deskripsi || null, tanggal_kegiatan || null, status || 'aktif', albumId];

    db.query(query, values, (err) => {
        if (err) {
            console.error('Error update album:', err);
            return db.query('SELECT * FROM galeri_album WHERE id = ?', [albumId], (err2, results) => {
                const album = results[0];
                res.render('admin/edit-album', { album, error: 'Gagal mengupdate album.' });
            });
        }
        res.redirect('/admin/gallery/albums');
    });
};

// Hapus album dan semua foto di dalamnya + reset ID
exports.deleteAlbum = (req, res) => {
    const albumId = req.params.id;
    const connection = db; // Gunakan koneksi yang sama

    // Mulai transaction
    connection.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ success: false });
        }

        // 1. Ambil semua foto dalam album
        const getPhotosQuery = 'SELECT file_path FROM galeri_foto WHERE album_id = ?';
        
        connection.query(getPhotosQuery, [albumId], (err, photos) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error fetch photos:', err);
                    res.status(500).json({ success: false });
                });
            }

            // 2. Hapus file fisik
            const deletePromises = photos.map(photo => {
                return new Promise((resolve) => {
                    const filePath = path.join(__dirname, '../public', photo.file_path);
                    if (fs.existsSync(filePath)) {
                        fs.unlink(filePath, (err) => {
                            if (err) console.error('Error deleting file:', err);
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });

            // 3. Hapus record database
            Promise.all(deletePromises)
                .then(() => {
                    // Hapus album (CASCADE akan menghapus foto di database)
                    const deleteAlbumQuery = 'DELETE FROM galeri_album WHERE id = ?';
                    connection.query(deleteAlbumQuery, [albumId], (err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error('Error deleting album:', err);
                                res.status(500).json({ success: false });
                            });
                        }

                        // 4. Reset auto increment dan reorder ID
                        const resetQueries = [
                            'SET @count = 0',
                            'UPDATE galeri_album SET id = @count:= @count + 1 ORDER BY id',
                            'ALTER TABLE galeri_album AUTO_INCREMENT = 1'
                        ];

                        // Eksekusi sequential
                        const executeReset = (index) => {
                            if (index >= resetQueries.length) {
                                connection.commit(err => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            console.error('Error committing transaction:', err);
                                            res.status(500).json({ success: false });
                                        });
                                    }
                                    res.json({ success: true });
                                });
                                return;
                            }

                            connection.query(resetQueries[index], (err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        console.error('Error resetting IDs:', err);
                                        res.status(500).json({ success: false });
                                    });
                                }
                                executeReset(index + 1);
                            });
                        };

                        executeReset(0);
                    });
                })
                .catch(err => {
                    connection.rollback(() => {
                        console.error('Error deleting files:', err);
                        res.status(500).json({ success: false });
                    });
                });
        });
    });
};

// FOTO CRUD OPERATIONS

// Tampilkan detail album dengan foto-foto
exports.viewAlbumDetail = (req, res) => {
    const albumId = req.params.id;
    
    // Get album info
    const albumQuery = 'SELECT * FROM galeri_album WHERE id = ?';
    // Get photos in album
    const photosQuery = 'SELECT * FROM galeri_foto WHERE album_id = ? ORDER BY tanggal_dibuat DESC';
    
    db.query(albumQuery, [albumId], (err, albumResults) => {
        if (err || albumResults.length === 0) {
            console.error('Error fetch album:', err);
            return res.render('error', { message: 'Album tidak ditemukan.' });
        }
        
        const album = albumResults[0];
        
        db.query(photosQuery, [albumId], (err, photos) => {
            if (err) {
                console.error('Error fetch photos:', err);
                return res.render('error', { message: 'Gagal mengambil data foto.' });
            }
            
            res.render('admin/album-detail', { album, photos });
        });
    });
};

exports.showUploadPhotoForm = async (req, res) => {
    try {
        const albumId = req.params.id;
        
        // 1. Dapatkan data album
        const [albumResults] = await db.promise().query(
            'SELECT * FROM galeri_album WHERE id = ?', 
            [albumId]
        );
        
        if (!albumResults || albumResults.length === 0) {
            return res.render('error', { message: 'Album tidak ditemukan.' });
        }
        
        const album = albumResults[0];
        
        // 2. Dapatkan foto-foto dalam album
        const [photos] = await db.promise().query(
            'SELECT * FROM galeri_foto WHERE album_id = ? ORDER BY tanggal_dibuat DESC', 
            [albumId]
        );
        
        // 3. Render view dengan data yang lengkap
        res.render('admin/upload-photo', {
            title: 'Upload Foto',
            album,
            photos: photos || [], // Pastikan selalu berupa array
            user: req.user
        });
        
    } catch (err) {
        console.error('Error in showUploadPhotoForm:', err);
        res.render('error', { 
            message: 'Terjadi kesalahan saat memuat halaman upload foto.' 
        });
    }
};

// Proses upload foto ke album
exports.uploadPhoto = (req, res) => {
    const albumId = req.params.id;
    
    upload(req, res, (err) => {
        // Helper untuk render dengan album data
        const renderWithAlbum = (params) => {
            db.query('SELECT * FROM galeri_album WHERE id = ?', [albumId], (err2, results) => {
                const album = results[0];
                res.render('admin/upload-photo', { ...params, album });
            });
        };

        if (err) {
            console.error('Error uploading photos:', err);
            return renderWithAlbum({ error: 'Terjadi kesalahan saat mengupload foto.' });
        }

        if (!req.files || req.files.length === 0) {
            return renderWithAlbum({ error: 'Minimal satu foto harus dipilih.' });
        }

        // Insert semua foto yang diupload
        const insertPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const keterangan = req.body.keterangan || '';
                const filePath = `/uploads/${file.filename}`;
                
                const query = `
                    INSERT INTO galeri_foto (album_id, file_path, keterangan, tanggal_dibuat) 
                    VALUES (?, ?, ?, NOW())
                `;
                
                db.query(query, [albumId, filePath, keterangan], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        });

        Promise.all(insertPromises)
            .then(() => {
                res.redirect(`/admin/gallery/albums/${albumId}`);
            })
            .catch(err => {
                console.error('Error insert photos:', err);
                renderWithAlbum({ error: 'Gagal menyimpan foto.' });
            });
    });
};

// Hapus foto dari album
exports.deletePhoto = (req, res) => {
    const photoId = req.params.id;
    
    // Ambil info foto untuk menghapus file
    const getPhotoQuery = 'SELECT file_path FROM galeri_foto WHERE id = ?';
    
    db.query(getPhotoQuery, [photoId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Error fetch photo:', err);
            return res.status(500).json({ success: false });
        }
        
        const photo = results[0];
        const filePath = path.join(__dirname, '../public', photo.file_path);
        
        // Hapus file dari sistem
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Hapus record dari database
        const deleteQuery = 'DELETE FROM galeri_foto WHERE id = ?';
        db.query(deleteQuery, [photoId], (err) => {
            if (err) {
                console.error('Error delete photo:', err);
                return res.status(500).json({ success: false });
            }
            res.json({ success: true });
        });
    });
};

// Update keterangan foto
exports.updatePhotoCaption = (req, res) => {
    const photoId = req.params.id;
    const { keterangan } = req.body;
    
    const query = 'UPDATE galeri_foto SET keterangan = ? WHERE id = ?';
    
    db.query(query, [keterangan || '', photoId], (err) => {
        if (err) {
            console.error('Error update photo caption:', err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
};

// PUBLIC VIEWS (untuk frontend alumni)

// Tampilkan semua album aktif untuk alumni
exports.publicAlbumList = (req, res) => {
    const query = `
        SELECT ga.*,
        (SELECT COUNT(*) FROM galeri_foto gf WHERE gf.album_id = ga.id) as jumlah_foto,
        (SELECT gf.file_path FROM galeri_foto gf WHERE gf.album_id = ga.id ORDER BY gf.tanggal_dibuat ASC LIMIT 1) as cover_foto
        FROM galeri_album ga
        WHERE ga.status = 'aktif'
        ORDER BY ga.tanggal_dibuat DESC
    `;
    
    db.query(query, (err, albums) => {
        if (err) {
            console.error('Error fetch public albums:', err);
            return res.render('error', { message: 'Gagal mengambil data galeri.' });
        }
        res.render('alumni/gallery-list', { albums });
    });
};

// Tampilkan detail album untuk alumni
exports.publicAlbumDetail = (req, res) => {
    const albumId = req.params.id;
    
    // Get album info (hanya yang aktif)
    const albumQuery = 'SELECT * FROM galeri_album WHERE id = ? AND status = "aktif"';
    // Get photos in album
    const photosQuery = 'SELECT * FROM galeri_foto WHERE album_id = ? ORDER BY tanggal_dibuat DESC';
    
    db.query(albumQuery, [albumId], (err, albumResults) => {
        if (err || albumResults.length === 0) {
            console.error('Error fetch public album:', err);
            return res.render('error', { message: 'Album tidak ditemukan.' });
        }
        
        const album = albumResults[0];
        
        db.query(photosQuery, [albumId], (err, photos) => {
            if (err) {
                console.error('Error fetch photos:', err);
                return res.render('error', { message: 'Gagal mengambil data foto.' });
            }
            
            res.render('alumni/gallery-detail', { album, photos });
        });
    });
};