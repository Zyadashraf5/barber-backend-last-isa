const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const adminController = require("../controllers/adminController");

const router=require("express").Router();
router.use(authController.isLoggedIn);
router.route("/booking/all").get(userController.getAllBooking);
router.route("/booking").get(userController.getMyBooking);
router.route('/booking/cancel/:id').get(authController.restrictTo("User"),userController.cancelBooking);
router.route("/booking/finish/:id").get(authController.restrictTo("Barber"),userController.finishBooking);
router.route("/booking/date/:id").get(userController.getBookingByDate);
router.route("/booking/rating/:id").post(userController.rate);
router.route("/booking/:id").get(userController.getBookingById).post(userController.book);
router.route("/favorite").get(userController.getFavorite);
router.route("/favorite/:id").get(userController.addFavorite);

// admin
router.route('/admin/allUsers').get(authController.restrictTo("Admin"), adminController.adminGetAllUsers);

module.exports=router;