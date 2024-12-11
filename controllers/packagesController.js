const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { PrismaClient } =require( '@prisma/client');
const prisma = new PrismaClient();
exports.buyPackage = catchAsync(async (req,res,next)=>{
    const {packageId} = req.body;
    await prisma.user.update({
        where:{
            id:req.user.id
        },
        data : {
            barberPackage:{
                connect : {
                    id : packageId
                }
            }
        }
    });

});
exports.getAllPackages = catchAsync(async (req,res,next)=>{
    const packages = await prisma.packages.findMany({});
    res.status(200).json({
        packages
    });
});
exports.createPackage = catchAsync(async (req, res, next) => {
    // If a file is uploaded, save the file path relative to the 'public' folder
    // const photo = req.file ? `/packages/${req.file.filename}` : null; // Save the path to the file
    const photo = req.file ? req.file.location : null; // Use location if uploading to S3/DigitalOcean Spaces

    // Convert the price to a float if it's a string
    const price = parseFloat(req.body.price);

    // Check if the price is a valid number
    if (isNaN(price)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid price value provided'
        });
    }

    const package = await prisma.packages.create({
        data: {
            photo,
            name: req.body.name,
            price: price // Ensure price is a float
        }
    });

    res.status(201).json({
        package
    });
});
