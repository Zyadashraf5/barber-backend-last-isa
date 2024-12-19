const { multipleUpload } = require("../utils/upload"); // Correct declaration
const authController = require("../controllers/authController");
const barberController = require("../controllers/barberController");
const adminController = require("../controllers/adminController");
const router = require("express").Router();
// const upload = require('../utils/upload'); // Import the multer upload middleware

router.use(authController.isLoggedIn);
router.use(authController.checkPackage);
router
    .route("/me")
    .get(authController.restrictTo("Barber"), barberController.getMyStores);
router
    .route("/me/:id")
    .get(authController.restrictTo("Barber"), barberController.getStoreById)
    .post(
        authController.restrictTo("Barber"),
        barberController.changePaymentType
    );
// router.route("/").post(upload.single("photo"), authController.restrictTo("Barber"),barberController.createServices,barberController.createStore).get(barberController.getAllBarbers);
router
    .route("/")
    .post(
        multipleUpload, // Middleware for multiple file uploads
        authController.restrictTo("Barber"),
        barberController.createServices,
        barberController.createStore
    )
    .get(barberController.getAllBarbers);
// New route for creating services   TEST
// router.route('/services').post(authController.restrictTo("Barber"), barberController.createServices);
router
    .route("/switchStatus/:id")
    .post(authController.restrictTo("Barber"), barberController.switchStatus);
router.route("/services").get(barberController.getAllServices);
router.route("/bookings/status/:id").post(barberController.changeBookingStatus);
router
    .route("/bookings/active/:id")
    .get(barberController.getActiveStoreBookings);
router.route("/bookings/:id").get(barberController.getStoreBookings);
router.route("/myClients/:id").get(barberController.getMyClients);
// admin
router
    .route("/admin/allBarbers")
    .get(
        authController.restrictTo("Admin"),
        adminController.adminGetAllBarbers
    );
router
    .route("/admin/allBookings")
    .get(
        authController.restrictTo("Admin"),
        adminController.adminGetAllBookings
    );

module.exports = router;
