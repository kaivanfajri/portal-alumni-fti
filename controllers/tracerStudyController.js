const db = require('../config/db');
const exceljs = require('exceljs');

exports.exportTracerStudy = (req, res) => {
    res.render('admin/exportTracerStudy', {
        title: 'Ekspor Data Tracer Study',
        user: req.user,
    });
};

exports.generateExport = (req, res) => {
    const { start_date, end_date, format } = req.body;

    let query = 'SELECT * FROM tracer_study WHERE 1=1';
    const params = [];

    if (start_date) {
        query += ' AND tanggal_isi >= ?';
        params.push(start_date);
    }

    if (end_date) {
        query += ' AND tanggal_isi <= ?';
        params.push(end_date);
    }

    // Gunakan callback style
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error generating export:', err);
            req.flash('error', 'Gagal mengekspor data: ' + err.message);
            return res.redirect('/admin/exportTracerStudy');
        }

        if (format === 'xlsx') {
            const workbook = new exceljs.Workbook();
            const worksheet = workbook.addWorksheet('Tracer Study');

            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Alumni ID', key: 'alumni_id', width: 15 },
                { header: 'Status Kerja', key: 'status_kerja', width: 20 },
                { header: 'Nama Perusahaan', key: 'nama_perusahaan', width: 30 },
                { header: 'Posisi', key: 'posisi', width: 20 },
                { header: 'Lama Tunggu Kerja', key: 'lama_tunggu_kerja', width: 20 },
                { header: 'Sesuai Bidang', key: 'sesuai_bidang', width: 15 },
                { header: 'Gaji Range', key: 'gaji_range', width: 15 },
                { header: 'Kepuasan Kerja', key: 'kepuasan_kerja', width: 20 },
                { header: 'Saran Kampus', key: 'saran_kampus', width: 40 },
                { header: 'Tanggal Isi', key: 'tanggal_isi', width: 15 },
                { header: 'Updated At', key: 'updated_at', width: 15 },
            ];

            results.forEach((row) => {
                worksheet.addRow(row);
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=tracer_study_export.xlsx');

            return workbook.xlsx
                .write(res)
                .then(() => res.end())
                .catch((err) => {
                    console.error('Error writing excel:', err);
                    req.flash('error', 'Gagal menulis file Excel');
                    res.redirect('/admin/exportTracerStudy');
                });
        } else if (format === 'csv') {
            let csvContent = 'ID,Alumni ID,Status Kerja,Nama Perusahaan,Posisi,Lama Tunggu Kerja,Sesuai Bidang,Gaji Range,Kepuasan Kerja,Saran Kampus,Tanggal Isi,Updated At\n';

            results.forEach((row) => {
                csvContent += `"${row.id}","${row.alumni_id}","${row.status_kerja}","${row.nama_perusahaan}","${row.posisi}","${row.lama_tunggu_kerja}","${row.sesuai_bidang}","${row.gaji_range}","${row.kepuasan_kerja}","${row.saran_kampus}","${row.tanggal_isi}","${row.updated_at}"\n`;
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=tracer_study_export.csv');
            return res.send(csvContent);
        } else {
            req.flash('error', 'Format tidak valid');
            return res.redirect('/admin/exportTracerStudy');
        }
    });
};
