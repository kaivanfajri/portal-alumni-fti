require('dotenv').config();
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

// Koneksi ke DB
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'portal_alumni',
});

const hashSemuaPasswordAdmin = async () => {
    db.query('SELECT id, password FROM admins', async (err, results) => {
        if (err) {
            console.error('❌ Gagal membaca data:', err);
            db.end();
            return;
        }

        for (const admin of results) {
            const { id, password } = admin;

            // Cek apakah password sudah di-hash (panjang hash bcrypt selalu 60 karakter)
            if (password.length < 60) {
                const hashed = await bcrypt.hash(password, 10);
                db.query('UPDATE admins SET password = ? WHERE id = ?', [hashed, id], (errUpdate) => {
                    if (errUpdate) {
                        console.error(`❌ Gagal update admin id ${id}:`, errUpdate);
                    } else {
                        console.log(`✅ Password admin id ${id} berhasil di-hash`);
                    }
                });
            } else {
                console.log(`ℹ️ Password admin id ${id} sudah di-hash, dilewati`);
            }
        }

        db.end();
    });
};

hashSemuaPasswordAdmin();
