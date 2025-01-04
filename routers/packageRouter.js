const authController = require("../controllers/authController");
const packageController = require("../controllers/packagesController");
const router = require("express").Router();
const upload = require("../utils/packageUpload"); // Import the multer upload middleware
router.route("/success").get(packageController.subResultSuccess);
router.route("/fail").get(packageController.subResultFail);

router.use(authController.isLoggedIn);
router
    .route("/")
    .post(
        upload.single("photo"),
        authController.restrictTo("Admin"),
        packageController.createPackage
    )
    .get(packageController.getAllPackages);

router.post("/start-subscription/:id", packageController.subscribe);
router.route("/buy").post(packageController.buyPackage);
router
    .route("/:id")
    .delete(
        authController.restrictTo("Admin"),
        packageController.deletePackage
    );
module.exports = router;
