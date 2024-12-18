const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.changeBookingStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await prisma.booking.update({
        where: {
            id: +id,
        },
        data: {
            status: status,
        },
    });
    res.status(200).json({
        booking,
    });
});
exports.getStoreById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const store = await prisma.barberStore.findUnique({
        where: {
            id: +id,
        },
        include: {
            barber_service: true,
            user: true,
            booking: {
                include: {
                    user: true,
                    booking_services: true,
                },
            },
            barberStorePhotos: true, // Include the photos
        },
    });
    res.status(200).json({
        store,
    });
});

exports.getMyStores = catchAsync(async (req, res, next) => {
    const stores = await prisma.barberStore.findMany({
        where: {
            userId: +req.user.id,
        },
        include: {
            barber_service: true, // Include barber services associated with the store
            barberStorePhotos: true, // Include photos associated with the store
            booking: {
                where: {
                    status: {
                        not: "Finished",
                    },
                },
                include: {
                    user: true, // Include the user who made the booking
                    booking_services: {
                        include: {
                            service: true, // Include the service details for the booking
                        },
                    },
                },
                orderBy: {
                    Date: "asc", // Order the bookings by date in ascending order
                },
            },
        },
    });

    // Optionally, log the stores to inspect the result
    console.log(stores);

    // Return the stores along with their associated barberStorePhotos
    res.status(200).json({
        stores,
    });
});

exports.getActiveStoreBookings = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const bookings = await prisma.booking.findMany({
        where: {
            barberStoreId: +id,
            status: {
                notIn: ["Finished", "Canceled"],
            },
        },
        include: {
            user: true,
            booking_services: {
                include: {
                    service: true,
                },
            },
        },
    });
    res.status(200).json({
        bookings,
    });
});
exports.getStoreBookings = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const bookings = await prisma.booking.findMany({
        where: {
            barberStoreId: +id,
        },
        include: {
            user: true,
        },
    });
    res.status(200).json({
        bookings,
    });
});
exports.createServices = catchAsync(async (req, res, next) => {
    let { services } = req.body; // [ {name : , price : },{name : , price : }]
    console.log(req.body);
    services = JSON.parse(services);
    const servicesId = [];
    await services.forEach(async (service) => {
        const serviceD = await prisma.barber_service.create({
            data: {
                price: +service.price,
                serviceName: service.name,
            },
        });
        servicesId.push(serviceD.id);
    });
    req.serviceId = servicesId;
    next();
    console.log("");
});
exports.createStore = catchAsync(async (req, res, next) => {
    const servicesId = req.serviceId;
    req.body.services = undefined;

    // Handle the photo upload and limit the number of photos to 10
    // const photos = req.files ? req.files.slice(0, 10).map(file => `/photos/${file.filename}`) : [];
    const photos = req.files
        ? req.files.slice(0, 10).map((file) => file.location)
        : [];
    console.log(req.files);

    console.log(photos);

    req.body.photos = undefined;
    // Create the store record
    const store = await prisma.barberStore.create({
        data: {
            userId: req.user.id,
            photo: photos[0] || null, // Set the first photo as the main photo
            ...req.body,
        },
    });
    console.log(store);
    // Save additional photos to barberStorePhotos (limit to 10)
    await Promise.all(
        photos.map(async (photoUrl) => {
            await prisma.barberStorePhoto.create({
                data: {
                    photoUrl,
                    barberStoreId: store.id,
                },
            });
        })
    );

    // Fetch the barber store and associated photos to include in the response
    const storeWithPhotos = await prisma.barberStore.findUnique({
        where: { id: store.id },
        include: {
            barberStorePhotos: true, // Include the photos associated with the store
            barber_service: true,
        },
    });
    console.log(storeWithPhotos);

    // Update services if necessary
    await Promise.all(
        servicesId.map(async (id) => {
            await prisma.barber_service.update({
                where: { id: +id },
                data: { barberStoreId: store.id },
            });
        })
    );

    // Send the response including the store and its associated photos
    res.status(201).json({
        store: storeWithPhotos, // The store with the associated barberStorePhotos
    });
});
exports.switchStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const store = await prisma.barberStore.update({
        where: {
            id: +id,
        },
        data: {
            status: req.body.status,
        },
    });
    res.status(200).json({
        status: req.body.status,
    });
});

// exports.createStore = catchAsync(async (req, res, next) => {
//     const servicesId = req.serviceId; // Ensure this is being set correctly
//     req.body.services = undefined;

//     // Create the barber store
//     const store = await prisma.barberStore.create({
//         data: {
//             userId: req.user.id,
//             ...req.body,
//         },
//     });

//     // Check if servicesId is an array and iterate over it
//     if (Array.isArray(servicesId) && servicesId.length > 0) {
//         await Promise.all(
//             servicesId.map(async (id) => {
//                 await prisma.barber_service.update({
//                     where: { id: +id },
//                     data: { barberStoreId: store.id },
//                 });
//             })
//         );
//     }

//     res.status(201).json({
//         store,
//     });
// });

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
exports.getAllBarbers = catchAsync(async (req, res, next) => {
    let { type, nearest, farthest, lat, lng, services } = req.query;
    if (services !== undefined) {
        services = services.split(",");
    } else {
        services = [];
    }
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const whereClause = {
        barberType: type || "Male",
    };

    if (services.length > 0) {
        whereClause.barber_service = {
            every: {
                serviceName: {
                    in: services,
                },
            },
        };
    }
    const barbers = await prisma.barberStore.findMany({
        where: whereClause,
        include: {
            barber_service: true,
            favorite: true,
            barberStorePhotos: true,
        },
        orderBy: {
            booking: {
                _count: "desc",
            },
        },
    });
    let barbersInRange;
    if (nearest && farthest) {
        const nearestDistance = parseFloat(nearest);
        const farthestDistance = parseFloat(farthest);
        barbersInRange = barbers.filter((barber) => {
            const distance = haversineDistance(
                userLat,
                userLng,
                barber.lat,
                barber.lng
            );
            barber.distance = distance;
            return distance >= nearestDistance && distance <= farthestDistance;
        });
    } else {
        barbersInRange = barbers;
    }
    barbersInRange = barbersInRange.map((barber) => {
        barber.isFavorite = barber.favorite.some(
            (fav) => fav.userId === req.user.id
        );
        return barber;
    });

    res.status(200).json({
        barbersInRange,
    });
});
exports.getAllServices = catchAsync(async (req, res, next) => {
    const services = await prisma.barber_service.findMany({});
    res.status(200).json({
        services,
    });
});
exports.getAllbooked = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const bookings = await prisma.booking.findMany({
        where: {
            barberStoreId: +id,
        },
        include: {
            user: {
                select: {
                    name: true,
                    gender: true,
                    photo: true,
                    phoneNumber: true,
                    email: true,
                },
            },
        },
    });
    res.status(200).json({
        bookings,
    });
});

// func to make barber choise his payment methos [cash, visa]
exports.changePaymentType = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const store = await prisma.barberStore.update({
        where: {
            id: +id,
        },
        data: {
            paymentType: req.body.paymentType,
        },
    });
    res.status(200).json({
        store,
    });
});
