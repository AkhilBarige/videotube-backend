// import { v2 as cloudinary } from "cloudinary"
// import fs from "fs"


// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });

// const uploadOnCloudinary = async (localFilePath) => {
//     try {
//         if (!localFilePath) return null
//         //upload the file on cloudinary
//         const response = await cloudinary.uploader.upload(localFilePath, {
//             resource_type: "auto"
//         })
//         // file has been uploaded successfull
//         //console.log("file is uploaded on cloudinary ", response.url);
//         fs.unlinkSync(localFilePath)
//         return response;

//     } catch (error) {
//         fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
//         return null;
//     }
// }



// export { uploadOnCloudinary }
import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"
import dotenv from "dotenv"


dotenv.config()


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_API_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    // secure_distribution: 'mydomain.com',
    // upload_prefix: 'https://api-eu.cloudinary.com'
});

const uploadOnCloud = async (localFilePath) => {
    try {
        if (!localFilePath || !fs.existsSync(localFilePath)) {
            console.warn("Upload skipped: file not found", localFilePath);
            return null;
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        console.log("Cloudinary response:", response.url);

        try {
            fs.unlinkSync(localFilePath);
        } catch (err) {
            console.warn("File cleanup failed:", err.message);
        }

        return response;
    } catch (error) {
        console.error("Cloudinary upload failed:", error.message);
        return null;
    }
};
const deletefromcloud = async (public_Id) => {
    try {
        const result = await cloudinary.uploader.destroy(public_Id)
        console.log(result, "succesfully deleted the file")
    } catch (error) {
        console.log(error, "error occured while deleting the file")
        return null
    }
}

export { uploadOnCloud, deletefromcloud }