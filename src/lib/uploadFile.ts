import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

const getPublicIdFromUrl = (url: string) => {
  const parts = url.split("/");
  const fileName = parts[parts.length - 1]; // "abc123.jpg"
  const publicId = fileName.split(".")[0]; // "abc123"
  return publicId;
};

export async function deleteFileFromCloudinary(
  img: string[] | string
): Promise<boolean> {
  const images = Array.isArray(img) ? img : [img];
  try {
    for (const image of images) {
      const publicId = getPublicIdFromUrl(image);
      await cloudinary.uploader.destroy(publicId);
    }
    return true;
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    return false;
  }
}

export async function uploadFileToCloudinary(
  img: string[] | string
): Promise<string[] | false> {
  const images = Array.isArray(img) ? img : [img];
  let imageUrls: string[] = [];
  try {
    for (const image of images) {
      const result = await cloudinary.uploader.upload(image);
      imageUrls.push(result.secure_url);
    }
    return imageUrls;
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    return false;
  }
}
