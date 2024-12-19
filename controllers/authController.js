const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { PrismaClient } = require("@prisma/client");
const { promisify } = require("util");
const crypto = require("crypto");
const sendEmail = require("../utils/email");
// const accountSid =process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN ;
// const client =  require('twilio')(accountSid, authToken);
const prisma = new PrismaClient();
const signToken = (id) => {
    return jwt.sign({ id }, "secret");
};
exports.register = catchAsync(async (req, res, next) => {
    // If a file is uploaded, save the file path relative to the 'public' folder
    // const photo = req.file ? `/users/${req.file.filename}` : null; // Path to the uploaded file
    // const photo = req.file ? req.file.location : null;  // DigitalOcean Spaces provides a 'location' with the file URL

    const photo = req.file ? req.file.location : null; // Use location if uploading to S3/DigitalOcean Spaces

    if (!photo) {
        return next(new AppError("No photo uploaded!", 400));
    }

    const { email, password, ...otherDetails } = req.body;
    if (!email || !password) {
        return next(new AppError("email and password are required!", 400));
    }
    var exist;
    if (isNaN(email)) {
        exist = await prisma.user.findUnique({
            where: {
                email: email,
            },
        });
    } else {
        exist = await prisma.user.findUnique({
            where: {
                phoneNumber: email,
            },
        });
    }

    if (exist) {
        return next(new AppError("email already exists!", 400));
    }
    const hash = await bcrypt.hash(password, 12);
    var user;
    if (isNaN(email)) {
        user = await prisma.user.create({
            data: {
                photo,
                email: email,
                password: hash,
                ...otherDetails,
            },
        });
    } else {
        user = await prisma.user.create({
            data: {
                photo,
                phoneNumber: email,
                password: hash,
                ...otherDetails,
            },
        });
    }

    await generateAndSendOTP(
        email,
        user.id,
        user.name,
        "Here is your OTP to Verfiy"
    );
    res.status(200).json({
        user,
    });
});
exports.getMe = catchAsync(async (req, res, next) => {
    const user = await prisma.user.findUnique({
        where: {
            id: req.user.id,
        },
    });
    res.status(200).json({
        user,
    });
});
exports.changePassword = catchAsync(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    let user = await prisma.user.findUnique({
        where: {
            id: req.user.id,
        },
    });
    if (!user || !bcrypt.compare(oldPassword, user.password)) {
        return next(new AppError("Wrong data Sent!", 400));
    }
    const hash = bcrypt.hash(newPassword, 12);
    user = await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            password: hash,
        },
    });
    res.status(200).json({
        user,
    });
});
const generateAndSendOTP = async (email, userId, name, message) => {
    const otp = generateOTP();
    message = message + " " + otp;
    await saveOTP(userId, otp); // Save OTP to the database.
    // test

    await sendOTP(email, name, message);

    // if (isNaN(email)) {
    //     await sendOTP(email, message); // Send email if input is not numeric.
    // } else {
    //     await sendPhoneOTP(email, message); // Otherwise, send SMS (if enabled).
    // }
    console.log("OTP sent to", email, otp);
};
const generateOTP = () => {
    const otp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP
    // const otp = "123456"  // delete it in production
    return otp;
};

// test this func
const sendOTP = async (email, name, message) => {
    try {
        await sendEmail({
            email: email,
            subject: "your OTP (valid for 30 min)",
            name: name,
            message,
        });
    } catch (err) {
        console.log(err);
    }
};
// const sendPhoneOTP = async(phone,message)=>{
//     try {
//         const res  = await client.messages.create({
//             body: `${message}`,
//             to: `+${phone}`,
//             from: '+965 6663 4112'
//         })
//         console.log(res);
//     } catch (error) {
//         console.log(error);
//     }
// }
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new AppError("username and password are required!", 400));
    }
    var user;
    if (isNaN(email)) {
        user = await prisma.user.findUnique({
            where: {
                email: email,
            },
        });
    } else {
        user = await prisma.user.findUnique({
            where: {
                phoneNumber: email,
            },
        });
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new AppError("incorrect data send!", 403));
    }
    if (user.status === "Pending") {
        await generateAndSendOTP(email, user.id, "Here is your OTP to Verfiy");
        return next(new AppError("please verify otp!", 403));
    }
    const token = signToken(user.id);
    res.status(200).json({
        user,
        token,
    });
});
exports.isLoggedIn = catchAsync(async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
    }
    if (!token) {
        return next(new AppError("Please Log in first", 403));
    }
    const decoded = await promisify(jwt.verify)(token, "secret");
    const freshUser = await prisma.user.findUnique({
        where: {
            id: decoded.id,
        },
    });
    if (!freshUser) {
        return next(
            new AppError("the user with this token does no longer exist", 403)
        );
    }
    console.log(freshUser);
    req.user = freshUser;
    next();
});
exports.checkPackage = catchAsync(async (req, res, next) => {
    const user = await prisma.user.findUnique({
        where: {
            id: +req.user.id,
        },
        include: {
            barberPackage: true,
        },
    });
    if (user.role === "User" || user.role === "Admin") {
        next();
    }
    if (user.packagePurchasedDate && user.barberPackageId) {
        const currentDate = new Date();

        switch (user.barberPackage.duration) {
            case "Annually":
                if (
                    currentDate >
                    new Date(user.packagePurchasedDate).setFullYear(
                        user.packagePurchasedDate.getFullYear() + 1
                    )
                ) {
                    await prisma.user.update({
                        where: {
                            id: +user.id,
                        },
                        data: {
                            packagePurchasedDate: null,
                            barberPackage: null,
                            barberPackageId: null,
                        },
                    });
                    return next(new AppError("Package Expired", 400));
                }
                break;
            case "Monthly":
                if (
                    currentDate >
                    new Date(user.packagePurchasedDate).setMonth(
                        user.packagePurchasedDate.getMonth() + 1
                    )
                ) {
                    await prisma.user.update({
                        where: {
                            id: +user.id,
                        },
                        data: {
                            packagePurchasedDate: null,
                            barberPackage: null,
                            barberPackageId: null,
                        },
                    });
                    return next(new AppError("Package Expired", 400));
                }
                break;
            default:
                next();
                break;
        }
    } else {
        return next(new AppError("No Package Found", 400));
    }
    next();
});
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError("you dont have permission for this action!", 403)
            );
        }
        next();
    };
};
exports.forgetPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    var user;
    if (isNaN(email)) {
        user = await prisma.user.findUnique({
            where: {
                email: email,
            },
        });
    } else {
        user = await prisma.user.findUnique({
            where: {
                phoneNumber: email,
            },
        });
    }

    if (!user) {
        return next(new AppError("there is no user with this email!", 404));
    }
    await generateAndSendOTP(
        email,
        user.id,
        "Here is your OTP to reset password"
    );
    res.status(200).json({
        message: "check your mail!",
    });
});
exports.resetPassword = catchAsync(async (req, res, next) => {
    const { email, otp, password } = req.body;
    var user;
    if (isNaN(email)) {
        user = await prisma.user.findUnique({
            where: {
                email,
            },
        });
    } else {
        user = await prisma.user.findUnique({
            where: {
                phoneNumber: email,
            },
        });
    }

    if (!user) {
        return next(new AppError("OTP is invalid or has expired.", 400));
    }
    const isMatch = await bcrypt.compare(otp, user.OTP);

    if (!isMatch) {
        return next(new AppError("OTP is incorrect.", 400));
    }
    const hash = await bcrypt.hash(password, 12);

    user = await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            password: hash,
            OTP: null,
        },
    });
    const token = signToken(user.id);
    res.status(200).json({
        message: "password changed successfully.",
        token,
    });
});
const saveOTP = async (userId, otp) => {
    try {
        const hashedOTP = await bcrypt.hash(otp, 10); // Hash OTP with a salt round of 10
        const user = await prisma.user.update({
            where: {
                id: +userId,
            },
            data: {
                OTP: hashedOTP,
            },
        });

        return user;
    } catch (error) {
        console.log(error);
    }
};

exports.verifyOTP = catchAsync(async (req, res, next) => {
    const { email, otp } = req.body;

    var user;
    if (isNaN(email)) {
        user = await prisma.user.findUnique({
            where: {
                email,
            },
        });
    } else {
        user = await prisma.user.findUnique({
            where: {
                phoneNumber: email,
            },
        });
    }

    if (!user) {
        return next(new AppError("OTP is invalid or has expired.", 400));
    }
    const isMatch = await bcrypt.compare(otp, user.OTP);

    if (!isMatch) {
        return next(new AppError("OTP is incorrect.", 400));
    }

    user = await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            OTP: null,
            status: "Verifed",
        },
    });
    const token = signToken(user.id);
    res.status(200).json({
        message: "OTP verified successfully.",
        token,
    });
});
