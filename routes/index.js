const router = require('express').Router();
const userController = require('../controllers/userController.js');
const auth = require('../middleware/auth')
const path = require('path');


router.get('/register', (req, res) => {
    res.render('register');
});
router.post('/register', userController.handleRegister);

router.get('/login', (req, res) => {
    res.render('login');
});
router.post('/login', userController.handleLogin)

router.get('/forgot-password', (req, res) => {
    res.render('forgot');
});
router.post('/forgot-password', userController.forgotPassword);

router.get('/reset-password', userController.handleToken);
router.post('/reset-password', userController.handleResetPassword);

router.get('/auth', auth, (req, res) => {
    res.render('auth')
})

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});

router.get('/error', (req, res) => {
    throw new Error('Ini error uji coba untuk Sentry');
});

module.exports = router