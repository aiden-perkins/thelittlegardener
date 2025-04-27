
import { GoogleGenerativeAI } from '@google/generative-ai';
import { API_BASE_URL } from '@/lib/config';

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
  responseMimeType: "application/json",
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
    
    const imageUrl = formData.get('imageUrl') as string;
    const plantName = formData.get('plantName') as string;
    const plantType = formData.get('plantType') as string;
    
    if (!imageUrl) {
      return Response.json({ success: false, message: 'No image URL provided.' }, { status: 400 });
    }
    
    // Fetch the image server-side (no CORS issues here)
    let imageResponse;
    try {
      imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        return Response.json({ 
          success: false, 
          message: `Failed to fetch image from URL: ${imageResponse.statusText}` 
        }, { status: 400 });
      }
    } catch (fetchError: any) {
      return Response.json({ 
        success: false, 
        message: `Error fetching image from URL: ${fetchError.message}` 
      }, { status: 400 });
    }
    
    // Get the image as a blob
    const imageBlob = await imageResponse.blob();
    
    const basePrompt = `
      You are a plant health expert for the gardening app "The Little Gardener". I'm sending you an image of a plant named "${plantName}" (which appears to be a "${plantType}" type of plant).
      
      Please analyze the plant's health and provide a detailed assessment including:
      
      1. Overall health status (Healthy, Needs attention, or Unhealthy)
      2. Identification of any visible issues (yellowing, browning, spots, wilting, etc.)
      3. Possible causes for any issues detected (pests, diseases, watering problems, nutrient deficiencies)
      4. Recommendations for care and treatment

      IMPORTANT: Your response must be in the following JSON format:
      {
        "healthStatus": string (one of: "Healthy", "Needs attention", "Unhealthy"),
        "summary": string (brief 1-2 sentence overview),
        "observations": [string] (array of specific observations about the plant's appearance),
        "issues": [
          {
            "issue": string (name of issue),
            "description": string (brief description),
            "severity": string (one of: "Mild", "Moderate", "Severe"),
            "causes": [string] (potential causes)
          }
        ],
        "recommendations": [string] (specific actionable care tips),
        "generalCare": {
          "watering": string (watering advice),
          "light": string (light requirements),
          "soil": string (soil recommendations)
        }
      }
      
      If the plant appears healthy, still provide care recommendations to maintain its health.
    `;
    
    // Convert the blob to base64
    const imageBuffer = await imageBlob.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: imageBlob.type || 'image/jpeg',
      },
    };
    
    const parts = [
      { text: basePrompt },
      imagePart,
    ];
    
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
    });

    const geminiResponse = result.response;

    if (!geminiResponse || !geminiResponse.candidates || geminiResponse.candidates.length === 0) {
      console.error("API Route: Gemini Response Issue:", geminiResponse);
      const blockReason = geminiResponse?.promptFeedback?.blockReason || 'Unknown reason or no content';
      return Response.json(
        { success: false, message: `Gemini did not return valid content. Reason: ${blockReason}` },
        { status: 502 }
      );
    }

    const geminiOutputText = geminiResponse.text();
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(geminiOutputText);
      
      // Validate the structure of the parsed JSON
      if (!parsedResponse.healthStatus || !parsedResponse.summary) {
        throw new Error("Response missing required health analysis data");
      }
      
      return Response.json(
        { 
          success: true, 
          message: 'Plant health analyzed successfully.',
          data: parsedResponse
        },
        { status: 200 }
      );
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);
      return Response.json(
        { 
          success: false, 
          message: 'Failed to process plant health analysis result.', 
          rawResponse: geminiOutputText 
        },
        { status: 422 }
      );
    }

  } catch (error: any) {
    console.error('API Route: Error processing image with Gemini:', error);
    return Response.json(
      { success: false, message: 'Internal server error.', error: error.message },
      { status: 500 }
    );
  }
}
