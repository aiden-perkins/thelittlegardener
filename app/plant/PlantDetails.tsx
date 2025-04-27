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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Plant Insights</Text>

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
            <View style={styles.basicInfoContainer}>
              <Text style={styles.plantName}>{plantData.name}</Text>
              <Text style={styles.plantDetail}>Scientific Name: {plantData.scientificName}</Text>
              <Text style={styles.plantDetail}>Family: {plantData.family}</Text>
              {plantData.floweringSeason && (
                <Text style={styles.plantDetail}>Flowering: {plantData.floweringSeason}</Text>
              )}
            </View>
          </View>
          
          {/* Description section */}
          <View style={styles.infoBox}>
            <Text style={styles.sectionTitle}>Description</Text>
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
        </>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.buttonContainer}>
        <TouchableHighlight 
          style={styles.buttonContainerGray}
          onPress={handleClose}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Close</Text>
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
    padding: 20,
  },
  plantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5167F2',
    marginBottom: 4,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#5167F2',
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '500',
  },
  plantDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  buttonContainerGreen: {
    flex: 1,
    backgroundColor: '#BBEA9B',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  buttonContainerGray: {
    flex: 1,
    backgroundColor: '#D9D9D9',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 200,
  },
  buttonText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
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
    flexDirection: 'row',
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEE',
    alignItems: 'center',
  },
  plantImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 15,
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
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    width: 80,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
});
