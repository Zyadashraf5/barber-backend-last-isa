const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const adminController = require("../controllers/adminController");
const upload = require("../utils/uploadConfig");
const router = require("express").Router();
router.route("/success").get(userController.subResultSuccess);
router.route("/fail").get(userController.subResultFail);
router.use(authController.isLoggedIn);
router.route("/check").post(userController.checkPayment);
router.route("/booking/all").get(userController.getAllBooking);
router.route("/booking").get(userController.getMyBooking);
router.route("/support").post(userController.sendSupport);
router.route("/about").get(userController.getAbout);
router
    .route("/booking/cancel/:id")
    .get(authController.restrictTo("User"), userController.cancelBooking);
router
    .route("/booking/finish/:id")
    .get(authController.restrictTo("Barber"), userController.finishBooking);
router.route("/booking/date/:id").get(userController.getBookingByDate);
router.route("/booking/rating/:id").post(userController.rate);
router
    .route("/booking/:id")
    .get(userController.getBookingById)
    .post(userController.book);
router.route("/favorite").get(userController.getFavorite);
router.route("/favorite/:id").get(userController.addFavorite);

router.route("/activeBanner").get(adminController.getAllActiveBanners);
router
    .route("/banner/toggle/:id")
    .get(authController.restrictTo("Admin"), adminController.toggleBanner);
router
    .route("/banners")
    .get(authController.restrictTo("Admin"), adminController.getAllBanners)
    .post(
        authController.restrictTo("Admin"),
        upload.single("photo"),
        adminController.addBanner
    );
router.route("/checkCoupon").post(userController.checkCoupon);
router
    .route("/admin/allUsers")
    .get(authController.restrictTo("Admin"), adminController.adminGetAllUsers);

module.exports = router;
