const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { PrismaClient } =require( '@prisma/client');
const prisma = new PrismaClient();

// Utility function to parse pagination parameters
const getPagination = (query) => {
    const page = parseInt(query.page, 12) || 1; // Default to page 1
    const limit = parseInt(query.limit, 12) || 12; // Default to 12 items per page
    const skip = (page - 1) * limit; // Calculate how many items to skip
    return { page, limit, skip };
};

// Admin: Get all barbers with pagination
exports.adminGetAllBarbers = catchAsync(async (req, res, next) => {
    try {
        const barbers = await prisma.user.findMany({
            where: {
                role: 'Barber', // Filter users where role is 'barber'
            },
        });

        res.status(200).json({
            status: 'success',
            data: barbers,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
});

// Admin: Get all users with pagination
exports.adminGetAllUsers = catchAsync(async (req, res, next) => {
    const { page, limit, skip } = getPagination(req.query);

    const users = await prisma.user.findMany({
        where: {
            role: 'User', // Filter users where role is 'barber'
        },
        skip,
        take: limit,
        include: {
            // bookings: true,
            // barberReviews: true,
        },
    });

    const totalCount = await prisma.user.count();

    res.status(200).json({
        status: 'success',
        page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        data: users,
    });
});

// Admin: Get all bookings with pagination
exports.adminGetAllBookings = catchAsync(async (req, res, next) => {
    const { page, limit, skip } = getPagination(req.query);

    const bookings = await prisma.booking.findMany({
        skip: skip,
        take: limit,
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
            Date: 'asc', // Order bookings by date (ascending)
        },
    });

    res.status(200).json({
        status: 'success',
        results: bookings.length,
        data: bookings,
    });
});

// Admin: ban user
exports.banUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;

    // Update the user's `ban` column to true
    const user = await prisma.user.update({
        where: { id: +userId },
        data: { ban: true },
    });

    // Send a success response
    res.status(200).json({
        status: 'success',
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
        status: 'success',
        message: `User with ID ${userId} has been Unbanned.`,
        data: user,
    });
});
