import dbConnect, {closeConnection} from '@/lib/dbConnect';
import User from '@/models/User';

export async function POST(request: Request): Promise<Response> {
  await dbConnect();

  try {
    const formData = await request.formData();
    const username = formData.get('username') as string | null;

    if (!username) {
      return Response.json(
        { success: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username });
    
    if (!user) {
      return Response.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'Garden items retrieved successfully',
        gardenItems: user.gardenItems || []
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Garden Posts API Error:", error);
    return Response.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  } finally {
    closeConnection();
  }
}
