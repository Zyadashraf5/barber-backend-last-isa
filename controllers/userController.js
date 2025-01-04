const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const sendEmail = require("../utils/email");
const axios = require("axios");
const { parsePhoneNumber } = require("libphonenumber-js");
const parsePhone = (phoneNumber) => {
    try {
        const parsed = parsePhoneNumber(phoneNumber);
        return {
            countryCode: parsed.countryCallingCode, // Extracts the country code
            localNumber: parsed.nationalNumber, // Extracts the local part
        };
    } catch (error) {
        throw new Error("Invalid phone number format");
    }
};
const MYFATOORAH_API_KEY =
    "rLtt6JWvbUHDDhsZnfpAhpYk4dxYDQkbcPTyGaKp2TYqQgG7FGZ5Th_WD53Oq8Ebz6A53njUoo1w3pjU1D4vs_ZMqFiz_j0urb_BH9Oq9VZoKFoJEDAbRZepGcQanImyYrry7Kt6MnMdgfG5jn4HngWoRdKduNNyP4kzcp3mRv7x00ahkm9LAK7ZRieg7k1PDAnBIOG3EyVSJ5kK4WLMvYr7sCwHbHcu4A5WwelxYK0GMJy37bNAarSJDFQsJ2ZvJjvMDmfWwDVFEVe_5tOomfVNt6bOg9mexbGjMrnHBnKnZR1vQbBtQieDlQepzTZMuQrSuKn-t5XZM7V6fCW7oP-uXGX-sMOajeX65JOf6XVpk29DP6ro8WTAflCDANC193yof8-f5_EYY-3hXhJj7RBXmizDpneEQDSaSz5sFk0sV5qPcARJ9zGG73vuGFyenjPPmtDtXtpx35A-BVcOSBYVIWe9kndG3nclfefjKEuZ3m4jL9Gg1h2JBvmXSMYiZtp9MR5I6pvbvylU_PP5xJFSjVTIz7IQSjcVGO41npnwIxRXNRxFOdIUHn0tjQ-7LwvEcTXyPsHXcMD8WtgBh-wxR8aKX7WPSsT1O8d8reb2aR7K3rkV3K82K_0OgawImEpwSvp9MNKynEAJQS6ZHe_J_l77652xwPNxMRTMASk1ZsJL";
// const BASE_URL = "https://api.myfatoorah.com";
const BASE_URL = "https://apitest.myfatoorah.com";
exports.cancelBooking = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    let booking = await prisma.booking.update({
        where: {
            id: +id,
        },
        data: {
            status: "Canceled",
        },
    });
    res.status(200).json({
        booking,
    });
});
exports.checkPayment = catchAsync(async (req, res, next) => {
    const { bookingId } = req.body;
    const booking = await prisma.booking.findUnique({
        where: {
            id: +bookingId,
        },
    });
    const response = await axios.post(
        `${BASE_URL}/v2/GetPaymentStatus`,
        {
            Key: booking.paymentId,
            KeyType: "PaymentId", // Indicates you're searching by PaymentId
        },
        {
            headers: {
                Authorization: `Bearer ${MYFATOORAH_API_KEY}`,
                "Content-Type": "application/json",
            },
        }
    );
    console.log(response.data);

    const paymentStatus = response.data.Data.InvoiceStatus;
    if (paymentStatus === "Paid") {
        await prisma.booking.update({
            where: {
                id: +bookingId,
            },
            data: {
                status: "Booked",
            },
        });
    }

    console.log("Payment Status:", paymentStatus);
    res.status(200).json({
        status: paymentStatus,
    });
});
exports.subscribe = async (req, res) => {
    const { id } = req.params; // Get package ID from request parameters

    try {
        const user = await prisma.user.findUnique({
            where: { id: +req.user.id },
        });

        // Step 1: Call InitiatePayment to get valid PaymentMethodId
        const initiateResponse = await axios.post(
            `${BASE_URL}/v2/InitiatePayment`,
            {
                InvoiceAmount: req.booking.total, // Package price
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
        const { countryCode, localNumber } = parsePhone(user.phoneNumber);
        // Step 2: Prepare payload for SendPayment
        const payload = {
            InvoiceValue: +req.booking.total,
            CustomerName: user.name,
            CustomerMobile: localNumber,
            CustomerCountryCode: countryCode,
            CustomerEmail: user.email,
            CallBackUrl: `https://coral-app-3s2ln.ondigitalocean.app/api/users/success?userId=${user.id}&bookingId=${req.booking.id}`,
            ErrorUrl: `https://coral-app-3s2ln.ondigitalocean.app/api/users/fail?bookingId=${req.booking.id}`,
            Language: "EN",
            NotificationOption: "ALL",
            PaymentMethodId: paymentMethodId, // Use valid PaymentMethodId
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
        res.status(200).json({ url: subscriptionUrl, booking: req.booking });
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
    const { bookingId, userId } = req.query;
    await prisma.booking.update({
        where: {
            id: +bookingId,
        },
        data: {
            status: "Booked",
            paymentId: req.query.paymentId,
            paymentType: "Card",
        },
    });
    res.status(200).send("<div><h1>success , return to the app</h1></div>");
});
exports.subResultFail = catchAsync(async (req, res, next) => {
    const paymentId = req.query.paymentId; // Extract paymentId from query parameters
    const { bookingId } = req.query;
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
        await prisma.booking.update({
            where: {
                id: +bookingId,
            },
            data: {
                status: "Canceled",
                paymentId: req.query.paymentId,
                paymentType: "Card",
            },
        });
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
exports.getAbout = catchAsync(async (req, res, next) => {
    const about = await prisma.about.findFirst({
        where: {
            active: true,
        },
    });
    res.status(200).json({ about });
});
exports.sendSupport = catchAsync(async (req, res, next) => {
    const { email, name, message } = req.body;
    await sendEmail({
        email: "salonbarber.dev@gmail.com",
        subject: `Support (${email})`,
        name: name,
        message,
    });
    res.status(200).json({});
});
exports.checkCoupon = catchAsync(async (req, res, next) => {
    const { code } = req.body;
    const coupon = await prisma.coupon.findUnique({
        where: {
            code,
        },
    });
    if (!coupon) {
        return next(new AppError("no coupon found!", 404));
    }
    res.status(200).json({
        coupon,
    });
});
exports.finishBooking = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    let booking = await prisma.booking.update({
        where: {
            id: +id,
        },
        data: {
            status: "Finished",
        },
    });
    res.status(200).json({
        booking,
    });
});
exports.getBookingByDate = catchAsync(async (req, res, next) => {
    const { date } = req.query;
    const { id } = req.params;
    let currentDate = new Date(date);
    let datePlusDay = new Date(date);
    datePlusDay.setDate(datePlusDay.getDate() + 1);
    console.log(currentDate, datePlusDay);
    const booking = await prisma.booking.findMany({
        where: {
            barberStoreId: +id,
            Date: {
                gte: currentDate,
                lt: datePlusDay,
            },
        },
        include: {
            booking_services: true,
            barberStore: true,
        },
    });
    res.status(200).json({
        booking,
    });
});
exports.getAllBooking = catchAsync(async (req, res, next) => {
    const { lat, lng } = req.query;
    console.log(lat, lng);
    let booking = await prisma.booking.findMany({
        where: {
            userId: +req.user.id,
        },
        include: {
            booking_services: {
                include: {
                    service: true,
                },
            },
            barberStore: true,
            user: true,
        },
    });
    booking = booking.map((e) => {
        e.barberStore.distance = haversineDistance(
            e.barberStore.lat,
            e.barberStore.lng,
            lat,
            lng
        );

        return e;
    });

    res.status(200).json({
        booking,
    });
});
exports.rate = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { rating, ratingDesc } = req.body;
    let booking = await prisma.booking.update({
        where: {
            id: +id,
        },
        data: {
            rating: +rating,
            ratingDesc: ratingDesc,
        },
    });

    res.status(200).json({
        booking,
    });
});
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);
    lat1 = degreesToRadians(lat1);
    lat2 = degreesToRadians(lat2);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) *
            Math.sin(dLon / 2) *
            Math.cos(lat1) *
            Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Helper function to convert degrees to radians
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}
exports.getFavorite = catchAsync(async (req, res, next) => {
    const { lat, lng } = req.query;

    let favorites = await prisma.favorite.findMany({
        where: {
            userId: +req.user.id,
        },
        include: {
            barberStore: {
                include: {
                    barber_service: true,
                },
            },
        },
    });
    favorites = favorites.map((e) => {
        e.barberStore.distance = haversineDistance(
            e.barberStore.lat,
            e.barberStore.lng,
            lat,
            lng
        );
        return e;
    });
    res.status(200).json({
        favorites,
    });
});
exports.addFavorite = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    let favorite;
    let isFavorite = false;
    const exist = await prisma.favorite.findFirst({
        where: {
            barberStoreId: +id,
            userId: +req.user.id,
        },
    });
    if (exist) {
        favorite = await prisma.favorite.delete({
            where: {
                id: exist.id,
            },
        });
    } else {
        favorite = await prisma.favorite.create({
            data: {
                barberStoreId: +id,
                userId: +req.user.id,
            },
        });
        isFavorite = true;
    }

    res.status(200).json({
        isFavorite,
    });
});
exports.book = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    let { servicesId, date, paymentType, code, paymentMethod } = req.body;
    const { lat, lng } = req.query;
    date = new Date(date);
    console.log(date);

    const services = await prisma.barber_service.findMany({
        where: {
            id: {
                in: servicesId,
            },
        },
    });
    let coupon;
    if (code) {
        coupon = await prisma.coupon.findUnique({
            where: {
                code,
            },
        });
    }

    let total = services.reduce((sum, element) => +sum + +element.price, 0);
    if (coupon) {
        total *= total * coupon.discount;
    }
    console.log(total);

    let booking;

    if (coupon) {
        booking = await prisma.booking.create({
            data: {
                barberStoreId: +id,
                userId: +req.user.id,
                status: "Booked",
                Date: date,
                paymentType,
                total,
                couponId: coupon.id,
            },
        });
    } else {
        booking = await prisma.booking.create({
            data: {
                barberStoreId: +id,
                userId: +req.user.id,
                status: "Booked",
                Date: date,
                paymentType,
                total,
            },
        });
    }

    if (!servicesId) {
        return next(new AppError("serviceId cant be null!", 400));
    }

    servicesId.forEach(async (e) => {
        await prisma.booking_services.create({
            data: {
                bookingId: booking.id,
                serviceId: +e,
            },
        });
    });
    booking = await prisma.booking.findUnique({
        where: {
            id: booking.id,
        },
        include: {
            barberStore: true,
            booking_services: {
                include: {
                    service: true,
                },
            },
            user: true,
        },
    });

    booking.barberStore.distance = haversineDistance(
        booking.barberStore.lat,
        booking.barberStore.lng,
        lat,
        lng
    );
    req.booking = booking;
    if (paymentMethod === "Card") {
        console.log("card");
        await prisma.booking.update({
            where: {
                id: booking.id,
            },
            data: {
                status: "Canceled",
            },
        });
        const store = await prisma.barberStore.findUnique({
            where: {
                id: +id,
            },
        });
        await prisma.user.update({
            where: {
                id: +store.userId,
            },
            data: {
                wallet: {
                    increment: total,
                },
            },
        });
        await this.subscribe(req, res);
    } else {
        console.log("cash");

        res.status(200).json({
            booking,
        });
    }
});
exports.getMyBooking = catchAsync(async (req, res, next) => {
    const { lat, lng } = req.query;

    const booking = await prisma.booking.findMany({
        where: {
            userId: req.user.id,
            OR: [
                {
                    status: "Finished",
                    rating: null,
                },
                {
                    status: {
                        notIn: ["Finished", "Canceled"],
                    },
                },
            ],
        },
        include: {
            booking_services: {
                include: {
                    service: true,
                },
            },
            barberStore: true,
            user: true,
        },
        orderBy: {
            Date: "asc",
        },
    });
    let lastBooking;
    if (booking.length > 0) {
        lastBooking = booking[0];
    } else {
        lastBooking = null;
    }
    if (lastBooking) {
        lastBooking.barberStore.distance = haversineDistance(
            lastBooking.barberStore.lat,
            lastBooking.barberStore.lng,
            lat,
            lng
        );
    }
    res.status(200).json({
        booking: lastBooking,
    });
});
exports.getBookingById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    let booking = await prisma.booking.findUnique({
        where: {
            id: +id,
        },
        include: {
            booking_services: true,
            barberStore: true,
        },
    });

    // Check if booking is retrieved successfully
    if (!booking) {
        return next(new Error("No booking found with that ID"));
    }

    // Convert booking.date to a Date object if it's not already
    const bookingDate = new Date(booking.Date);

    // Calculate the current time plus 30 minutes
    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60000);

    // Check if booking date is within the next 30 minutes
    if (bookingDate > now && bookingDate <= thirtyMinutesLater) {
        booking = await prisma.booking.update({
            data: {
                status: "Waiting",
            },
            where: {
                id: +id,
            },
        });
    } else if (bookingDate > now) {
        booking = await prisma.booking.update({
            data: {
                status: "Booked",
            },
            where: {
                id: +id,
            },
        });
    } else {
        booking = await prisma.booking.update({
            data: {
                status: "InProcess",
            },
            where: {
                id: +id,
            },
        });
    }

    res.status(200).json({
        booking,
    });
});
