require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Portal Alumni Server berjalan pada port ${PORT}`);
    console.log(`📱 Akses aplikasi di: http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
