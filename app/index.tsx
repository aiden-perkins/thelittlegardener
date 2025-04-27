import React, { useState } from 'react';
import { Text, View, Button, Image, StyleSheet, ActivityIndicator, Alert, Platform, TouchableHighlight, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

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

    const apiUrl = '/api/gemini';

    try {
      const fetchResponse = await fetch(image.uri);
      if (!fetchResponse.ok) {
          throw new Error(`Failed to fetch image file: ${fetchResponse.statusText} (status: ${fetchResponse.status})`);
      }
      const imageBlob = await fetchResponse.blob();
      const formData = new FormData();

      const filename = image.fileName || image.uri.split('/').pop() || 'photo.jpg';

      formData.append('image', imageBlob, filename);

      const uploadResponse = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
      const responseData = await uploadResponse.json();

      // if the request was ok the response back should be some sort of json object from gemini
      // we display the add plant route with the correct id recovered from gemini
      // with the image already added

      
      if (uploadResponse.ok && responseData.success) {
        // Get the identified plant
        const plant = responseData.data.identifiedPlant;
        
        // Navigate to the Add Plant page with plant details
        router.push({
          pathname: '/plant/AddPlant',
          params: {
            id: plant.id.toString(),
            name: plant.name,
            scientific_name: plant.scientific_name || '',
            family: plant.family || '',
            source: '/',
            detected_name: plant.name, // Pass the detected name
            confidence: plant.confidence.toString()
          }
        });
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

  const imgUrls = [
    "https://ibighit.com/txt/images/txt/main/kv-beomgyu-panic.png",
    "https://ibighit.com/txt/images/txt/main/kv-beomgyu-panic.png",
    "https://ibighit.com/txt/images/txt/main/kv-beomgyu-panic.png",
    "https://ibighit.com/txt/images/txt/main/kv-beomgyu-panic.png",
    "https://ibighit.com/txt/images/txt/main/kv-beomgyu-panic.png",
    
  ];

  return (
    <View style={homeStyles.container}>
      <Text style={homeStyles.title}>Your Garden</Text>

      {!image && !isLoading && !error && !apiResponse && (
        <Text style={homeStyles.placeholderText}>No growths in your garden yet.</Text>
      )}

    <FlatList
      data={imgUrls}
      keyExtractor={(item, index) => index.toString()}
      numColumns={2} // Set the number of columns to 2
      renderItem={({ item }) => (
        <View style={homeStyles.imageContainer}>
          <Image source={{ uri: item }} style={homeStyles.gridImage} />
        </View>
      )}
    />

      <TouchableHighlight style={homeStyles.buttonContainer} onPress={pickImage}>
          <Text style={homeStyles.buttonText}>Add plant with image</Text>
      </TouchableHighlight>

      <TouchableHighlight style={homeStyles.buttonContainerGreen} onPress={pickImage}>
          <Text style={homeStyles.buttonText}>Add plant with camera</Text>
      </TouchableHighlight>

      <TouchableHighlight style={homeStyles.buttonContainerGray} onPress={pickImage}>
          <Text style={homeStyles.buttonText}>Add plant manually</Text>
      </TouchableHighlight>

      {image && (
          <Image source={{ uri: image.uri }} style={homeStyles.image} resizeMode="contain" />
      )}

      {image && (
          <TouchableHighlight style={homeStyles.buttonContainer} onPress={uploadImage}>
              <Text style={homeStyles.buttonText}>Analyze Plant</Text>
          </TouchableHighlight>
      )}

      {isLoading && (
        <View style={homeStyles.statusContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={homeStyles.statusText}>Analyzing, please wait...</Text>
        </View>
      )}

      {error && (
        <View style={homeStyles.statusContainer}>
          <Text style={homeStyles.errorText}>Error: {error}</Text>
        </View>
      )}

      {apiResponse && (
        <View style={homeStyles.statusContainer}>
          <Text style={homeStyles.responseText}>Analysis Result:</Text>
          <Text>{apiResponse}</Text>
        </View>
      )}

    </View>
  );
}

// for components that cannot be used w/ CSS modules
const homeStyles = StyleSheet.create({
  container: {
    flex: 1, // Ensures the container takes up the full screen
    backgroundColor: 'white', // Set the background color to white
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 50,
    paddingBottom: 50
  },
  buttonContainer: {
    backgroundColor: '#F1EB91',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainerGreen: {
    backgroundColor: '#BBEA9B',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainerGray: {
    backgroundColor: '#D9D9D9',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 10, // Vertical padding
    paddingHorizontal: 20, // Horizontal padding
  },
  image: {
    width: 300,
    height: 300,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderStyle: 'solid', // React Native doesn't support `border-style`, so this can be omitted
    borderColor: '#ccc',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  gridImage: {
    width: 160,
    height: 160
  },
  // container: {
  //   flex: 1,
  //   flexDirection: 'column',
  //   alignItems: 'center',
  //   justifyContent: 'flex-start', // Align items to the top
  //   paddingTop: 50, // Add padding at the top
  //   paddingLeft: 20,
  //   paddingRight: 20,
  //   backgroundColor: 'white', // Set background color
  // },
  title: {
    color: '#5167F2',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  // image: {
  //   width: 300,
  //   height: 300,
  //   marginTop: 20,
  //   marginBottom: 20,
  //   borderWidth: 1,
  //   borderColor: '#ccc',
  // },
  statusContainer: {
    marginTop: 20,
    flexDirection: 'column',
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
  },
});