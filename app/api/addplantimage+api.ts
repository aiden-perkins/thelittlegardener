import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { API_BASE_URL } from '@/lib/config';

export async function POST(request: Request): Promise<Response> {
  await dbConnect();
  
  try {
    const formData = await request.formData();
    
    const userID = formData.get('userID') as string | null;
    const plantName = formData.get('plantName') as string | null;
    const imageFile = formData.get('image') as File | null;
    
    if (!userID || !plantName || !imageFile) {
      return Response.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find user and their plant
    const user = await User.findOne({ username: userID });
    if (!user) {
      return Response.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    const plantIndex = user.gardenItems.findIndex(
      (plant: any) => plant.custom_name === plantName
    );
    
    if (plantIndex === -1) {
      return Response.json(
        { success: false, message: 'Plant not found in user garden' },
        { status: 404 }
      );
    }
    
    // Create a unique filename for the image
    const timestamp = Date.now();
    const filename = `plant_${timestamp}_${plantName.replace(/\s+/g, '_')}.jpg`;
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'plants');
    await mkdir(uploadDir, { recursive: true });
    
    // Save the file
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const imagePath = path.join(uploadDir, filename);
    await writeFile(imagePath, buffer);
    
    // Create the public URL for the image
    const imageUrl = `${API_BASE_URL}/uploads/plants/${filename}`;
    
    // Add image to the plant's images array
    user.gardenItems[plantIndex].plantImages.push({ image_url: imageUrl });
    await user.save();
    
    return Response.json(
      {
        success: true,
        message: 'Image added to plant successfully',
        imageUrl: imageUrl
      },
      { status: 200 }
    );
    
  } catch (error: any) {
    console.error("Add Plant Image API Error:", error);
    return Response.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
