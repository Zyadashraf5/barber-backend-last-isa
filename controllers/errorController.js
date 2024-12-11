module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";
    if (err.code === 11000) {
        err.message = "This email is already exists.";
        err.statusCode = 409;
    }
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
    });
    next();
};
