import React, { useState } from 'react';
import { Text, View, Button, Image, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const HARDCODED_PROMPT = "Tell me exactly what type of plant this is, only give me that and nothing else.";

export default function Index() {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }
    }

    try {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImage(result.assets[0]);
            setApiResponse(null); // Clear previous response
            setError(null);       // Clear previous error
        }
    } catch (pickError: any) {
        console.error("ImagePicker Error: ", pickError);
        setError(`Failed to pick image: ${pickError.message}`);
        setImage(null);
    }
  };

  const uploadImage = async () => {
    if (!image?.uri) {
      Alert.alert('No Image', 'Please select an image first.');
      return;
    }

    setIsLoading(true);
    setApiResponse(null);
    setError(null);

    const apiUrl = '/gemini'; // Relative path to your API route

    try {
      console.log("Fetching image URI:", image.uri);
      const fetchResponse = await fetch(image.uri);
      if (!fetchResponse.ok) {
          throw new Error(`Failed to fetch image file: ${fetchResponse.statusText} (status: ${fetchResponse.status})`);
      }
      const imageBlob = await fetchResponse.blob();
      console.log("Fetched image as Blob:", imageBlob.size, "bytes, type:", imageBlob.type);
      const formData = new FormData();
      formData.append('prompt', HARDCODED_PROMPT);

      const filename = image.fileName || image.uri.split('/').pop() || 'photo.jpg';

      console.log(`Appending Blob to FormData with key 'image', filename: ${filename}`);
      formData.append('image', imageBlob, filename);

      console.log('Uploading to:', apiUrl);
      console.log('Sending Prompt:', HARDCODED_PROMPT);

      const uploadResponse = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers: {
        },
      });
      const responseData = await uploadResponse.json();

      console.log('API Response Status:', uploadResponse.status);
      console.log('API Response Data:', responseData);

      if (uploadResponse.ok && responseData.success) {
        setApiResponse(responseData.data?.geminiResponse || 'No response text found.');
      } else {
        setError(responseData.message || `HTTP Error ${uploadResponse.status}`);
      }

    } catch (err: any) {
      console.error('Upload Process Error:', err);
       if (err.message.includes('Failed to fetch image file')) {
           setError(`Error reading image file: ${err.message}`);
       } else if (err.message === 'Network request failed') {
           setError('Network request failed. Check your internet connection or server.');
       } else {
           setError(`Failed to upload: ${err.message}`);
       }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plant Analyzer</Text>

      <View style={styles.buttonContainer}>
          <Button title="Pick an Image" onPress={pickImage} />
      </View>

      {image && (
          <Image source={{ uri: image.uri }} style={styles.image} resizeMode="contain" />
      )}

      {image && (
          <View style={styles.buttonContainer}>
              <Button
                  title="Analyze Plant"
                  onPress={uploadImage}
                  disabled={isLoading} // Disable button while loading
              />
          </View>
      )}

      {isLoading && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.statusText}>Analyzing, please wait...</Text>
        </View>
      )}

      {error && (
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {apiResponse && (
        <View style={styles.statusContainer}>
          <Text style={styles.responseText}>Analysis Result:</Text>
          <Text>{apiResponse}</Text>
        </View>
      )}

      {!image && !isLoading && !error && !apiResponse && (
        <Text style={styles.placeholderText}>Select an image to begin.</Text>
      )}
    </View>
  );
}

// --- Styles (No changes needed here) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Align items to the top
    paddingTop: 50, // Add padding at the top
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    marginVertical: 15,
    width: '80%', // Give buttons some width
  },
  image: {
    width: 300,
    height: 300,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  statusContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10,
    width: '90%',
  },
  statusText: {
      marginTop: 10,
      fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  responseText: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
  },
  placeholderText: {
      marginTop: 30,
      fontSize: 16,
      color: '#888',
  }
});
