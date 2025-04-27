import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Image,
  StyleSheet, 
  TouchableHighlight, 
  ScrollView,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ExternalPathString } from 'expo-router';
import { API_BASE_URL } from '@/lib/config';

export default function AddPlant() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract parameters from the route params
  const id = params.id as string | undefined;
  const name = params.name as string | undefined;
  const scientific_name = params.scientific_name as string | undefined;
  const family = params.family as string | undefined;
  const image_url = params.image_url as string | undefined;
  const goBackTo = params.source as ExternalPathString;

  const [plantData, setPlantData] = useState({
    name: name || '',
    scientificName: scientific_name || '',
    family: family || '',
    imageUrl: image_url || '',
    customName: '', // This will be the custom_name in the UserPlants schema
    location: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setPlantData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddPlant = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user from storage
      const userJson = await AsyncStorage.getItem('user');
      if (!userJson) {
        Alert.alert('Error', 'You must be logged in to add plants to your garden.');
        router.push('/user/Profile');
        return;
      }

      const user = JSON.parse(userJson);

      // Validate required fields
      if (!plantData.customName.trim()) {
        setError('Please provide a custom name for your plant');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('username', user.username);
      formData.append('custom_name', plantData.customName);
      const currentPlantId = params.id as string | undefined;
      formData.append('plantId', currentPlantId || '');
      formData.append('location', plantData.location);
      formData.append('notes', plantData.notes);
      const currentImageUrl = params.image_url as string | undefined;
      formData.append('image_url', currentImageUrl || '');

      // Call API to add plant to user's garden
      const response = await fetch(`${API_BASE_URL}/api/addplant`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', 'Plant added to your garden!');
        resetForm(); // Reset the form fields
        router.push('/'); // Navigate back to garden view
      } else {
        setError(result.message || 'Failed to add plant to garden');
      }
    } catch (err: any) {
      setError('Error adding plant: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setPlantData({
      ...plantData,
      customName: '',
      location: '',
      notes: '',
    });
  };

  const handleCancel = () => {
    router.push(goBackTo);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add Plant to Your Garden</Text>

      {/* Plant details from API or detection */}
      <View style={styles.plantItem}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {image_url ? (
              <Image
              source={{ uri: image_url }}
              style={{ width: 64, height: 64, marginRight: 10, borderRadius: 4 }}
                />
            ) : (
                <View style={{ width: 64, height: 64, marginRight: 10, backgroundColor: '#eee', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="leaf-outline" size={24} color="#bbb" />
                </View>
            )}
            <View>
                <Text style={styles.plantName}>{name || 'N/A'}</Text>
                <Text style={styles.plantDetail}>Scientific Name: {scientific_name || 'N/A'}</Text>
                <Text style={styles.plantDetail}>Family: {family || 'N/A'}</Text>
            </View>
        </View>
      </View>

      {/* User customization */}
      <View style={styles.infoBox}>
        <Text style={styles.sectionTitle}>Your Plant Details</Text>

        <Text style={styles.label}>Custom Name</Text>
        <TextInput
          style={styles.inputField}
          value={plantData.customName}
          onChangeText={(value) => handleChange('customName', value)}
          placeholder="Give your plant a custom name"
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.inputField}
          value={plantData.location}
          onChangeText={(value) => handleChange('location', value)}
          placeholder="Where is this plant located?"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.inputField, styles.textArea]}
          value={plantData.notes}
          onChangeText={(value) => handleChange('notes', value)}
          placeholder="Any notes about your plant"
          multiline={true}
          numberOfLines={4}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.buttonContainer}>
        <TouchableHighlight 
          style={styles.buttonContainerGray}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableHighlight>

        <TouchableHighlight 
          style={styles.buttonContainerGreen}
          onPress={handleAddPlant}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Adding...' : 'Add to Garden'}
          </Text>
        </TouchableHighlight>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  plantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5167F2', // Darker green for name
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
  inputField: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderColor: '#D9D9D9',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginRight: 6,
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
});
