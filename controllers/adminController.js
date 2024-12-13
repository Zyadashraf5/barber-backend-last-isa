const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Utility function to parse pagination parameters

// Admin: Get all barbers with pagination
exports.adminGetAllBarbers = catchAsync(async (req, res, next) => {
    const barbers = await prisma.user.findMany({
        where: {
            role: "Barber", // Filter users where role is 'barber'
        },
    });

    res.status(200).json({
        status: "success",
        data: barbers,
    });
});

// Admin: Get all users with pagination
exports.adminGetAllUsers = catchAsync(async (req, res, next) => {
    const users = await prisma.user.findMany({
        where: {
            role: "User", // Filter users where role is 'barber'
        },
        include: {
            booking: true,
            // barberReviews: true,
        },
    });

    res.status(200).json({
        status: "success",
        data: users,
    });
});
exports.addBanner = catchAsync(async (req, res, next) => {
    console.log(req.body);
    
    const photo = req.file ? req.file.location : null;
    if (!photo) {
        return next(new AppError("No photo uploaded!", 400));
    }
    const banner = await prisma.banner.create({
        data: {
            photo,
            expire_at: req.body.expire_at ? new Date(req.body.expire_at) : null,
        },
    });
    res.status(201).json({
        banner,
    });
});
exports.getAllActiveBanners = catchAsync(async (req, res, next) => {
    currentDate = Date.now();
    const activeBanners = await prisma.banner.findMany({
        where: {
            isActive: true,
            OR: [
                {
                    expire_at: {
                        gte: currentDate, // Expiration date is in the future
                    },
                },
                {
                    expire_at: null, // No expiration date set
                },
            ],
        },
    });
    res.status(200).json({
        banner: activeBanners,
    });
});
exports.getAllBanners = catchAsync(async (req, res, next) => {
    currentDate = Date.now();
    const banners = await prisma.banner.findMany({});
    res.status(200).json({
        banners,
    });
});
exports.toggleBanner = catchAsync(async (req, res, next) => {
    let banner = await prisma.banner.findUnique({
        where: {
            id: +req.params.id,
        },
    });
    banner = await prisma.banner.update({
        where: {
            id: banner.id,
        },
        data: {
            isActive: !banner.isActive,
        },
    });
    res.status(200).json({
        banner,
    });
});
// Admin: Get all bookings with pagination
exports.adminGetAllBookings = catchAsync(async (req, res, next) => {
    const bookings = await prisma.booking.findMany({
        include: {
            user: true, // Include user who made the booking
            barberStore: true, // Include barber store details
            booking_services: {
                include: {
                    service: true, // Include details of the service booked
                },
            },
        },
        orderBy: {
            Date: "asc", // Order bookings by date (ascending)
        },
    });

    res.status(200).json({
        status: "success",
        results: bookings.length,
        data: bookings,
    });
});

// Admin: ban user
exports.banUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    let user = await prisma.user.findUnique({
        where: {
            id: +userId,
        },
    });
    // Update the user's `ban` column to true
    user = await prisma.user.update({
        where: { id: +userId },
        data: { ban: !user.ban },
    });

    // Send a success response
    res.status(200).json({
        status: "success",
        message: `User with ID ${userId} has been banned.`,
        data: user,
    });
});

exports.unBanUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;

    // Update the user's `ban` column to true
    const user = await prisma.user.update({
        where: { id: +userId },
        data: { ban: false },
    });

    // Send a success response
    res.status(200).json({
        status: "success",
        message: `User with ID ${userId} has been Unbanned.`,
        data: user,
    });
});
