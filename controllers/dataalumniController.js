const db = require('../config/db');
const ExcelJS = require('exceljs');

// Menampilkan data alumni
exports.showKelolaDataAlumni = (req, res) => {
    const query = `
        SELECT alumni_profiles.*, alumni.nim, alumni.email, alumni.status
        FROM alumni_profiles
        JOIN alumni ON alumni_profiles.alumni_id = alumni.id
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching alumni profiles:', err);
            return res.status(500).send('Gagal mengambil data alumni');
        }

        res.render('admin/kelolaDataAlumni', { 
            title: 'Kelola Data Alumni', 
            alumniProfiles: result || [] 
        });
    });
};

// Menampilkan form edit alumni
exports.editAlumni = (req, res) => {
    const alumniId = req.params.id;
    
    const query = `
        SELECT alumni_profiles.*, alumni.nim, alumni.email, alumni.status
        FROM alumni_profiles
        JOIN alumni ON alumni_profiles.alumni_id = alumni.id 
        WHERE alumni_profiles.alumni_id = ?
    `;
    
    db.query(query, [alumniId], (err, result) => {
        if (err) {
            console.error('Error fetching alumni data for editing:', err);
            return res.status(500).send('Gagal mengambil data alumni');
        }

        if (result.length === 0) {
            return res.status(404).send('Alumni tidak ditemukan');
        }

        res.render('admin/editAlumni', { 
            title: 'Edit Alumni', 
            alumniData: result[0] 
        });
    });
};

// Mengupdate data alumni
exports.updateAlumni = (req, res) => {
    const alumniId = req.params.id;
    const {
        nama_lengkap, jenis_kelamin, program_studi, tahun_masuk, tahun_lulus,
        alamat, kota, pekerjaan_sekarang, nama_perusahaan, bidang_industri,
        instagram, linkedin
    } = req.body;

    const query = `
        UPDATE alumni_profiles 
        SET 
            nama_lengkap = ?, 
            jenis_kelamin = ?, 
            program_studi = ?, 
            tahun_masuk = ?, 
            tahun_lulus = ?, 
            alamat = ?, 
            kota = ?, 
            pekerjaan_sekarang = ?, 
            nama_perusahaan = ?, 
            bidang_industri = ?, 
            instagram = ?, 
            linkedin = ?
        WHERE alumni_id = ?
    `;
    
    db.query(query, [
        nama_lengkap, jenis_kelamin, program_studi, tahun_masuk, tahun_lulus,
        alamat, kota, pekerjaan_sekarang, nama_perusahaan, bidang_industri,
        instagram, linkedin, alumniId
    ], (err, result) => {
        if (err) {
            console.error('Error updating alumni:', err);
            return res.status(500).send('Gagal memperbarui data alumni');
        }
        res.redirect('/admin/kelolaDataAlumni');
    });
};

// Menghapus alumni
exports.deleteAlumni = (req, res) => {
    const alumniId = req.params.id;
    const query = 'DELETE FROM alumni_profiles WHERE alumni_id = ?';
    
    db.query(query, [alumniId], (err, result) => {
        if (err) {
            console.error('Error deleting alumni:', err);
            return res.status(500).json({ success: false, message: 'Gagal menghapus alumni' });
        }

        res.json({ success: true, message: 'Alumni berhasil dihapus' });
    });
};

// Ekspor data alumni ke Excel
exports.exportAlumni = (req, res) => {
    const query = `
        SELECT 
            alumni.nim,
            alumni_profiles.nama_lengkap,
            alumni_profiles.jenis_kelamin,
            alumni_profiles.program_studi,
            alumni_profiles.tahun_masuk,
            alumni_profiles.tahun_lulus,
            alumni_profiles.alamat,
            alumni_profiles.kota,
            alumni_profiles.pekerjaan_sekarang,
            alumni_profiles.nama_perusahaan,
            alumni_profiles.bidang_industri,
            alumni_profiles.instagram,
            alumni_profiles.linkedin,
            alumni.email,
            alumni.status
        FROM alumni_profiles
        JOIN alumni ON alumni_profiles.alumni_id = alumni.id
    `;

    db.query(query, async (err, results) => {
        if (err) {
            console.error('Error fetching alumni data for export:', err);
            return res.status(500).send('Gagal mengambil data alumni untuk diekspor');
        }

        // Buat workbook Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data Alumni');

        // Tambahkan header kolom
        worksheet.columns = [
            { header: 'NIM', key: 'nim', width: 15 },
            { header: 'Nama Lengkap', key: 'nama_lengkap', width: 25 },
            { header: 'Jenis Kelamin', key: 'jenis_kelamin', width: 15 },
            { header: 'Program Studi', key: 'program_studi', width: 20 },
            { header: 'Tahun Masuk', key: 'tahun_masuk', width: 12 },
            { header: 'Tahun Lulus', key: 'tahun_lulus', width: 12 },
            { header: 'Alamat', key: 'alamat', width: 30 },
            { header: 'Kota', key: 'kota', width: 20 },
            { header: 'Pekerjaan Sekarang', key: 'pekerjaan_sekarang', width: 25 },
            { header: 'Nama Perusahaan', key: 'nama_perusahaan', width: 25 },
            { header: 'Bidang Industri', key: 'bidang_industri', width: 20 },
            { header: 'Instagram', key: 'instagram', width: 20 },
            { header: 'LinkedIn', key: 'linkedin', width: 30 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Status', key: 'status', width: 10 }
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
            'attachment; filename="data_alumni.xlsx"'
        );

        // Kirim file Excel
        await workbook.xlsx.write(res);
        res.end();
    });
};