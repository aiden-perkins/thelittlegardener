import React, { useState, useRef, useEffect } from 'react';
import { Text, View, Image, StyleSheet, ActivityIndicator, Alert, Platform, TouchableHighlight, FlatList, Modal, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '@/lib/config';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';

export default function Index() {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [showCapturePreview, setShowCapturePreview] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [gardenItems, setGardenItems] = useState<any[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoadingGarden, setIsLoadingGarden] = useState(true);
  const cameraRef = useRef<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    const checkRefreshFlag = async () => {
      if (isFocused) {
        try {
          const shouldRefresh = await AsyncStorage.getItem('triggerGardenRefresh');
          if (shouldRefresh === 'true') {
            await AsyncStorage.setItem('triggerGardenRefresh', 'false');
            checkLoginStatus();
          }
        } catch (error) {
          console.error("Error checking refresh flag:", error);
        }
      }
    };
    
    checkRefreshFlag();
  }, [isFocused]);
  
  useEffect(() => {
    // This will run once when the component is first mounted
    checkLoginStatus();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    checkLoginStatus().then(() => setRefreshing(false));
  }, []);
  
  const checkLoginStatus = async () => {
    try {
      setIsLoadingGarden(true);
      const userJson = await AsyncStorage.getItem('user');
      
      if (userJson) {
        const user = JSON.parse(userJson);
        setUsername(user.username);
        
        // Fetch user's garden items
        const formData = new FormData();
        formData.append('username', user.username);
        
        const response = await fetch(`${API_BASE_URL}/api/gardenposts`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          setGardenItems(data.gardenItems || []);
        } else {
          console.error("Failed to fetch garden items:", data.message);
        }
      }
    } catch (err) {
      console.error("Error checking login status:", err);
    } finally {
      setIsLoadingGarden(false);
    }
  };

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
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0]);
        uploadImage(result.assets[0]);
      }
    } catch (pickError: any) {
      console.error("ImagePicker Error: ", pickError);
      setError(`Failed to pick image: ${pickError.message}`);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
        return;
      }
    }
    
    setCameraActive(true);
    setError(null);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        shutterSound: false
      });
      
      setImage({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        assetId: null,
        fileName: `plant_${Date.now()}.jpeg`,
        fileSize: 0,
        type: 'image',
        duration: 0,
        exif: null,
      });
      
      setShowCapturePreview(true);
      setCameraActive(false);
    } catch (err: any) {
      console.error('Camera capture error:', err);
      setError(`Failed to capture image: ${err.message}`);
      setCameraActive(false);
    }
  };

  const retakePhoto = () => {
    setImage(null);
    setShowCapturePreview(false);
    setCameraActive(true);
  };

  const confirmPhoto = () => {
    setShowCapturePreview(false);
    if (image) {
      uploadImage(image);
    }
  };

  const uploadImage = async (imageToUpload: ImagePicker.ImagePickerAsset) => {
    if (!imageToUpload?.uri) {
      Alert.alert('No Image', 'Please select an image first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const apiUrl = `${API_BASE_URL}/api/gemini`;

    try {
      const fetchResponse = await fetch(imageToUpload.uri);
      if (!fetchResponse.ok) {
        throw new Error(`Failed to fetch image file: ${fetchResponse.statusText} (status: ${fetchResponse.status})`);
      }
      const imageBlob = await fetchResponse.blob();
      const formData = new FormData();

      const filename = imageToUpload.fileName || imageToUpload.uri.split('/').pop() || 'photo.jpeg';

      const localUri = imageToUpload.uri;
      
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri: localUri,
        name: filename,
        type,
      } as any);
      
      const uploadResponse = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
      const responseData = await uploadResponse.json();
      
      if (uploadResponse.ok && responseData.success) {
        const plant = responseData.data.identifiedPlant;
        AsyncStorage.setItem('triggerGardenRefresh', 'true')
          .then(() => {
            router.push({
              pathname: '/plant/AddPlant',
              params: {
                id: plant.id.toString(),
                name: plant.name,
                scientific_name: plant.scientific_name || '',
                family: plant.family || '',
                source: '/',
                detected_name: plant.name,
                confidence: plant.confidence.toString(),
                image_url: responseData.data.imageUrl
              }
            });
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
      setImage(null);
    }
  };
  const handleMyPlant = (plantData: any) => {
    AsyncStorage.getItem('user')
      .then(userJson => {
        const user = userJson ? JSON.parse(userJson) : { username: '' };
        router.push({
          pathname: '/plant/MyPlant',
          params: {
            id: plantData.plantId.toString(),
            plantName: plantData.custom_name,
            userId: user.username,
            source: '/'
          }
        });
      })
  };

  const renderPlantItem = ({ item }: { item: any }) => {
    let imageUrl = null;
    
    if (item.plantImages && item.plantImages.length > 0) {
      const sortedImages = [...item.plantImages].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      imageUrl = sortedImages[0].image_url;
    }
    
    return (
      <TouchableOpacity style={homeStyles.imageContainer} onPress={() => handleMyPlant(item)}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={homeStyles.gridImage} />
        ) : (
          <View style={[homeStyles.gridImage, homeStyles.placeholderImage]}>
            <Ionicons name="leaf-outline" size={36} color="#bbb" />
          </View>
        )}
        <Text style={homeStyles.plantName}>{item.custom_name}</Text>
      </TouchableOpacity>
    );
  };

  if (cameraActive) {
    return (
      <View style={homeStyles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={homeStyles.camera}
          facing={cameraFacing}
        >
          <View style={homeStyles.cameraButtonsContainer}>
            <TouchableHighlight
              style={homeStyles.cameraButton}
              onPress={() => setCameraActive(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableHighlight>
            
            <TouchableHighlight
              style={homeStyles.cameraCaptureButton}
              onPress={takePicture}
            >
              <View style={homeStyles.captureButtonInner} />
            </TouchableHighlight>
            
            <TouchableHighlight
              style={homeStyles.cameraButton}
              onPress={() => setCameraFacing(current => (current === 'back' ? 'front' : 'back'))}
            >
              <Ionicons name="camera-reverse" size={24} color="white" />
            </TouchableHighlight>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={homeStyles.container}>
      <Text style={homeStyles.title}>My Garden</Text>

      {isLoadingGarden ? (
        <ActivityIndicator size="large" color="#5167F2" style={{ marginTop: 20 }} />
      ) : (
        <>
          {(!gardenItems || gardenItems.length === 0) && !isLoading && !error && (
            <Text style={homeStyles.placeholderText}>No growths in your garden yet.</Text>
          )}
          <FlatList
            data={gardenItems}
            keyExtractor={(item, index) => item._id || index.toString()}
            numColumns={2}
            renderItem={renderPlantItem}
            contentContainerStyle={homeStyles.gridContainer}
            style={homeStyles.flatList}
            ListEmptyComponent={null}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </>
      )}

      <View style={homeStyles.buttonRow}>
        <TouchableHighlight 
          style={homeStyles.buttonContainerGreen} 
          onPress={pickImage}
          disabled={isLoading}
        >
          <Text style={homeStyles.buttonText}>Add From Gallery</Text>
        </TouchableHighlight>

        <TouchableHighlight 
          style={homeStyles.buttonContainerYellow} 
          onPress={openCamera}
          disabled={isLoading}
        >
          <Text style={homeStyles.buttonText}>Use Camera</Text>
        </TouchableHighlight>
      </View>

      {isLoading && (
        <View style={homeStyles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={homeStyles.loadingText}>Analyzing plant image...</Text>
        </View>
      )}

      {error && (
        <View style={homeStyles.statusContainer}>
          <Text style={homeStyles.errorText}>Error: {error}</Text>
        </View>
      )}

      <Modal
        visible={showCapturePreview}
        transparent={false}
        animationType="slide"
      >
        <View style={homeStyles.previewContainer}>
          <Image source={{ uri: image?.uri }} style={homeStyles.previewImage} />
          <View style={homeStyles.previewButtonsContainer}>
            <TouchableHighlight
              style={homeStyles.buttonContainerGray}
              onPress={() => {
                setShowCapturePreview(false);
                setImage(null);
              }}
            >
              <Text style={homeStyles.buttonText}>Cancel</Text>
            </TouchableHighlight>
            <TouchableHighlight
              style={homeStyles.buttonContainerGray}
              onPress={retakePhoto}
            >
              <Text style={homeStyles.buttonText}>Retake</Text>
            </TouchableHighlight>
            <TouchableHighlight
              style={homeStyles.buttonContainerGreen}
              onPress={confirmPhoto}
            >
              <Text style={homeStyles.buttonText}>Use Photo</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>
      {/* stars */}
      <Svg width="24" height="24" viewBox="0 0 50 50" fill="none" style={homeStyles.star1}>
        <Path d="M23.1243 2.069C23.7686 0.327768 26.2314 0.327775 26.8757 2.06901L32.2434 16.575C32.446 17.1224 32.8776 17.554 33.425 17.7566L47.931 23.1243C49.6722 23.7686 49.6722 26.2314 47.931 26.8757L33.425 32.2434C32.8776 32.446 32.446 32.8776 32.2434 33.425L26.8757 47.931C26.2314 49.6722 23.7686 49.6722 23.1243 47.931L17.7566 33.425C17.554 32.8776 17.1224 32.446 16.575 32.2434L2.069 26.8757C0.327768 26.2314 0.327775 23.7686 2.06901 23.1243L16.575 17.7566C17.1224 17.554 17.554 17.1224 17.7566 16.575L23.1243 2.069Z"
          fill="#F6E54B"/>
      </Svg>
      <Svg width="33" height="33" viewBox="0 0 33 33" fill="none" style={homeStyles.star2}>
        <Path d="M14.5237 1.734C14.8741 -0.523696 18.1259 -0.523687 18.4763 1.734L19.9703 11.3601C20.1039 12.2208 20.7792 12.8961 21.6399 13.0297L31.266 14.5237C33.5237 14.8741 33.5237 18.1259 31.266 18.4763L21.6399 19.9703C20.7792 20.1039 20.1039 20.7792 19.9703 21.6399L18.4763 31.266C18.1259 33.5237 14.8741 33.5237 14.5237 31.266L13.0297 21.6399C12.8961 20.7792 12.2208 20.1039 11.3601 19.9703L1.734 18.4763C-0.523696 18.1259 -0.523687 14.8741 1.734 14.5237L11.3601 13.0297C12.2208 12.8961 12.8961 12.2208 13.0297 11.3601L14.5237 1.734Z"
          fill="#F6E54B"/>
      </Svg>
      <Svg width="24" height="24" viewBox="0 0 33 33" fill="none" style={homeStyles.star3}>
        <Path d="M14.5237 1.734C14.8741 -0.523696 18.1259 -0.523687 18.4763 1.734L19.9703 11.3601C20.1039 12.2208 20.7792 12.8961 21.6399 13.0297L31.266 14.5237C33.5237 14.8741 33.5237 18.1259 31.266 18.4763L21.6399 19.9703C20.7792 20.1039 20.1039 20.7792 19.9703 21.6399L18.4763 31.266C18.1259 33.5237 14.8741 33.5237 14.5237 31.266L13.0297 21.6399C12.8961 20.7792 12.2208 20.1039 11.3601 19.9703L1.734 18.4763C-0.523696 18.1259 -0.523687 14.8741 1.734 14.5237L11.3601 13.0297C12.2208 12.8961 12.8961 12.2208 13.0297 11.3601L14.5237 1.734Z"
          fill="#F6E54B"/>
      </Svg>
      {/* circles */}
      <Svg width="33" height="33" viewBox="0 0 33 33" fill="none" style={homeStyles.circle1}>
        <Circle cx={6} cy={6} r={6} fill="#F6E54B"/>
      </Svg>
      <Svg width="33" height="33" viewBox="0 0 33 33" fill="none" style={homeStyles.circle2}>
        <Circle cx={4} cy={4} r={4} fill="#F6E54B"/>
      </Svg>
    </View>
  );
}

const homeStyles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3E51CC',
    marginBottom: 8,
    marginTop: 40,
    textAlign: 'center',
  },

  imageContainer: {
    margin: 8,
    alignItems: 'center',
    width: 168
  },
  gridImage: {
    width: 160,
    height: 160,
    borderRadius: 4
  },
  placeholderImage: {
    backgroundColor: '#F5F7FF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  plantName: {
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
    color: '#3E51CC',
  },


  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 30,
    paddingBottom: 10,
    paddingHorizontal: 15
  },
  buttonContainerYellow: {
    backgroundColor: '#FAED74',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 5,
    paddingVertical: 10
  },
  buttonContainerGreen: {
    backgroundColor: '#BBEA9B',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 5,
    paddingVertical: 10
  },
  buttonContainerGray: {
    backgroundColor: '#D9D9D9',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  buttonText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusContainer: {
    marginTop: 20,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
    width: '90%',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  placeholderText: {
    marginTop: 30,
    fontSize: 16,
    color: '#888',
    textAlign: 'center'
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraButtonsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
    marginBottom: 30,
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
  },
  previewButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    padding: 20,
    position: 'absolute',
    bottom: 30,
  },
  gridContainer: {
    paddingVertical: 10,
    alignItems: 'center'
  },
  flatList: {
    width: '100%',
    flex: 1
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 15,
    marginBottom: 20
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16
  },
  star3: {
    position: 'absolute',
    left: '7%',
    top: '8%',
    zIndex: 0,
  },
  star2: {
    position: 'absolute',
    right: '17%',
    top: '5%',
    zIndex: 0,
  },
  star1: {
    position: 'absolute',
    right: '35%',
    top: '3%',
    zIndex: 0,
  },
  circle1: {
    position: 'absolute',
    right: '5%',
    top: '12%',
    zIndex: 0,
  },
  circle2: {
    position: 'absolute',
    left: '30%',
    top: '7%',
    zIndex: 0,
  },
});
