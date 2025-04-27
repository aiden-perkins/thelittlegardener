import { FileDataPart, GoogleGenerativeAI } from '@google/generative-ai';
import { readFile } from 'fs/promises';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_PLANTS_FILE_URI = 'https://generativelanguage.googleapis.com/v1beta/files/t8vox35gpwgp';

if (!GEMINI_API_KEY) {
  console.error("API Route Error: GEMINI_API_KEY environment variable not set.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" }) : null;

const generationConfig = {
    temperature: 0.4,
    topP: 1,
    topK: 32,
    maxOutputTokens: 10000,
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
        
        const imageValue = formData.get('image');
        const basePrompt = `
        You are a plant identification assistant for a gardening app called "The Little Gardener". 
        I will send you an image of a plant. Please analyze it and identify the most likely plant species from the provided database.
        
        IMPORTANT: Your response must be strictly in the following JSON format:
        {
          "identifiedPlant": {
            "id": number,
            "name": string,
            "scientific_name": string,
            "family": string,
            "confidence": number (between 0-1)
          },
          "alternatives": [
            {
              "id": number,
              "name": string,
              "scientific_name": string,
              "confidence": number (between 0-1)
            }
          ],
          "notes": string (any useful information about the identification)
        }
        
        You MUST ONLY select plants from the database provided below. Do not invent new plants or data.
        If you're unsure, provide the closest match but indicate lower confidence.
        
        Database uri: ${GEMINI_PLANTS_FILE_URI}
        `;
        
        if (!imageValue || typeof imageValue === 'string') {
            return Response.json({ success: false, message: 'No valid image file provided.' }, { status: 400 });
        }
        
        const imageBlob = imageValue as Blob;
        
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
                mimeType: imageBlob.type || 'application/octet-stream',
            },
        };
        
        // Doesnt work
        // const databaseFilePart: FileDataPart = {
        //     fileData: {
        //         mimeType: 'application/json',
        //         fileUri: GEMINI_PLANTS_FILE_URI
        //     }
        // };
        
        const parts = [
            { text: basePrompt },
            imagePart,
            // databaseFilePart
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
                { status: 502 } // Bad Gateway might be appropriate
             );
        }

        const geminiOutputText = geminiResponse.text();
        
        // Add this parsing logic:
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(geminiOutputText);
            
            // Validate the structure of the parsed JSON
            if (!parsedResponse.identifiedPlant || !parsedResponse.identifiedPlant.id) {
                throw new Error("Response missing required plant identification data");
            }
            
            return Response.json(
                {
                    success: true,
                    message: 'Plant identified successfully by Gemini.',
                    data: {
                        identifiedPlant: parsedResponse.identifiedPlant,
                        alternatives: parsedResponse.alternatives || [],
                        notes: parsedResponse.notes || ""
                    }
                },
                { status: 200 }
            );
        } catch (parseError) {
            console.error("Failed to parse Gemini response as JSON:", parseError);
            return Response.json(
                { 
                    success: false, 
                    message: 'Failed to process plant identification result.', 
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
