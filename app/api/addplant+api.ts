import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function POST(request: Request): Promise<Response> {
  await dbConnect();

  try {
    const formData = await request.formData();

    const username = formData.get('username') as string | null;
    const customName = formData.get('custom_name') as string | null;
    const plantIdStr = formData.get('plantId') as string | null;
    const location = formData.get('location') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!username || !customName || !plantIdStr) {
      return Response.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const plantId = parseInt(plantIdStr);
    if (isNaN(plantId)) {
      return Response.json(
        { success: false, message: 'Invalid plant ID' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return Response.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const newPlantEntry = {
      custom_name: customName,
      plantId: plantId,
      location: location,
      notes: notes,
      plantImages: [] as { image_url: string }[]
    };

    user.gardenItems.push(newPlantEntry);
    await user.save();

    return Response.json(
      {
        success: true,
        message: 'Plant added to garden successfully',
        plant: newPlantEntry
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Add Plant API Error:", error);
    return Response.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
