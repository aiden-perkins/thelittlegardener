import dbConnect, {closeConnection} from '@/lib/dbConnect';
import User from '@/models/User';
import path from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

interface BotanicalDetails {
  name: string;
  scientificName: string | null;
  family: string | null;
  sunlight?: string[];
  watering?: string;
  floweringSeason?: string;
  nativeArea?: string;
  description?: string;
  imageUrl?: string;
}

export async function POST(request: Request): Promise<Response> {
  await dbConnect();

  try {
    const formData = await request.formData();
    const userID = formData.get('userID') as string | null;
    const plantName = formData.get('plantName') as string | null;

    if (!userID || !plantName) {
      return Response.json(
        { success: false, message: 'User ID and plant name are required' },
        { status: 400 }
      );
    }

    // Find the user and their specific plant
    const user = await User.findOne({ username: userID });
    
    if (!user) {
      return Response.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Find the specific plant by custom_name
    const userPlant = user.gardenItems.find(
      (item: any) => item.custom_name === plantName
    );

    if (!userPlant) {
      return Response.json(
        { success: false, message: 'Plant not found in user\'s garden' },
        { status: 404 }
      );
    }

    // Now fetch botanical details from cache if available
    const plantId = userPlant.plantId;
    let botanicalDetails: BotanicalDetails | null = null;

    // Check the cache for plant details
    const cacheDir = path.join(process.cwd(), 'cache', 'plant-details');
    const cacheFilePath = path.join(cacheDir, `${plantId}.json`);
    
    if (existsSync(cacheFilePath)) {
      try {
        const cachedContent = await readFile(cacheFilePath, 'utf-8');
        const cachedData = JSON.parse(cachedContent);
        
        botanicalDetails = {
          name: cachedData.name || 'N/A',
          scientificName: cachedData.scientificName || null,
          family: cachedData.family || null,
          sunlight: cachedData.sunlight || [],
          watering: determineWateringInfo(cachedData),
          floweringSeason: cachedData.floweringSeason || null,
          nativeArea: cachedData.origin || null,
          description: cachedData.description || null,
          imageUrl: cachedData.imageUrl || null
        };
      } catch (cacheError) {
        console.error(`Error reading plant cache for ID ${plantId}:`, cacheError);
        // Continue with null botanicalDetails if cache can't be read
      }
    }

    // Combine user's plant data with botanical details
    const combinedPlantData = {
      ...userPlant.toObject(),
      botanicalDetails
    };

    return Response.json(
      {
        success: true,
        message: 'Plant details retrieved successfully',
        data: combinedPlantData
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("My Plant Details API Error:", error);
    return Response.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  } finally {
    closeConnection();
  }
}

// Helper function to determine watering info from various fields
function determineWateringInfo(plantData: any): string {
  if (!plantData) return 'as needed';
  
  // Start with basic watering frequency if available
  let wateringInfo = plantData.watering || '';
  
  // Add watering benchmark if available
  if (plantData.watering_general_benchmark) {
    const benchmark = plantData.watering_general_benchmark;
    wateringInfo += ` (every ${benchmark.value} ${benchmark.unit})`;
  }
  
  // If we still have no info, provide a default based on plant type
  if (!wateringInfo) {
    return 'as needed based on soil moisture';
  }
  
  return wateringInfo;
}
