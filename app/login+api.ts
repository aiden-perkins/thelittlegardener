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
    
    if (!user) {
      return Response.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return Response.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'Login successful',
        user: { id: user._id, username: user.username }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Login API Error:", error);
    return Response.json(
      { success: false, message: 'Server error during login' },
      { status: 500 }
    );
  }
}
