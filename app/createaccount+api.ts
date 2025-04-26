import bcrypt from 'bcryptjs';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';

export async function POST(request: Request): Promise<Response> {
  await dbConnect();

  try {
    const formData = await request.formData();
    
    const username = formData.get('username') as string | null;
    const password = formData.get('password') as string | null;

    if (!username || !password) {
      return Response.json(
        { success: false, message: 'Please provide username and password' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username }).select('+password');

    if (user) {
      return Response.json(
        { success: false, message: 'That username is taken already!' },
        { status: 401 }
      );
    }

    const result = await User.insertOne({ username: username, password: password});
    
    return Response.json(
      {
        success: true,
        message: 'Account creation successful!',
        user: { username: result.username }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Account creation API Error:", error);
    return Response.json(
      { success: false, message: 'Server error during account creation' },
      { status: 500 }
    );
  }
}
