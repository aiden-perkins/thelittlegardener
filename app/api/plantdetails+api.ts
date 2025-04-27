import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

interface PlantDetailsResponse {
  id: number;
  common_name: string;
  scientific_name: string[];
  family: string;
  default_image?: {
    original_url: string;
  };
  sunlight: string[];
  pruning_month: string[];
  attracts: string[];
  flowering_season: string;
  description: string;
  xSunlightDuration: SunlightDuration;
}

interface SunlightDuration {
  min: string;
  max: string;
  unit: string;
}

interface PlantDetailsFormatted {
  name: string;
  imageUrl: string | null;
  scientificName: string | null;
  family: string | null;
  sunlight: string[];
  pruningMonth: string[];
  attracts: string[];
  floweringSeason: string;
  description: string;
  sunlightDuration: SunlightDuration;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const idStr = formData.get('id') as string | null;

    if (!idStr) {
      return Response.json(
        { success: false, message: 'Plant ID is required.' },
        { status: 400 }
      );
    }

    const id = parseInt(idStr, 10);
    
    if (isNaN(id)) {
      return Response.json(
        { success: false, message: 'Invalid plant ID.' },
        { status: 400 }
      );
    }

    // Check for cached data first
    const cacheDir = path.join(process.cwd(), 'cache', 'plant-details');
    const cacheFilePath = path.join(cacheDir, `${id}.json`);
    
    let plantDetails: PlantDetailsFormatted;

    // Try to get data from cache
    try {
      if (existsSync(cacheFilePath)) {
        // Read from cache if it exists
        const cachedContent = await readFile(cacheFilePath, 'utf-8');
        plantDetails = JSON.parse(cachedContent);
        
        return Response.json(
          {
            success: true,
            message: 'Plant details retrieved from cache',
            data: plantDetails
          },
          { status: 200 }
        );
      }
    } catch (cacheError) {
      // If there's an error reading the cache, we'll fetch from API
      console.warn(`Failed to read cache for plant ${id}:`, cacheError);
    }

    // If we got here, we need to fetch from the API
    const PERENUAL_TOKEN = process.env.PERENUAL_TOKEN;
    
    if (!PERENUAL_TOKEN) {
      return Response.json(
        { success: false, message: 'API configuration error.' },
        { status: 500 }
      );
    }

    const apiUrl = `https://perenual.com/api/v2/species/details/${id}?key=${PERENUAL_TOKEN}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      return Response.json(
        { 
          success: false, 
          message: `Failed to fetch plant details: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data: PlantDetailsResponse = await response.json();
    
    // Format the response to match our application needs
    plantDetails = {
      name: data.common_name || 'N/A',
      scientificName: data.scientific_name?.length ? data.scientific_name[0] : null,
      family: data.family || null,
      imageUrl: data.default_image?.original_url || null,
      sunlight: data.sunlight,
      pruningMonth: data.pruning_month,
      attracts: data.attracts,
      floweringSeason: data.flowering_season,
      description: data.description,
      sunlightDuration: data.xSunlightDuration
    };

    // Save to cache
    try {
      // Ensure cache directory exists
      await mkdir(cacheDir, { recursive: true });
      await writeFile(cacheFilePath, JSON.stringify(plantDetails), 'utf-8');
    } catch (cacheWriteError) {
      console.error(`Failed to write cache for plant ${id}:`, cacheWriteError);
      // We'll continue even if caching fails
    }

    return Response.json(
      {
        success: true,
        message: 'Plant details retrieved successfully',
        data: plantDetails
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Plant Details API Error:", error);
    return Response.json(
      { success: false, message: 'Server error during plant details request.' },
      { status: 500 }
    );
  }
}
