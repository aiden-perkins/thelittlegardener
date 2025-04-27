import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image,
  StyleSheet, 
  TouchableHighlight, 
  ScrollView,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ExternalPathString } from 'expo-router';
import { API_BASE_URL } from '@/lib/config';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SunlightDuration {
  min: string;
  max: string;
  unit: string;
}
interface PlantDataState {
  name: string;
  scientificName: string;
  family: string;
  imageUrl: string;
  sunlight: string[];
  pruningMonth: string[];
  attracts: string[];
  floweringSeason: string;
  watering: string;
  description: string;
  sunlightDuration: SunlightDuration | null;
}

export default function PlantDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const id = params.id as string;
  const goBackTo = params.source as ExternalPathString;
  
  const [plantData, setPlantData] = useState<PlantDataState>({
    name: '',
    scientificName: '',
    family: '',
    imageUrl: '',
    sunlight: [],
    pruningMonth: [],
    attracts: [],
    floweringSeason: '',
    watering: '',
    description: '',
    sunlightDuration: null,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPlantDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const formData = new FormData();
        formData.append('id', id);

        const response = await fetch(`${API_BASE_URL}/api/plantdetails`, {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          setPlantData({
            family: result.data.family || 'N/A',
            scientificName: result.data.scientificName || 'N/A',
            imageUrl: result.data.imageUrl || '',
            name: result.data.name || 'N/A',
            sunlight: result.data.sunlight || [],
            pruningMonth: result.data.pruningMonth || [],
            attracts: result.data.attracts || [],
            floweringSeason: result.data.floweringSeason || 'N/A',
            watering: result.data.watering || 'N/A',
            description: result.data.description || 'No description available.',
            sunlightDuration: result.data.sunlightDuration || null,
          });
        } else {
          setError(result.message || 'Failed to get plant details');
        }
      } catch (err) {
        setError(`Error fetching plant details: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPlantDetails();
    }
  }, [id]);
  
  const handleClose = () => {
    router.push(goBackTo || '/');
  };

  // Helper function to format arrays for display
  const formatArrayToString = (arr: string[]) => {
    if (!arr || arr.length === 0) return 'None';
    return arr.join(', ');
  };

  // Helper function to format sunlight duration
  const formatSunlightDuration = () => {
    if (!plantData.sunlightDuration) return 'Not specified';
    
    const { min, max, unit } = plantData.sunlightDuration;
    if (min && max) {
      return `${min}-${max} ${unit}`;
    } else if (min) {
      return `At least ${min} ${unit}`;
    } else if (max) {
      return `Up to ${max} ${unit}`;
    }
    return 'Not specified';
  };

  const handleAddToGarden = (plant: PlantDataState) => {
    AsyncStorage.setItem('triggerGardenRefresh', 'true')
      .then(() => {
        router.push({
          pathname: '/plant/AddPlant',
          params: {
            id: id,
            name: plant.name,
            scientific_name: plant.scientificName || '',
            family: plant.family || '',
            image_url: plant.imageUrl || '',
            source: '/search/Search'
          }
        });
      });
  };

  return (
    <ScrollView style={styles.container}>
      {/* <Text style={styles.title}>Plant Insights</Text> */}

      {loading ? (
        <Text style={styles.loadingText}>Loading plant details...</Text>
      ) : (
        <>
          {/* Plant header with image and basic info */}
          <View style={styles.plantHeader}>
            {plantData.imageUrl ? (
              <Image
                source={{ uri: plantData.imageUrl }}
                style={styles.plantImage}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="leaf-outline" size={48} color="#bbb" />
              </View>
            )}
          </View>
          <View style={styles.fullInfoContainer}>
          <Text style={styles.plantName}>{plantData.name}</Text>
          <Text style={styles.plantScientificName}>{plantData.scientificName}</Text>
          
          
          {/* Description section */}
          <View style={styles.infoBox}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.basicInfoContainer}>
            <Text style={styles.plantDetail}>Family: {plantData.family}</Text>
            {plantData.floweringSeason && (
              <Text style={styles.plantDetail}>Flowering: {plantData.floweringSeason}</Text>
            )}
            <Text style={styles.plantDetail}>Watering: {plantData.watering}</Text>
          </View>
            <Text style={styles.descriptionText}>{plantData.description}</Text>
          </View>
          
          {/* Care details section */}
          <View style={styles.infoBox}>
            <Text style={styles.sectionTitle}>Care Details</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sunlight:</Text>
              <Text style={styles.infoValue}>{formatArrayToString(plantData.sunlight)}</Text>
            </View>
            
            {plantData.sunlightDuration && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Daily Sun:</Text>
                <Text style={styles.infoValue}>{formatSunlightDuration()}</Text>
              </View>
            )}
            
            {plantData.pruningMonth.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Prune in:</Text>
                <Text style={styles.infoValue}>{formatArrayToString(plantData.pruningMonth)}</Text>
              </View>
            )}
          </View>
          
          {/* Wildlife attraction section */}
          {plantData.attracts.length > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.sectionTitle}>Attracts</Text>
              <Text style={styles.infoValue}>{formatArrayToString(plantData.attracts)}</Text>
            </View>
          )}
          </View>
        </>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.buttonContainer}>
        <TouchableHighlight 
          style={styles.buttonContainerGray}
          onPress={handleClose}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableHighlight>
        <TouchableHighlight 
          style={styles.buttonContainerYellow}
          onPress={() => handleAddToGarden(plantData)}
          disabled={loading}
        >
          <View style={styles.addButton}>
          <Svg width={24} height={28} viewBox="0 0 150 212">
            <Path d="M43.2793 1.41739C49.6466 -0.588376 56.1307 0.925285 61.7197 4.28556C67.2619 7.61782 72.3805 12.9841 76.8564 19.8266C86.1511 34.0356 87.0864 45.9996 86.1484 56.7934C85.9243 59.3726 85.5955 61.8749 85.2803 64.2055C84.9579 66.5891 84.6549 68.7596 84.4268 70.9438C83.9765 75.2533 83.8737 79.179 84.5674 83.1899C84.6396 83.6073 84.7254 84.0252 84.8203 84.4438C86.1958 80.1391 88.1099 75.6542 91.0615 71.1928C95.2294 64.8929 101.202 59.0293 109.897 53.6859C118.537 48.3768 127.072 45.8859 134.666 47.8061C142.836 49.8721 147.453 56.3527 149.151 63.3774C152.369 76.6882 146.358 94.69 133.292 108.072C126.518 115.009 119.19 119.153 111.63 120.528C104.621 121.802 98.0146 120.582 92.2725 117.849C90.9538 120.735 89.2821 123.627 87.0967 126.459C88.9887 130.508 90.5608 134.687 91.8018 138.937C98.65 162.393 95.7042 188.924 80.3389 208.88L80.0791 209.201C77.3306 212.419 72.5105 212.95 69.1191 210.339C65.6183 207.644 64.9657 202.62 67.6611 199.12L68.2041 198.402C79.467 183.238 82.0314 162.561 76.4434 143.421C75.848 141.382 75.1614 139.371 74.3887 137.395C66.5964 141.71 57.6651 143.404 48.8984 142.878C35.1193 142.052 21.1573 135.761 11.1894 124.817C6.32128 119.472 2.79537 113.653 1.10839 107.863C-0.566437 102.114 -0.585647 95.6846 2.7705 90.2104C6.226 84.5742 12.2072 81.6491 18.9521 80.9486C25.5685 80.2615 33.4415 81.5985 42.3428 84.8168L43.5381 85.2602C57.7784 90.6745 69.2823 99.8501 77.792 111.035C78.2939 109.92 78.7376 108.769 79.1357 107.574C73.7519 101.262 70.1106 93.484 68.8018 85.9164C67.756 79.8697 67.9881 74.3115 68.5137 69.2807C68.7734 66.7946 69.118 64.3296 69.4248 62.0609C69.7388 59.7394 70.021 57.5712 70.209 55.4086C70.9193 47.2344 70.3332 39.0823 63.4668 28.5854C59.8622 23.0748 56.3482 19.7256 53.4756 17.9984C50.6498 16.2995 48.9352 16.4109 48.0869 16.6781C47.2214 16.9508 45.568 17.9189 43.9717 21.3529C42.3571 24.8262 41.0987 30.2833 40.999 38.102C40.8103 52.9056 46.0056 59.7163 50.1191 63.018C52.3391 64.7998 54.5757 65.8203 56.2383 66.3881C57.063 66.6698 57.7215 66.831 58.1269 66.9164C58.328 66.9588 58.4632 66.9824 58.5215 66.9916C58.5337 66.9935 58.5427 66.9948 58.5478 66.9955C58.5418 66.9947 58.5308 66.9936 58.5146 66.9916C58.5063 66.9906 58.4964 66.989 58.4853 66.9877C58.4799 66.9871 58.4739 66.9865 58.4678 66.9858C58.4648 66.9854 58.4598 66.985 58.458 66.9848H58.457C62.8424 67.4856 65.9938 71.4443 65.498 75.8315C65.0017 80.2216 61.0406 83.3784 56.6504 82.8822L57.5732 74.7192C57.5653 74.7897 57.5569 74.8612 57.5488 74.933C56.6505 82.8821 56.6451 82.8819 56.6396 82.8813C56.6376 82.881 56.6326 82.8797 56.6289 82.8793C56.6211 82.8784 56.6121 82.8774 56.6035 82.8764C56.5865 82.8744 56.568 82.872 56.5478 82.8695C56.5071 82.8645 56.4594 82.8591 56.4062 82.852C56.3 82.8376 56.1693 82.8187 56.0156 82.7943C55.708 82.7456 55.3068 82.674 54.8262 82.5727C53.8671 82.3705 52.5768 82.0446 51.0664 81.5287C48.0581 80.5012 44.0751 78.6842 40.1035 75.4965C31.8338 68.859 24.7548 57.2033 25.001 37.8979C25.1187 28.662 26.5942 20.779 29.4629 14.6078C32.3497 8.39789 36.9293 3.41786 43.2793 1.41739ZM36.9033 99.8637C29.2961 97.1132 23.9687 96.5133 20.6045 96.8627C17.3692 97.1988 16.5886 98.2842 16.4111 98.5736C16.1343 99.0255 15.6105 100.438 16.4697 103.387C17.317 106.296 19.3647 110.033 23.0176 114.043C30.092 121.811 40.1113 126.322 49.8564 126.907C56.097 127.281 61.9761 126.05 66.8906 123.246C59.8796 113.089 50.0641 104.858 37.8418 100.211L36.9033 99.8637ZM130.744 63.3178C129.205 62.9286 125.291 63.0065 118.274 67.3178C111.314 71.5949 107.134 75.8963 104.405 80.0209C101.655 84.1773 100.115 88.5482 98.9131 93.4115C98.3002 95.8906 97.8047 98.3624 97.2402 101.083C97.1631 101.455 97.0818 101.831 97.0019 102.21C97.4552 102.499 97.9149 102.77 98.3818 103.018C101.674 104.769 105.156 105.442 108.768 104.786C112.406 104.124 116.876 101.982 121.844 96.894C132.262 86.2242 135.165 73.614 133.6 67.1371C132.906 64.2687 131.707 63.5613 130.744 63.3178Z" fill="black"/>
          </Svg>
          <Text style={{'fontSize': 16, 'marginLeft': 4}}>+</Text>
          </View>
        </TouchableHighlight>
      </View>
    </ScrollView>
  );
}

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  plantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5167F2',
    marginTop: 12,
  },
  fullInfoContainer: {
    paddingLeft: 20,
    paddingRight: 20
  },
  title: {
    color: '#5167F2',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 40,
  },
  infoBox: {
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  plantItem: {
    backgroundColor: '#F5F7FF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#5167F2',
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '500',
  },
  plantDetail: {
    fontSize: 12,
    color: '#555',
  },
  plantScientificName: {
    fontStyle: 'italic',
    color: '#555',
    marginBottom: 12
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 40,
    gap: 12
  },
  buttonContainerYellow: {
    flex: 1,
    backgroundColor: '#F1EB91',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  buttonContainerGray: {
    flex: 1,
    backgroundColor: '#D9D9D9',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginVertical: 20,
  },
  plantHeader: {
    width: '100%',
  },
  plantImage: {
    width: '100%',
    minHeight: 200
  },
  placeholderImage: {
    width: 100,
    height: 100,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basicInfoContainer: {
    flex: 1,
    marginBottom: 4
  },
  descriptionText: {
    fontSize: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    width: 80,
  },
  infoValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
});
