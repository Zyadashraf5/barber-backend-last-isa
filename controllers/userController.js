const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const sendEmail = require("../utils/email");

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

    let { servicesId, date, paymentType, code } = req.body;
    const { lat, lng } = req.query;
    date = new Date(date.replace(" ", "T") + "Z");
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

    let total = services.reduce((sum, element) => sum + element.price, 0);
    if (coupon) {
        total *= total * coupon.discount;
    }
    let booking;
    if (coupon) {
        booking = await prisma.booking.create({
            data: {
                barberStoreId: +id,
                userId: +req.user.id,
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

    res.status(200).json({
        booking,
    });
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
