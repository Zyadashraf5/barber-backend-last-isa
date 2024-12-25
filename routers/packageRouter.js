const authController = require("../controllers/authController");
const packageController = require("../controllers/packagesController");
const router=require("express").Router();
const upload = require('../utils/packageUpload'); // Import the multer upload middleware


router.use(authController.isLoggedIn);
router.route("/").post(upload.single("photo"), authController.restrictTo("Admin"),packageController.createPackage).get(packageController.getAllPackages);
app.post("/start-subscription", packageController.subscribe);
router.route("/buy").post(packageController.buyPackage);
module.exports = router;