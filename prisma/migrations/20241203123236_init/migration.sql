-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('Admin', 'User', 'Barber') NOT NULL DEFAULT 'User',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('Verifed', 'Pending') NOT NULL DEFAULT 'Pending',
    `photo` VARCHAR(191) NOT NULL DEFAULT 'https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png',
    `barberPackageId` INTEGER NULL,
    `OTP` VARCHAR(191) NULL,
    `gender` ENUM('Male', 'Female') NOT NULL DEFAULT 'Male',

    UNIQUE INDEX `user_id_key`(`id`),
    UNIQUE INDEX `user_email_key`(`email`),
    UNIQUE INDEX `user_phoneNumber_key`(`phoneNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `barberStoreId` INTEGER NOT NULL,

    UNIQUE INDEX `favorite_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `barber_service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `barberStoreId` INTEGER NULL,
    `serviceName` VARCHAR(191) NOT NULL,
    `price` DECIMAL(65, 30) NOT NULL,

    UNIQUE INDEX `barber_service_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NULL,
    `serviceId` INTEGER NULL,

    UNIQUE INDEX `booking_services_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `barberStore` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `desc` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `lat` DECIMAL(65, 30) NOT NULL,
    `lng` DECIMAL(65, 30) NOT NULL,
    `photo` VARCHAR(191) NULL DEFAULT 'https://uxwing.com/wp-content/themes/uxwing/download/beauty-fashion/hair-salon-icon.png',
    `barberType` ENUM('Male', 'Female', 'Kids', 'Makeup') NOT NULL DEFAULT 'Male',
    `startTime` VARCHAR(191) NOT NULL DEFAULT '8 AM',
    `endTime` VARCHAR(191) NOT NULL DEFAULT '9 PM',
    `barberServiceTime` DECIMAL(65, 30) NOT NULL DEFAULT 1,
    `rating` DECIMAL(65, 30) NOT NULL DEFAULT 5,

    UNIQUE INDEX `barberStore_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `barberStorePhoto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `photoUrl` VARCHAR(191) NOT NULL,
    `barberStoreId` INTEGER NOT NULL,

    UNIQUE INDEX `barberStorePhoto_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `photo` VARCHAR(191) NULL,

    UNIQUE INDEX `packages_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `barberStoreId` INTEGER NOT NULL,
    `Date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('Booked', 'Waiting', 'InProcess', 'Finished', 'Canceled') NOT NULL DEFAULT 'Booked',
    `paymentType` ENUM('Cash', 'Card') NOT NULL DEFAULT 'Cash',
    `rating` INTEGER NULL,
    `ratingDesc` VARCHAR(191) NULL,

    UNIQUE INDEX `booking_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_barberPackageId_fkey` FOREIGN KEY (`barberPackageId`) REFERENCES `packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite` ADD CONSTRAINT `favorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite` ADD CONSTRAINT `favorite_barberStoreId_fkey` FOREIGN KEY (`barberStoreId`) REFERENCES `barberStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `barber_service` ADD CONSTRAINT `barber_service_barberStoreId_fkey` FOREIGN KEY (`barberStoreId`) REFERENCES `barberStore`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_services` ADD CONSTRAINT `booking_services_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_services` ADD CONSTRAINT `booking_services_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `barber_service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `barberStore` ADD CONSTRAINT `barberStore_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `barberStorePhoto` ADD CONSTRAINT `barberStorePhoto_barberStoreId_fkey` FOREIGN KEY (`barberStoreId`) REFERENCES `barberStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `booking_barberStoreId_fkey` FOREIGN KEY (`barberStoreId`) REFERENCES `barberStore`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
