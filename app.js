require('dotenv').config();

const express = require("express");
const app = express();
const cors = require("cors");
const errorController = require("./controllers/errorController");
const authRouter = require('./routers/authRouter');
const packageRouter = require('./routers/packageRouter');
const barberRouter = require('./routers/barberRouter');
const userRouter = require('./routers/userRouter');
// const adminRouter = require('./routers/adminRouter');
const path = require('path');
const uploadd = require('./utils/uploadConfig');

app.use(express.json({limit:'100mb'}));

app.use(cors());

app.use('/api/auth' ,authRouter );
app.use('/api/packages',packageRouter);
app.use("/api/barbers",barberRouter);
app.use("/api/users",userRouter);
// app.use("/api/admin",adminRouter);

// Serve static files from the 'public' directory  -
app.use('/photos', express.static(path.join(__dirname, 'utils', 'public', 'photos'), {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
}));
// app.use('/users', express.static(path.join(__dirname, 'utils','public', 'users')));
app.use('/users', express.static(path.join(__dirname, 'utils', 'public', 'users'), {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
}));
app.use('/packages', express.static(path.join(__dirname, 'utils','public', 'packages'), {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
}));
app.post("/api/webhook", async (req, res) => {
    try {
        const eventData = req.body;

        // Verify the webhook data (Optional: Validate signature if MyFatoorah supports it)
        console.log("Webhook Data:", eventData);

        if (eventData.Status === "Failed") {
            const { CustomerName, InvoiceId, ErrorCode, ErrorDescription } = eventData;
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


app.post('/upload', uploadd.single('image'), (req, res) => {
    res.json({ fileUrl: req.file.location });
});


// test 
function getJsonData() {
    return { data: 1234 };
}

// إعداد مسار API
app.get('/api/data', (req, res) => {
    res.json(getJsonData());
});
// end test

app.all("*",(req,res,next)=>{
    res.status(404).json({
        message: "wrong URL",
    });
});
app.use(errorController);
module.exports=app;
