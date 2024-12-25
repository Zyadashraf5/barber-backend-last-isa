const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();
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
exports.subscribe = catchAsync(async (req, res,next) => {
    const { id } = req.params;
    const package = await prisma.packages.findUnique({
        where:{
            id:+id
        }
    });
    const user = await prisma.user.findUnique({
        where:{
            id:+req.user.id
        }
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
            url:subscriptionUrl
        });
    } catch (error) {
        console.error("Subscription Error:", error.response?.data || error);
        res.status(500).send("Failed to initiate subscription. Please try again.");
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
