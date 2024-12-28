const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();
const MYFATOORAH_API_KEY =
    "rLtt6JWvbUHDDhsZnfpAhpYk4dxYDQkbcPTyGaKp2TYqQgG7FGZ5Th_WD53Oq8Ebz6A53njUoo1w3pjU1D4vs_ZMqFiz_j0urb_BH9Oq9VZoKFoJEDAbRZepGcQanImyYrry7Kt6MnMdgfG5jn4HngWoRdKduNNyP4kzcp3mRv7x00ahkm9LAK7ZRieg7k1PDAnBIOG3EyVSJ5kK4WLMvYr7sCwHbHcu4A5WwelxYK0GMJy37bNAarSJDFQsJ2ZvJjvMDmfWwDVFEVe_5tOomfVNt6bOg9mexbGjMrnHBnKnZR1vQbBtQieDlQepzTZMuQrSuKn-t5XZM7V6fCW7oP-uXGX-sMOajeX65JOf6XVpk29DP6ro8WTAflCDANC193yof8-f5_EYY-3hXhJj7RBXmizDpneEQDSaSz5sFk0sV5qPcARJ9zGG73vuGFyenjPPmtDtXtpx35A-BVcOSBYVIWe9kndG3nclfefjKEuZ3m4jL9Gg1h2JBvmXSMYiZtp9MR5I6pvbvylU_PP5xJFSjVTIz7IQSjcVGO41npnwIxRXNRxFOdIUHn0tjQ-7LwvEcTXyPsHXcMD8WtgBh-wxR8aKX7WPSsT1O8d8reb2aR7K3rkV3K82K_0OgawImEpwSvp9MNKynEAJQS6ZHe_J_l77652xwPNxMRTMASk1ZsJL";
// const BASE_URL = "https://api.myfatoorah.com";
const BASE_URL = "https://apitest.myfatoorah.com";
//
exports.buyPackage = catchAsync(async (req, res, next) => {
    const { packageId } = req.body;
    await prisma.user.update({
        where: {
            id: req.user.id,
        },
        data: {
            barberPackage: {
                connect: {
                    id: packageId,
                },
            },
        },
    });
});
exports.subscribe = async (req, res) => {
    const { id } = req.params; // Get package ID from request parameters

    try {
        // Fetch package and user details
        const package = await prisma.packages.findUnique({
            where: { id: +id },
        });
        const user = await prisma.user.findUnique({
            where: { id: +req.user.id },
        });

        // Step 1: Call InitiatePayment to get valid PaymentMethodId
        const initiateResponse = await axios.post(
            `${BASE_URL}/v2/InitiatePayment`,
            {
                InvoiceAmount: package.price, // Package price
                CurrencyIso: "KWD", // Use your account's currency
            },
            {
                headers: {
                    Authorization: `Bearer ${MYFATOORAH_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // Retrieve the first valid PaymentMethodId
        const paymentMethodId =
            initiateResponse.data.Data.PaymentMethods[0].PaymentMethodId;

        // Step 2: Prepare payload for SendPayment
        const payload = {
            InvoiceValue: package.price,
            CustomerName: user.name,
            CustomerMobile: user.phoneNumber.replace(/^(\+?\d{1,3})/, ""), // Removes country code from phone number
            CustomerCountryCode: user.phoneNumber
                .match(/^\+?\d{1,3}/)[0]
                .replace("+", ""), // Extracts country code
            CustomerEmail: user.email,
            CallBackUrl: `https://coral-app-3s2ln.ondigitalocean.app/api/packages/success?userId=${user.id}&packageId=${package.id}`,
            ErrorUrl:
                "https://coral-app-3s2ln.ondigitalocean.app/api/packages/fail",
            Language: "EN",
            NotificationOption: "ALL",
            PaymentMethodId: paymentMethodId, // Use valid PaymentMethodId
            RecurringModel: {
                RecurringType: "Monthly", // Daily, Weekly, Monthly
                RecurringInterval: 1, // Interval in months
                RecurringCount: 12, // Optional: Number of recurring payments
            },
        };

        // Step 3: Call SendPayment to initiate subscription
        const response = await axios.post(
            `${BASE_URL}/v2/SendPayment`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${MYFATOORAH_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const subscriptionUrl = response.data.Data.InvoiceURL;

        // Send the subscription URL to the client
        res.status(200).json({ url: subscriptionUrl });
    } catch (error) {
        console.error(
            "Subscription Error:",
            error.response?.data || error.message
        );
        res.status(500).send(
            "Failed to initiate subscription. Please try again."
        );
    }
};
exports.subResultSuccess = catchAsync(async (req, res, next) => {
    const { packageId, userId } = req.query;
    await prisma.user.update({
        where: {
            id: +userId,
        },
        data: {
            barberPackage: {
                connect: {
                    id: +packageId,
                },
            },
            packagePurchasedDate: new Date(),
        },
    });
    res.status(200).send(
        "<div><h1>success , return to the app and relogin to access it</h1></div>"
    );
});
exports.subResultFail = catchAsync(async (req, res, next) => {
    const paymentId = req.query.paymentId; // Extract paymentId from query parameters

    if (!paymentId) {
        res.status(400).send("Missing paymentId in query parameters.");
        return;
    }

    try {
        // Fetch payment status using the paymentId
        const response = await axios.post(
            `${BASE_URL}/v2/GetPaymentStatus`,
            {
                Key: paymentId,
                KeyType: "PaymentId", // Indicates you're searching by PaymentId
            },
            {
                headers: {
                    Authorization: `Bearer ${MYFATOORAH_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const paymentStatus = response.data.Data;
        console.log("Payment Status:", paymentStatus);
        console.log(response.data);

        // Handle failed payment status here
        res.status(200).send("<div><h1>Failed , try again later</h1></div>");
    } catch (error) {
        console.error(
            "Error Fetching Payment Status:",
            error.response?.data || error.message
        );
        res.status(500).send("Unable to fetch payment status.");
    }
});
exports.getAllPackages = catchAsync(async (req, res, next) => {
    const packages = await prisma.packages.findMany({});
    res.status(200).json({
        packages,
    });
});
exports.createPackage = catchAsync(async (req, res, next) => {
    // If a file is uploaded, save the file path relative to the 'public' folder
    // const photo = req.file ? `/packages/${req.file.filename}` : null; // Save the path to the file
    const photo = req.file ? req.file.location : null; // Use location if uploading to S3/DigitalOcean Spaces

    // Convert the price to a float if it's a string
    const price = parseFloat(req.body.price);
    const { type, duration, smallDesc, desc } = req.body;

    // Check if the price is a valid number
    if (isNaN(price)) {
        return res.status(400).json({
            status: "error",
            message: "Invalid price value provided",
        });
    }

    const package = await prisma.packages.create({
        data: {
            photo,
            type,
            duration,
            smallDesc,
            desc,
            name: req.body.name,
            price: price, // Ensure price is a float
        },
    });

    res.status(201).json({
        package,
    });
});
