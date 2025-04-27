import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity, // Use TouchableOpacity for better feedback
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  TouchableHighlight, // For loading state
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ExternalPathString } from 'expo-router/build/types'; // Correct import path
import { API_BASE_URL } from '@/lib/config';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';

// Define structure for the expected combined data
interface MyPlantData {
  _id: string; // User's specific garden item ID
  custom_name: string;
  plantId: number; // Original botanical plant ID
  location?: string;
  notes?: string;
  plantImages: { image_url: string, createdAt: any }[];
  botanicalDetails?: {
    name: string;
    scientificName: string;
    family: string;
    sunlight?: string[];
    watering?: string;
    floweringSeason?: string;
    nativeArea?: string;
    harvestMethod?: string;
    maintenance?: string;
    growthRate?: string;
    fruitingSeason?: string;
  };
}

const { width } = Dimensions.get('window');

export default function MyPlant() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get parameters passed from the index screen
  const plantName = params.plantName as string; // This is the custom_name
  const userID = params.userId as string;
  const goBackTo = params.source as ExternalPathString;

  const [plantData, setPlantData] = useState<MyPlantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Details' | 'Care' | 'Album'>('Care');
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    setPlantData(null);
    setLoading(true);
    setError(null);
    setActiveTab('Care');
  }, [userID, plantName]);
  
  useEffect(() => {
    const fetchMyPlantDetails = async () => {
      if (!userID || !plantName) {
          setError('User ID or Plant Name is missing.');
          setLoading(false);
          return;
      }

      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        // Send userID and custom_name (plantName from params) to identify the plant
        formData.append('userID', userID);
        formData.append('plantName', plantName);

        const response = await fetch(`${API_BASE_URL}/api/myplantdetails`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success && result.data) {
          // Assume result.data contains the structure defined in MyPlantData
          // including the nested botanicalDetails
          setPlantData(result.data);
        } else {
          setError(result.message || 'Failed to get plant details');
          console.error("API Error:", result.message);
        }
      } catch (err) {
        setError(`Error fetching plant details: ${err instanceof Error ? err.message : String(err)}`);
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyPlantDetails();
  }, [userID, plantName]); // Depend on userID and plantName
  
  const analyzeHealth = async () => {
    if (!plantData?.plantImages || plantData.plantImages.length === 0) {
      setHealthError('No plant images available for analysis');
      return;
    }
    
    setHealthLoading(true);
    setHealthError(null);
    
    try {
      // Get the most recent image
      const sortedImages = [...plantData.plantImages].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      const mostRecentImageUrl = sortedImages[0].image_url;
      
      // Prepare form data - send the URL instead of the image blob
      const formData = new FormData();
      formData.append('imageUrl', mostRecentImageUrl);
      formData.append('plantName', plantData.custom_name);
      formData.append('plantType', plantData.botanicalDetails?.name || 'unknown');
      
      // Call the API
      const response = await fetch(`${API_BASE_URL}/api/planthealth`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setHealthData(result.data);
      } else {
        setHealthError(result.message || 'Failed to analyze plant health');
        console.error("Health Analysis API Error:", result);
      }
    } catch (err: any) {
      setHealthError(`Error analyzing plant health: ${err.message}`);
      console.error("Health Analysis Error:", err);
    } finally {
      setHealthLoading(false);
    }
  };
  
  const handleTabPress = (tab: 'Care' | 'Details' | 'Album') => {
    setActiveTab(tab);
  };

  const handleBack = () => {
    if (goBackTo) {
      router.push(goBackTo);
    }
  };

  const handleCameraPress = async () => {
    // Show action sheet for user to choose camera or gallery
    Alert.alert(
      "Add Plant Photo",
      "Select a photo source",
      [
        {
          text: "Take New Photo",
          onPress: () => openCamera(),
        },
        {
          text: "Choose from Gallery",
          onPress: () => pickImage(),
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };
  
  const openCamera = async () => {
    // Check camera permissions
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
        return;
      }
    }
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadPlantImage(result.assets[0]);
      }
    } catch (err) {
      console.error("Camera Error:", err);
      Alert.alert('Error', 'Failed to take photo');
    }
  };
  
  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need gallery permissions to make this work!');
        return;
      }
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadPlantImage(result.assets[0]);
      }
    } catch (err) {
      console.error("Image Picker Error:", err);
      Alert.alert('Error', 'Failed to select image');
    }
  };
  
  const uploadPlantImage = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    if (!plantData?._id || !userID) {
      Alert.alert('Error', 'Cannot upload image: plant data is missing');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const imageUri = imageAsset.uri;
      const formData = new FormData();
      
      formData.append('userID', userID);
      formData.append('plantName', plantName);
      
      // Append the image file
      const filename = imageAsset.fileName || imageUri.split('/').pop() || 'photo.jpeg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
      
      const response = await fetch(`${API_BASE_URL}/api/addplantimage`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (plantData) {
          const updatedPlantImages = [...(plantData.plantImages || []), { image_url: result.imageUrl, createdAt: new Date().toISOString() }];
          setPlantData({...plantData, plantImages: updatedPlantImages});
        }
        Alert.alert('Success', 'Image added to your plant!');
      } else {
        setError(result.message || 'Failed to upload image');
        Alert.alert('Error', result.message || 'Failed to upload image');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Upload Error:", err);
      setError(`Error uploading image: ${errorMessage}`);
      Alert.alert('Error', `Failed to upload: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const renderImageSection = () => {
    let latestImageUrl = null;
    
    if (plantData?.plantImages && plantData.plantImages.length > 0) {
      const sortedImages = [...plantData.plantImages].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      latestImageUrl = sortedImages[0].image_url;
    }
    
    return (
      <View style={styles.imageContainer}>
        {latestImageUrl ? (
          <Image
            source={{ uri: latestImageUrl }}
            style={styles.mainImage}
            resizeMode="cover"
          />
        ) : (
          <Svg width={24} height={28} viewBox="0 0 150 212">
            <Path d="M43.2793 1.41739C49.6466 -0.588376 56.1307 0.925285 61.7197 4.28556C67.2619 7.61782 72.3805 12.9841 76.8564 19.8266C86.1511 34.0356 87.0864 45.9996 86.1484 56.7934C85.9243 59.3726 85.5955 61.8749 85.2803 64.2055C84.9579 66.5891 84.6549 68.7596 84.4268 70.9438C83.9765 75.2533 83.8737 79.179 84.5674 83.1899C84.6396 83.6073 84.7254 84.0252 84.8203 84.4438C86.1958 80.1391 88.1099 75.6542 91.0615 71.1928C95.2294 64.8929 101.202 59.0293 109.897 53.6859C118.537 48.3768 127.072 45.8859 134.666 47.8061C142.836 49.8721 147.453 56.3527 149.151 63.3774C152.369 76.6882 146.358 94.69 133.292 108.072C126.518 115.009 119.19 119.153 111.63 120.528C104.621 121.802 98.0146 120.582 92.2725 117.849C90.9538 120.735 89.2821 123.627 87.0967 126.459C88.9887 130.508 90.5608 134.687 91.8018 138.937C98.65 162.393 95.7042 188.924 80.3389 208.88L80.0791 209.201C77.3306 212.419 72.5105 212.95 69.1191 210.339C65.6183 207.644 64.9657 202.62 67.6611 199.12L68.2041 198.402C79.467 183.238 82.0314 162.561 76.4434 143.421C75.848 141.382 75.1614 139.371 74.3887 137.395C66.5964 141.71 57.6651 143.404 48.8984 142.878C35.1193 142.052 21.1573 135.761 11.1894 124.817C6.32128 119.472 2.79537 113.653 1.10839 107.863C-0.566437 102.114 -0.585647 95.6846 2.7705 90.2104C6.226 84.5742 12.2072 81.6491 18.9521 80.9486C25.5685 80.2615 33.4415 81.5985 42.3428 84.8168L43.5381 85.2602C57.7784 90.6745 69.2823 99.8501 77.792 111.035C78.2939 109.92 78.7376 108.769 79.1357 107.574C73.7519 101.262 70.1106 93.484 68.8018 85.9164C67.756 79.8697 67.9881 74.3115 68.5137 69.2807C68.7734 66.7946 69.118 64.3296 69.4248 62.0609C69.7388 59.7394 70.021 57.5712 70.209 55.4086C70.9193 47.2344 70.3332 39.0823 63.4668 28.5854C59.8622 23.0748 56.3482 19.7256 53.4756 17.9984C50.6498 16.2995 48.9352 16.4109 48.0869 16.6781C47.2214 16.9508 45.568 17.9189 43.9717 21.3529C42.3571 24.8262 41.0987 30.2833 40.999 38.102C40.8103 52.9056 46.0056 59.7163 50.1191 63.018C52.3391 64.7998 54.5757 65.8203 56.2383 66.3881C57.063 66.6698 57.7215 66.831 58.1269 66.9164C58.328 66.9588 58.4632 66.9824 58.5215 66.9916C58.5337 66.9935 58.5427 66.9948 58.5478 66.9955C58.5418 66.9947 58.5308 66.9936 58.5146 66.9916C58.5063 66.9906 58.4964 66.989 58.4853 66.9877C58.4799 66.9871 58.4739 66.9865 58.4678 66.9858C58.4648 66.9854 58.4598 66.985 58.458 66.9848H58.457C62.8424 67.4856 65.9938 71.4443 65.498 75.8315C65.0017 80.2216 61.0406 83.3784 56.6504 82.8822L57.5732 74.7192C57.5653 74.7897 57.5569 74.8612 57.5488 74.933C56.6505 82.8821 56.6451 82.8819 56.6396 82.8813C56.6376 82.881 56.6326 82.8797 56.6289 82.8793C56.6211 82.8784 56.6121 82.8774 56.6035 82.8764C56.5865 82.8744 56.568 82.872 56.5478 82.8695C56.5071 82.8645 56.4594 82.8591 56.4062 82.852C56.3 82.8376 56.1693 82.8187 56.0156 82.7943C55.708 82.7456 55.3068 82.674 54.8262 82.5727C53.8671 82.3705 52.5768 82.0446 51.0664 81.5287C48.0581 80.5012 44.0751 78.6842 40.1035 75.4965C31.8338 68.859 24.7548 57.2033 25.001 37.8979C25.1187 28.662 26.5942 20.779 29.4629 14.6078C32.3497 8.39789 36.9293 3.41786 43.2793 1.41739ZM36.9033 99.8637C29.2961 97.1132 23.9687 96.5133 20.6045 96.8627C17.3692 97.1988 16.5886 98.2842 16.4111 98.5736C16.1343 99.0255 15.6105 100.438 16.4697 103.387C17.317 106.296 19.3647 110.033 23.0176 114.043C30.092 121.811 40.1113 126.322 49.8564 126.907C56.097 127.281 61.9761 126.05 66.8906 123.246C59.8796 113.089 50.0641 104.858 37.8418 100.211L36.9033 99.8637ZM130.744 63.3178C129.205 62.9286 125.291 63.0065 118.274 67.3178C111.314 71.5949 107.134 75.8963 104.405 80.0209C101.655 84.1773 100.115 88.5482 98.9131 93.4115C98.3002 95.8906 97.8047 98.3624 97.2402 101.083C97.1631 101.455 97.0818 101.831 97.0019 102.21C97.4552 102.499 97.9149 102.77 98.3818 103.018C101.674 104.769 105.156 105.442 108.768 104.786C112.406 104.124 116.876 101.982 121.844 96.894C132.262 86.2242 135.165 73.614 133.6 67.1371C132.906 64.2687 131.707 63.5613 130.744 63.3178Z" fill="black"/>
          </Svg>
        )}
        <TouchableOpacity style={styles.cameraButton} onPress={handleCameraPress}>
          <Ionicons name="camera-outline" size={24} color="#555" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['Care', 'Details', 'Album'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
          onPress={() => handleTabPress(tab as 'Care' | 'Details' | 'Album')}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDetailsContent = () => {
    if (!plantData) return null; // Don't render if no data

    // Extract botanical details safely
    const botanical = plantData.botanicalDetails;

    return (
      <View>
        <View style={styles.contentCard}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes:</Text>
            <Text style={styles.infoText}>{plantData.notes || '-'}</Text>
          </View>
        </View>
  
        <View style={styles.contentCard}>
          <View style={styles.section}>
            {botanical && (
              <View>
                <Text style={styles.sectionTitle}>About:</Text>
                <Text style={styles.infoText}>Common Name: {botanical.name || '-'}</Text>
                <Text style={styles.infoText}>Scientific Name: {botanical.scientificName || '-'}</Text>
                <Text style={styles.infoText}>Family: {botanical.family || '-'}</Text>
                <Text style={styles.infoText}>Native Area: {botanical.nativeArea || '-'}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderCareContent = () => {
    if (!plantData) return null; // Don't render if no data
  
    const botanical = plantData.botanicalDetails;
    
    return (
      <View>
        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Health Analysis:</Text>
          
          {healthLoading ? (
            <View style={styles.healthLoadingContainer}>
              <ActivityIndicator size="small" color="#5167F2" />
              <Text style={styles.healthLoadingText}>Analyzing plant health...</Text>
            </View>
          ) : healthData ? (
            <View style={styles.healthAnalysisContainer}>
              <View style={[
                styles.healthStatusBadge, 
                healthData.healthStatus === 'Healthy' ? styles.healthStatusHealthy : 
                healthData.healthStatus === 'Needs attention' ? styles.healthStatusWarning : 
                styles.healthStatusUnhealthy
              ]}>
                <Text style={styles.healthStatusText}>{healthData.healthStatus}</Text>
              </View>
              
              <Text style={styles.healthSummary}>{healthData.summary}</Text>
              
              {healthData.observations && healthData.observations.length > 0 && (
                <View style={styles.healthSection}>
                  <Text style={styles.healthSectionTitle}>Observations:</Text>
                  {healthData.observations.map((observation: string, index: number) => (
                    <Text key={index} style={styles.healthListItem}>• {observation}</Text>
                  ))}
                </View>
              )}
              
              {healthData.issues && healthData.issues.length > 0 && (
                <View style={styles.healthSection}>
                  <Text style={styles.healthSectionTitle}>Issues Detected:</Text>
                  {healthData.issues.map((issue: any, index: number) => (
                    <View key={index} style={styles.issueItem}>
                      <Text style={styles.issueName}>{issue.issue} - <Text style={styles.issueSeverity}>{issue.severity}</Text></Text>
                      <Text style={styles.issueDescription}>{issue.description}</Text>
                      {issue.causes && issue.causes.length > 0 && (
                        <Text style={styles.issueCauses}>Potential causes: {issue.causes.join(', ')}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
              
              {healthData.recommendations && healthData.recommendations.length > 0 && (
                <View style={styles.healthSection}>
                  <Text style={styles.healthSectionTitle}>Recommendations:</Text>
                  {healthData.recommendations.map((rec: string, index: number) => (
                    <Text key={index} style={styles.healthListItem}>• {rec}</Text>
                  ))}
                </View>
              )}
              
              {healthData.generalCare && (
                <View style={styles.healthSection}>
                  <Text style={styles.healthSectionTitle}>General Care:</Text>
                  <Text style={styles.careItem}>Watering: {healthData.generalCare.watering}</Text>
                  <Text style={styles.careItem}>Light: {healthData.generalCare.light}</Text>
                  <Text style={styles.careItem}>Soil: {healthData.generalCare.soil}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.healthAnalysisContainer}>
              {healthError ? (
                <Text style={styles.healthErrorText}>{healthError}</Text>
              ) : (
                <Text style={styles.infoText}>Click the button below to analyze your plant's health.</Text>
              )}
              <TouchableHighlight 
                style={styles.analyzeButton}
                onPress={analyzeHealth}
              >
                <Text style={styles.analyzeButtonText}>Analyze Plant Health</Text>
              </TouchableHighlight>
            </View>
          )}
        </View>
        
        <View style={styles.contentCard}>
          {botanical && (
            <View>
              <Text style={styles.sectionTitle}>Care Details:</Text>
              <Text style={styles.infoText}>Maintenance: {botanical.maintenance || '-'}</Text>
              <Text style={styles.infoText}>Growth Rate: {botanical.growthRate || '-'}</Text>
              <Text style={styles.infoText}>Watering Frequency: {botanical.watering || '-'}</Text>
              <Text style={styles.infoText}>Sunlight: {botanical.sunlight?.join(', ') || '-'}</Text>
              <Text style={styles.infoText}>Flowering Season: {botanical.floweringSeason || '-'}</Text>
              <Text style={styles.infoText}>Fruiting Season: {botanical.fruitingSeason || '-'}</Text>
              <Text style={styles.infoText}>Harvest Method: {botanical.harvestMethod || '-'}</Text>
            </View>              
          )}
        </View>
      </View>
    )
  };

  const renderAlbumContent = () => {
    let sortedImages: { image_url: string; createdAt?: string }[] = [];
    
    if (plantData?.plantImages && plantData.plantImages.length > 0) {
      sortedImages = [...plantData.plantImages].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    
    return (
      <View style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Photo Album</Text>
        {sortedImages.length > 0 ? (
          <View style={styles.imageGrid}>
            {sortedImages.map((image, index) => (
              <Image 
                key={index}
                source={{ uri: image.image_url }}
                style={styles.albumImage}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : (
          <Text style={styles.infoText}>No images uploaded for this plant yet.</Text>
        )}
      </View>
    );
  };

  // --- Main Return ---
  return (
    <View style={styles.outerContainer}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
        {renderImageSection()}

        <Text style={styles.customPlantName}>
            {/* Display custom name from fetched data, or the one passed via params as fallback */}
            {plantData?.custom_name || plantName || 'Plant'}
        </Text>

        {renderTabs()}

        {/* Conditional Content Based on Active Tab */}
        {loading ? (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5167F2" />
                <Text style={styles.loadingText}>Loading plant data...</Text>
            </View>
        ) : error ? (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        ) : (
            <>
                {activeTab === 'Details' && renderDetailsContent()}
                {activeTab === 'Care' && renderCareContent()}
                {activeTab === 'Album' && renderAlbumContent()}
            </>
        )}

        </ScrollView>
        {/* Placeholder for Bottom Navigation - Assuming this is part of a larger layout */}
        {/* <View style={styles.bottomNavPlaceholder}></View> */}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  healthAnalysisContainer: {
    marginTop: 8,
  },
  healthLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  healthLoadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  healthStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  healthStatusHealthy: {
    backgroundColor: '#C5E1A5',
  },
  healthStatusWarning: {
    backgroundColor: '#FFE082',
  },
  healthStatusUnhealthy: {
    backgroundColor: '#FFAB91',
  },
  healthStatusText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  healthSummary: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  healthSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  healthSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 5,
  },
  healthListItem: {
    fontSize: 14,
    color: '#444',
    marginBottom: 5,
    lineHeight: 20,
    paddingLeft: 5,
  },
  issueItem: {
    marginBottom: 10,
    paddingLeft: 5,
  },
  issueName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#444',
  },
  issueSeverity: {
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  issueDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  issueCauses: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  careItem: {
    fontSize: 14,
    color: '#444',
    marginBottom: 3,
    paddingLeft: 5,
  },
  analyzeButton: {
    backgroundColor: '#5167F2',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignSelf: 'center',
    marginTop: 15,
  },
  analyzeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  healthErrorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },

  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  albumImage: {
    width: width * 0.3,
    height: width * 0.3,
    margin: 4,
    borderRadius: 4,
  },
  outerContainer: {
    flex: 1,
    backgroundColor: 'white', // Background for the whole screen area
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 100, // Ensure space for content above any bottom nav
  },

  imageContainer: {
    width: '100%',
    height: width * 0.6, // Adjust height as needed (e.g., 70% of screen width)
    backgroundColor: '#FDF8E1', // Light tan/yellowish background
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative', // Needed for absolute positioning of the button
  },
  mainImage: {
    width: '100%', // Adjust image size within the container
    height: '100%', // Adjust image size within the container
    // If you want a specific shape like the glass:
    // You might need a mask or specific styling, or use the image as is.
    // For simplicity, using a standard rectangular image frame here.
  },

  cameraButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FFF8DC', // Light yellow circle background
    borderRadius: 30,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  customPlantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3E51CC',
    textAlign: 'left',
    margin: 16,
    marginBottom: 10,
    
  },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent', // Default inactive state
  },
  activeTabButton: {
    borderBottomColor: '#429333', // Green underline for active tab
  },
  tabText: {
    fontSize: 18,
    color: '#888', // Greyish color for inactive tabs
    fontWeight: '500',
  },
  activeTabText: {
    color: '#429333', // green color for active tab text
    fontWeight: '600',
  },

  contentCard: {
    backgroundColor: '#F5F7FF', 
    marginHorizontal: 8,
    borderRadius: 4,
    padding: 15,
    // Add subtle shadow/border if needed
    // borderWidth: 1,
    // borderColor: '#F0F0F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    marginVertical: 5,
  },
  section: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    fontStyle: 'italic',
    marginLeft: 10, // Indent notes slightly
    marginBottom: 8,
  },
  bulletList: {
    marginLeft: 10, // Indent bullet points
  },
  bulletItem: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 4,
  },
  loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 50,
  },
  loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 15,
    backgroundColor: '#FFEEEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDCD'
  },
  errorText: {
    color: '#D8000C',
    fontSize: 16,
    textAlign: 'center',
  },
  // bottomNavPlaceholder: { // If you need to visually represent the space
  //   height: 60, // Adjust to your actual nav bar height
  //   backgroundColor: '#f0f0f0', // Placeholder color
  // },
});
