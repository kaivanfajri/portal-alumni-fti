const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'portal-alumni',
});

db.connect((err) => {
    if (err) {
        console.error('❌ Gagal koneksi database:', err.message);
        process.exit(1); // hentikan aplikasi jika gagal koneksi
    } else {
        console.log('✅ Berhasil terkoneksi ke database MySQL');
    }
});

module.exports = db;
