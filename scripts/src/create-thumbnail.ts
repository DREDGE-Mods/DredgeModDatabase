import sharp from "sharp";
import fs, { promises as fsp } from "fs";
import path from "path";

// Adapted from the Outer Wilds Mod Database

export const thumbnailSize = {
    width: 400,
    height: 200,
  } as const;

export async function generateModThumbnail(
    slug: string,
    imageUrl : string
  ): Promise<string> {
    if (!imageUrl) {
        return ""
    }
  
    const rawImageFilePath = await downloadImage(imageUrl, slug);
  
    if (rawImageFilePath == null) {
      console.log(`Failed to download image ${imageUrl} for ${slug}`);
      return "";
    }
  
    const fileOutputDir = getPath("thumbnails");
  
    if (!fs.existsSync(fileOutputDir)) {
      await fsp.mkdir(fileOutputDir, { recursive: true });
    }
  
    const sharpImage = sharp(rawImageFilePath, {
      animated: true,
      limitInputPixels: false,
    });
  
    const metadata = await sharpImage.metadata();
  
    const mainImageName = `${slug}.webp`;
    writeImageFile(sharpImage, metadata, path.join(fileOutputDir, mainImageName));
  
    return mainImageName
  }

  const writeImageFile = (
    sharpImage: sharp.Sharp,
    metadata: sharp.Metadata,
    filePath: string
  ) => {
    if (!metadata.width || !metadata.height) {
      console.error(
        `Failed to write image file "${filePath}". Missing metadata values.`
      );
      return;
    }
  
    const imageRatio = metadata.width / metadata.height;
    const desiredRatio = thumbnailSize.width / thumbnailSize.height;
  
    return sharpImage
      .resize({
        ...thumbnailSize,
        fit: "inside",
      })
      .webp({ smartSubsample: true })
      .toFile(filePath);
  };

export async function downloadImage(
    imageUrl: string,
    fileName: string
  ): Promise<string | null> {
    const response = await fetch(imageUrl);
  
    if (!response.ok) {
      return null;
    }
  
    const temporaryDirectory = "tmp/raw-thumbnails";
  
    if (!fs.existsSync(temporaryDirectory)) {
      await fsp.mkdir(temporaryDirectory, { recursive: true });
    }
  
    const relativeImagePath = `${temporaryDirectory}/${fileName}`;
    const fullImagePath = getPath(relativeImagePath);
  
    const image = await response.arrayBuffer();
    await fsp.writeFile(fullImagePath, Buffer.from(image));
  
    return fullImagePath;
  }

  function getPath(relativePath: string) {
    return path.join(process.cwd(), relativePath);
  }