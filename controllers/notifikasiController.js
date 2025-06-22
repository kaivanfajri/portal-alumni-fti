const db = require('../config/db');

class NotifikasiController {
    /**
     * Get all notifications (for admin)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static getAllNotifications(req, res) {
        const page = req.query.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const query = `
            SELECT n.*, a.nama_lengkap AS admin_pengirim
            FROM notifikasi n
            LEFT JOIN admins a ON n.dikirim_oleh = a.id
            ORDER BY n.waktu_kirim DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `SELECT COUNT(*) as total FROM notifikasi`;

        Promise.all([
            new Promise((resolve, reject) => {
                db.query(query, [limit, offset], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(countQuery, (err, results) => {
                    if (err) reject(err);
                    else resolve(results[0].total);
                });
            })
        ])
        .then(([notifications, total]) => {
            const totalPages = Math.ceil(total / limit);
            
            res.render('admin/notifikasi', {
                title: 'Kelola Notifikasi',
                notifications,
                currentPage: parseInt(page),
                totalPages,
                admin: req.session.admin
            });
        })
        .catch(err => {
            console.error('Gagal mengambil data notifikasi:', err);
            req.flash('error', 'Gagal mengambil data notifikasi');
            res.redirect('/admin/dashboard');
        });
    }

    /**
     * Show form to create new notification (for admin)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static showCreateForm(req, res) {
        // Get alumni years for filter
        const namaQuery = `SELECT DISTINCT nama_lengkap FROM alumni_profiles ORDER BY nama_lengkap DESC`;
        const yearQuery = `SELECT DISTINCT tahun_lulus FROM alumni_profiles ORDER BY tahun_lulus DESC`;
        
        db.query(yearQuery, (err, years) => {
            if (err) {
                console.error('Gagal mengambil data tahun lulus:', err);
                req.flash('error', 'Gagal memuat form buat notifikasi');
                return res.redirect('/admin/notifikasi');
            }

            res.render('admin/notifikasiCreate', {
                title: 'Buat Notifikasi Baru',
                years,
                admin: req.session.admin
            });
        });
    }

    /**
     * Get alumni list for notification (for admin)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static getAlumniList(req, res) {
        const query = `
            SELECT a.id, a.nim, ap.nama_lengkap, ap.tahun_lulus
            FROM alumni a
            JOIN alumni_profiles ap ON ap.alumni_id = a.id
            WHERE a.status = 'aktif'
            ORDER BY ap.nama_lengkap ASC
        `;

        db.query(query, (err, results) => {
            if (err) {
                console.error('Gagal mengambil data alumni:', err);
                return res.json({
                    success: false,
                    message: 'Gagal mengambil data alumni'
                });
            }

            res.json({
                success: true,
                alumni: results
            });
        });
    }

    /**
     * Create new notification (for admin)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static createNotification(req, res) {
        const { judul, isi, ditujukan_ke, tahun_lulus, penerima_id } = req.body;
        const dikirim_oleh = req.session.admin.id;

        // Debug: Log data yang diterima
        console.log('Data notifikasi yang diterima:', {
            judul,
            isi,
            ditujukan_ke,
            tahun_lulus,
            penerima_id,
            dikirim_oleh
        });

        // Validate input
        if (!judul || !isi || !ditujukan_ke) {
            req.flash('error', 'Judul, isi dan tujuan harus diisi');
            return res.redirect('/admin/notifikasi/buat');
        }

        // Validate specific requirements
        if (ditujukan_ke === 'tahun_lulus' && !tahun_lulus) {
            req.flash('error', 'Tahun lulus harus dipilih');
            return res.redirect('/admin/notifikasi/buat');
        }

        if (ditujukan_ke === 'spesifik' && !penerima_id) {
            req.flash('error', 'Alumni harus dipilih');
            return res.redirect('/admin/notifikasi/buat');
        }

        // Prepare data for database
        const tahunLulusValue = ditujukan_ke === 'tahun_lulus' ? tahun_lulus : null;
        const penerimaIdValue = ditujukan_ke === 'spesifik' ? penerima_id : null;

        console.log('Data yang akan disimpan ke database:', {
            judul,
            isi,
            ditujukan_ke,
            tahun_lulus: tahunLulusValue,
            penerima_id: penerimaIdValue,
            dikirim_oleh
        });

        const query = `
            INSERT INTO notifikasi
            (judul, isi, ditujukan_ke, tahun_lulus, penerima_id, dikirim_oleh, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'terkirim')
        `;

        db.query(query, 
            [judul, isi, ditujukan_ke, tahunLulusValue, penerimaIdValue, dikirim_oleh],
            (err, result) => {
                if (err) {
                    console.error('Gagal membuat notifikasi:', err);
                    req.flash('error', 'Gagal membuat notifikasi');
                    return res.redirect('/admin/notifikasi/buat');
                }

                console.log('Notifikasi berhasil dibuat dengan ID:', result.insertId);
                const notificationId = result.insertId;

                // Create notification records for recipients
                NotifikasiController.createNotificationRecords(notificationId, ditujukan_ke, tahunLulusValue, penerimaIdValue)
                    .then(() => {
                        req.flash('success', 'Notifikasi berhasil dibuat dan dikirim');
                        res.redirect('/admin/notifikasi');
                    })
                    .catch(err => {
                        console.error('Gagal membuat record notifikasi:', err);
                        req.flash('error', 'Notifikasi dibuat tetapi gagal mengirim ke penerima');
                        res.redirect('/admin/notifikasi');
                    });
            }
        );
    }

    /**
     * Create notification records for recipients
     * @param {number} notificationId - Notification ID
     * @param {string} ditujukanKe - Target type
     * @param {string} tahunLulus - Graduation year
     * @param {string} penerimaId - Specific recipient ID
     */
    static createNotificationRecords(notificationId, ditujukanKe, tahunLulus, penerimaId) {
        return new Promise((resolve, reject) => {
            let query = '';
            let params = [];

            console.log('Creating notification records for:', {
                notificationId,
                ditujukanKe,
                tahunLulus,
                penerimaId
            });

            if (ditujukanKe === 'semua') {
                query = `
                    INSERT INTO notifikasi_read (notifikasi_id, alumni_id, status)
                    SELECT ?, a.id, 'unread'
                    FROM alumni a
                    JOIN alumni_profiles ap ON ap.alumni_id = a.id
                    WHERE a.status = 'aktif'
                `;
                params = [notificationId];
            } else if (ditujukanKe === 'tahun_lulus') {
                query = `
                    INSERT INTO notifikasi_read (notifikasi_id, alumni_id, status)
                    SELECT ?, a.id, 'unread'
                    FROM alumni a
                    JOIN alumni_profiles ap ON ap.alumni_id = a.id
                    WHERE a.status = 'aktif' AND ap.tahun_lulus = ?
                `;
                params = [notificationId, tahunLulus];
            } else if (ditujukanKe === 'spesifik') {
                query = `
                    INSERT INTO notifikasi_read (notifikasi_id, alumni_id, status)
                    VALUES (?, ?, 'unread')
                `;
                params = [notificationId, penerimaId];
            }

            if (query) {
                db.query(query, params, (err, result) => {
                    if (err) {
                        console.error('Error creating notification records:', err);
                        reject(err);
                    } else {
                        console.log('Notification records created successfully:', result);
                        resolve(result);
                    }
                });
            } else {
                console.log('No query to execute');
                resolve();
            }
        });
    }

    /**
     * Get notification details (for admin)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static getNotificationDetails(req, res) {
        const { id } = req.params;

        const query = `
            SELECT n.*, a.nama_lengkap AS admin_pengirim
            FROM notifikasi n
            LEFT JOIN admins a ON n.dikirim_oleh = a.id
            WHERE n.id = ?
        `;

        db.query(query, [id], (err, results) => {
            if (err || results.length === 0) {
                console.error('Notifikasi tidak ditemukan:', err);
                req.flash('error', 'Notifikasi tidak ditemukan');
                return res.redirect('/admin/notifikasi');
            }

            const notification = results[0];

            // Get additional info for specific recipient
            let recipientInfo = null;
            if (notification.ditujukan_ke === 'spesifik' && notification.penerima_id) {
                const recipientQuery = `
                    SELECT a.nim, ap.nama_lengkap, ap.tahun_lulus
                    FROM alumni_profiles ap, alumni a
                    JOIN alumni_profiles ap ON ap.alumni_id = a.id
                    WHERE a.id = ?
                `;
                
                db.query(recipientQuery, [notification.penerima_id], (err, recipientResults) => {
                    if (!err && recipientResults.length > 0) {
                        recipientInfo = recipientResults[0];
                    }
                    
                    // Get read status
                    const readQuery = `
                        SELECT nr.*, a.nim, ap.nama_lengkap, ap.tahun_lulus
                        FROM notifikasi_read nr
                        JOIN alumni a ON nr.alumni_id = a.id
                        JOIN alumni_profiles ap ON ap.alumni_id = a.id
                        WHERE nr.notifikasi_id = ?
                        ORDER BY ap.nama_lengkap ASC
                    `;

                    db.query(readQuery, [id], (err, readResults) => {
                        if (err) {
                            console.error('Gagal mengambil data pembacaan:', err);
                        }

                        res.render('admin/notifikasiDetail', {
                            title: 'Detail Notifikasi',
                            notification,
                            recipientInfo,
                            readStatus: readResults || [],
                            admin: req.session.admin
                        });
                    });
                });
            } else {
                // Get read status for non-specific notifications
                const readQuery = `
                    SELECT nr.*, a.nim, ap.nama_lengkap, ap.tahun_lulus
                    FROM notifikasi_read nr
                    JOIN alumni a ON nr.alumni_id = a.id
                    JOIN alumni_profiles ap ON ap.alumni_id = a.id
                    WHERE nr.notifikasi_id = ?
                    ORDER BY ap.nama_lengkap ASC
                `;

                db.query(readQuery, [id], (err, readResults) => {
                    if (err) {
                        console.error('Gagal mengambil data pembacaan:', err);
                    }

                    res.render('admin/notifikasiDetail', {
                        title: 'Detail Notifikasi',
                        notification,
                        recipientInfo: null,
                        readStatus: readResults || [],
                        admin: req.session.admin
                    });
                });
            }
        });
    }

    /**
     * Delete notification (for admin)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static deleteNotification(req, res) {
        const { id } = req.params;

        // Delete notification records first
        const deleteRecordsQuery = 'DELETE FROM notifikasi_read WHERE notifikasi_id = ?';
        const deleteNotificationQuery = 'DELETE FROM notifikasi WHERE id = ?';

        db.query(deleteRecordsQuery, [id], (err, result) => {
            if (err) {
                console.error('Gagal menghapus record notifikasi:', err);
                return res.json({
                    success: false,
                    message: 'Gagal menghapus notifikasi'
                });
            }

            db.query(deleteNotificationQuery, [id], (err, result) => {
                if (err) {
                    console.error('Gagal menghapus notifikasi:', err);
                    return res.json({
                        success: false,
                        message: 'Gagal menghapus notifikasi'
                    });
                }

                res.json({
                    success: true,
                    message: 'Notifikasi berhasil dihapus'
                });
            });
        });
    }

    // Alumni notification functions
    /**
     * Get alumni notifications
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static getAlumniNotifications(req, res) {
        const alumniId = req.session.alumni.id;
        const page = req.query.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const query = `
            SELECT n.*, nr.status as read_status, nr.waktu_baca
            FROM notifikasi n
            JOIN notifikasi_read nr ON n.id = nr.notifikasi_id
            WHERE nr.alumni_id = ?
            ORDER BY n.waktu_kirim DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM notifikasi n
            JOIN notifikasi_read nr ON n.id = nr.notifikasi_id
            WHERE nr.alumni_id = ?
        `;

        Promise.all([
            new Promise((resolve, reject) => {
                db.query(query, [alumniId, limit, offset], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(countQuery, [alumniId], (err, results) => {
                    if (err) reject(err);
                    else resolve(results[0].total);
                });
            })
        ])
        .then(([notifications, total]) => {
            const totalPages = Math.ceil(total / limit);
            
            res.render('alumni/notifikasi', {
                title: 'Notifikasi',
                notifications,
                currentPage: parseInt(page),
                totalPages,
                alumni: req.session.alumni
            });
        })
        .catch(err => {
            console.error('Gagal mengambil notifikasi alumni:', err);
            req.flash('error', 'Gagal mengambil notifikasi');
            res.redirect('/alumni/dashboard');
        });
    }

    /**
     * Mark notification as read (for alumni)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static markAsRead(req, res) {
        const { id } = req.params;
        const alumniId = req.session.alumni.id;

        const query = `
            UPDATE notifikasi_read 
            SET status = 'read', waktu_baca = NOW()
            WHERE notifikasi_id = ? AND alumni_id = ?
        `;

        db.query(query, [id, alumniId], (err, result) => {
            if (err) {
                console.error('Gagal menandai notifikasi sebagai dibaca:', err);
                return res.json({
                    success: false,
                    message: 'Gagal menandai notifikasi sebagai dibaca'
                });
            }

            res.json({
                success: true,
                message: 'Notifikasi berhasil ditandai sebagai dibaca'
            });
        });
    }

    /**
     * Mark all notifications as read (for alumni)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static markAllAsRead(req, res) {
        const alumniId = req.session.alumni.id;

        const query = `
            UPDATE notifikasi_read 
            SET status = 'read', waktu_baca = NOW()
            WHERE alumni_id = ? AND status = 'unread'
        `;

        db.query(query, [alumniId], (err, result) => {
            if (err) {
                console.error('Gagal menandai semua notifikasi sebagai dibaca:', err);
                return res.json({
                    success: false,
                    message: 'Gagal menandai semua notifikasi sebagai dibaca'
                });
            }

            res.json({
                success: true,
                message: 'Semua notifikasi berhasil ditandai sebagai dibaca'
            });
        });
    }

    /**
     * Get unread notification count (for alumni)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static getUnreadCount(req, res) {
        const alumniId = req.session.alumni.id;

        const query = `
            SELECT COUNT(*) as count
            FROM notifikasi_read nr
            WHERE nr.alumni_id = ? AND nr.status = 'unread'
        `;

        db.query(query, [alumniId], (err, results) => {
            if (err) {
                console.error('Gagal mengambil jumlah notifikasi belum dibaca:', err);
                return res.json({
                    success: false,
                    count: 0
                });
            }

            res.json({
                success: true,
                count: results[0].count
            });
        });
    }
}

module.exports = NotifikasiController;