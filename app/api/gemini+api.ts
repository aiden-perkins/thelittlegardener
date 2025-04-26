import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("API Route Error: GEMINI_API_KEY environment variable not set.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" }) : null;

const generationConfig = {
    temperature: 0.4,
    topP: 1,
    topK: 32,
    maxOutputTokens: 4096,
    // responseMimeType: "application/json", // Uncomment if needed
};


export async function POST(request: Request): Promise<Response> {

    if (!geminiModel) {
         console.error("API Route Error: Gemini model not initialized (check API key).");
         return Response.json(
            { success: false, message: 'Internal server configuration error.' },
            { status: 500 }
        );
    }

    try {
        const formData = await request.formData();

        
        const imageValue = formData.get('image'); // Get the value without immediate casting
        const prompt = formData.get('prompt') as string | null;
        
        if (!imageValue || typeof imageValue === 'string') {
            return Response.json({ success: false, message: 'No valid image file provided.' }, { status: 400 });
        }
        if (!prompt) {
            return Response.json({ success: false, message: 'Prompt is required.' }, { status: 400 });
        }
        
        const imageBlob = imageValue as Blob;
        
        console.log("API Route: Received image candidate:", {
            name: (imageBlob as any).name, // Access name if available (File property)
            type: imageBlob.type,
            size: imageBlob.size
        });
        console.log("API Route: Blob constructor name:", imageBlob.constructor?.name);
        
        
        let imageBuffer: ArrayBuffer;
        try {
             imageBuffer = await imageBlob.arrayBuffer();
        } catch (bufferError: any) {
             console.error("API Route Error: Failed to get arrayBuffer from image Blob:", bufferError);
             console.error("imageBlob details:", imageBlob);
             return Response.json(
                { success: false, message: 'Internal server error reading image data.', error: bufferError.message },
                { status: 500 }
             );
        }
        
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: imageBlob.type || 'application/octet-stream', // Fallback needed
            },
        };
        const parts = [
            { text: prompt },
            imagePart,
        ];
        
        console.log("API Route: Sending request to Gemini...");
        const result = await geminiModel.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig,
        });
        console.log("API Route: Received response from Gemini.");

        const geminiResponse = result.response;

         if (!geminiResponse || !geminiResponse.candidates || geminiResponse.candidates.length === 0) {
             console.error("API Route: Gemini Response Issue:", geminiResponse);
             const blockReason = geminiResponse?.promptFeedback?.blockReason || 'Unknown reason or no content';
             return Response.json(
                { success: false, message: `Gemini did not return valid content. Reason: ${blockReason}` },
                { status: 502 } // Bad Gateway might be appropriate
             );
        }

        const geminiOutputText = geminiResponse.text();

        return Response.json(
            {
                success: true,
                message: 'Image processed successfully by Gemini.',
                data: {
                    geminiResponse: geminiOutputText,
                    receivedPrompt: prompt,
                }
            },
            { status: 200 } // Explicitly set 200 OK status
        );

    } catch (error: any) {
        console.error('API Route: Error processing image with Gemini:', error);
        return Response.json(
            { success: false, message: 'Internal server error.', error: error.message },
            { status: 500 }
        );
    }
}
