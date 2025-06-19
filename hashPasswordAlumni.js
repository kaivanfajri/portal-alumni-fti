// hashPasswordAlumni.js
const bcrypt = require('bcryptjs');
const db = require('./config/db');

const hashPasswords = async () => {
    try {
        // Ambil semua alumni
        db.query('SELECT id, nim, password FROM alumni', async (err, results) => {
            if (err) throw err;

            for (const alumni of results) {
                const currentPassword = alumni.password;

                // Lewati jika password sudah ter-hash (panjang hash bcrypt umumnya 60 karakter)
                if (currentPassword.length === 60 && currentPassword.startsWith('$2a$')) {
                    console.log(`Lewati: Password untuk ${alumni.nim} sudah di-hash.`);
                    continue;
                }

                const hashedPassword = await bcrypt.hash(currentPassword, 10);

                // Update password yang sudah di-hash ke DB
                db.query('UPDATE alumni SET password = ? WHERE id = ?', [hashedPassword, alumni.id], (updateErr) => {
                    if (updateErr) {
                        console.error(`Gagal update password untuk ${alumni.nim}:`, updateErr);
                    } else {
                        console.log(`Berhasil hash password untuk ${alumni.nim}`);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Terjadi kesalahan:', error);
    }
};

hashPasswords();
