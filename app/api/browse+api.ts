import { readFile } from 'fs/promises';
import path from 'path';

const TOTAL_PAGES = 337;

interface Plant {
  id: number;
  name: string;
  scientific_name: string | null;
  family: string | null;
  image_url: string | null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const pageParam = formData.get('page') as string | null;
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    if (isNaN(page) || page < 1 || page > TOTAL_PAGES) {
      return Response.json(
        { success: false, message: `Invalid page number. Must be between 1 and ${TOTAL_PAGES}.` },
        { status: 400 }
      );
    }

    const dataDirectory = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDirectory, `plant_${page}.json`);

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const jsonData: Plant[] = JSON.parse(fileContent);

      return Response.json(
        {
          success: true,
          message: `Page ${page} browse successful`,
          plants: jsonData,
          currentPage: page,
          hasMorePages: page < TOTAL_PAGES,
        },
        { status: 200 }
      );
    } catch (fileError: any) {
      console.error(`Error reading file ${filePath}:`, fileError);

      if (fileError.code === 'ENOENT') {
        return Response.json(
          { success: false, message: `Page data file not found for page ${page}.` },
          { status: 404 }
        );
      } else {
         return Response.json(
           { success: false, message: `Error reading or parsing page ${page} data.` },
           { status: 500 }
         );
      }
    }
  } catch (error) {
    console.error("Browse API Error:", error);
    return Response.json(
      { success: false, message: 'Server error during browse request.' },
      { status: 500 }
    );
  }
}
