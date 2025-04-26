import { readFile } from 'fs/promises';
import path from 'path';

interface Plant {
    id: number;
    name: string;
    image_url: string | null;
    scientific_name: string | null;
    family: string | null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const query = formData.get('query') as string | null;

    if (!query || query.trim() === '') {
      return Response.json(
        { success: false, message: 'Search query cannot be empty.' },
        { status: 400 }
      );
    }

    const normalizedQuery = query.trim().toLowerCase();

    const assetsDirectory = path.join(process.cwd(), 'assets');
    const filePath = path.join(assetsDirectory, 'all_plants.json');

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const allPlants: Plant[] = JSON.parse(fileContent);

      const results = allPlants.filter(plant =>
        plant.name?.toLowerCase().includes(normalizedQuery)
      );

      return Response.json(
        {
          success: true,
          message: 'Search successful',
          plants: results
        },
        { status: 200 }
      );

    } catch (fileError: any) {
      console.error(`Error reading file ${filePath}:`, fileError);
      return Response.json(
        { success: false, message: 'Error reading plant data file.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Search API Error:", error);
    return Response.json(
      { success: false, message: 'Server error during search request.' },
      { status: 500 }
    );
  }
}
