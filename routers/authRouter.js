const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const router = require("express").Router();
const upload = require("../utils/userUpload"); // Import the multer upload middleware
// const upload = require('../utils/uploadConfig'); // Import the multer upload middleware

router.route("/login").post(authController.login);
router.route("/register").post(upload.single("photo"), authController.register);
router.route("/verify").post(authController.verifyOTP);
router.route("/forgetPassword").post(authController.forgetPassword);
router.route("/resetPassword").post(authController.resetPassword);
router.use(authController.isLoggedIn);
router.route("/me").get(authController.getMe);
router.route("/changePassword").post(authController.changePassword);

// admin
router
    .route("/ban/:userId")
    .get(authController.restrictTo("Admin"), adminController.banUser);

module.exports = router;
