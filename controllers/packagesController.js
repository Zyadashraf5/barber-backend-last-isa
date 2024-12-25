const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();
const MYFATOORAH_API_KEY =
    "XdwZeGb7LV18bbM1jS7URJ8MB-9gsfvJdwW6Dm5at-skZhMmIQlgU5Qtd-NgtyXGpPH42gRhtP9Aom4P9qxhh9ZBKPg1brO84itxUmgi_HYJQu0dHOON6mKN0qmHkbYHI9tiXzld8d4trM0AK-2Kuu-j-PUp9SljPsdy2b7QKDIrqKs48Q90l6cBw88SJlOkmuu2TvgajdJ5e_fIeMX241OoPcN8d6EdrjqjAS63YTPIAUNymSMj7OmTmIxXhvXttyPGUaw3UUabZB_dn5SLeKC4-4B_j7plIvwI39Y5MJXAGZ57ANZkqlzUAuo7bxDo6djel7kJgk00kInlR6DVD6eqUpMKqP6fuyzqnM-FK7hmLdAN66U9gFPXZSIOcvRNU0HNTFtTBvB2SFvDnCppBXMlGQTgx5egWt767Z2vM3Z7PYuoq_2OuEqm2_SkaEq0ll6CT1Y9PlaP3j3A2DXMll-RTVunSNi0vLGNBgRwOPSjmtplwp8AraaG14KrKeprLq3ePVwbaS6TdFSLTlPeFr_ytlT2sNAkcWXQVwGpel03mB9Ilg1jOkdzEKsKac1cGe-q8eyxVqYyhTS94__kQxQqRHezsABO6o_QqChmIqr810un0yCWua3plO-AQ1NDhtusDQmHl6ct7KyIsF5dqPVUYdyRzJbm1nlnAVueIio9jOXKCc5T6p0eNMf6kZ1aB9tE_A";
const BASE_URL = "https://api.myfatoorah.com";
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
exports.subscribe = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const package = await prisma.packages.findUnique({
        where: {
            id: +id,
        },
    });
    const user = await prisma.user.findUnique({
        where: {
            id: +req.user.id,
        },
    });

    const payload = {
        InvoiceValue: package.price,
        CustomerName: user.name,
        CustomerMobile: user.phoneNumber,
        CustomerEmail: user.email,
        CallBackUrl: "http://localhost:3000/subscription-success",
        ErrorUrl: "http://localhost:3000/subscription-error",
        Language: "EN",
    };

    try {
        // Step 1: Initiate Payment
        const paymentResponse = await axios.post(
            `${BASE_URL}/v2/InitiatePayment`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${MYFATOORAH_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const paymentMethodId =
            paymentResponse.data.Data.PaymentMethods[0].PaymentMethodId;

        // Step 2: Create Recurring Invoice
        const recurringPayload = {
            PaymentMethodId: paymentMethodId,
            RecurringType: package.duration, // e.g., "Daily", "Weekly", "Monthly"
            RecurringInterval: 1, // Interval in days/weeks/months
            InvoiceValue: package.price,
            CustomerName: user.name,
            CustomerMobile: user.phoneNumber,
            CustomerEmail: user.email,
            CallBackUrl: "http://localhost:3000/subscription-success",
            ErrorUrl: "http://localhost:3000/subscription-error",
            Language: "EN",
        };

        const recurringResponse = await axios.post(
            `${BASE_URL}/v2/RecurringInvoice`,
            recurringPayload,
            {
                headers: {
                    Authorization: `Bearer ${MYFATOORAH_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const subscriptionUrl = recurringResponse.data.Data.InvoiceURL;
        res.status(200).json({
            url: subscriptionUrl,
        });
    } catch (error) {
        console.error("Subscription Error:", error.response?.data || error);
        res.status(500).send(
            "Failed to initiate subscription. Please try again."
        );
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
