require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const errorController = require("./controllers/errorController");
const authRouter = require("./routers/authRouter");
const packageRouter = require("./routers/packageRouter");
const barberRouter = require("./routers/barberRouter");
const userRouter = require("./routers/userRouter");
// const adminRouter = require('./routers/adminRouter');
const path = require("path");
const { OAuth2Client } = require("google-auth-library");
const googleConfig = require("./google.json");
const uploadd = require("./utils/uploadConfig");

app.use(express.json({ limit: "100mb" }));

app.use(cors());

app.use("/api/auth", authRouter);
app.use("/api/packages", packageRouter);
app.use("/api/barbers", barberRouter);
app.use("/api/users", userRouter);
const client = new OAuth2Client(
    googleConfig.web.client_id,
    googleConfig.web.client_secret,
    "https://coral-app-3s2ln.ondigitalocean.app/api/callback"
);

// Endpoint to handle Google OAuth callback
app.post("/api/callback", async (req, res) => {
    const authCode = req.body.code;

    try {
        // Exchange auth code for tokens
        const { tokens } = await client.getToken(authCode);

        // Verify ID token
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const userId = payload["sub"];
        const email = payload["email"];
        const name = payload["name"];
        console.log(payload);

        // Send response back to the client
        res.status(200).json({
            message: "Sign-in successful",
            user: { userId, email, name },
        });
    } catch (error) {
        console.error("Error during token exchange:", error);
        res.status(500).json({ message: "Authentication failed" });
    }
});
// app.use("/api/admin",adminRouter);

// Serve static files from the 'public' directory  -
app.use(
    "/photos",
    express.static(path.join(__dirname, "utils", "public", "photos"), {
        setHeaders: (res, path) => {
            res.setHeader("Cache-Control", "public, max-age=31536000");
        },
    })
);
// app.use('/users', express.static(path.join(__dirname, 'utils','public', 'users')));
app.use(
    "/users",
    express.static(path.join(__dirname, "utils", "public", "users"), {
        setHeaders: (res, path) => {
            res.setHeader("Cache-Control", "public, max-age=31536000");
        },
    })
);
app.use(
    "/packages",
    express.static(path.join(__dirname, "utils", "public", "packages"), {
        setHeaders: (res, path) => {
            res.setHeader("Cache-Control", "public, max-age=31536000");
        },
    })
);
app.post("/api/webhook", async (req, res) => {
    try {
        const eventData = req.body;

        // Verify the webhook data (Optional: Validate signature if MyFatoorah supports it)
        console.log("Webhook Data:", eventData);

        if (eventData.Status === "Failed") {
            const { CustomerName, InvoiceId, ErrorCode, ErrorDescription } =
                eventData;
            console.error(
                `Payment for Invoice ${InvoiceId} by ${CustomerName} failed: ${ErrorDescription} (Error Code: ${ErrorCode})`
            );

            // Notify customer about the failure
            // Optionally, retry the payment or disable the service
        }

        res.status(200).send("Webhook received");
    } catch (error) {
        console.error("Error in webhook handling:", error);
        res.status(500).send("Webhook handling failed");
    }
});

app.post("/upload", uploadd.single("image"), (req, res) => {
    res.json({ fileUrl: req.file.location });
});

// test
function getJsonData() {
    return { data: 1234 };
}

// إعداد مسار API
app.get("/api/data", (req, res) => {
    res.json(getJsonData());
});
// end test

app.all("*", (req, res, next) => {
    res.status(404).json({
        message: "wrong URL",
    });
});
app.use(errorController);
module.exports = app;
