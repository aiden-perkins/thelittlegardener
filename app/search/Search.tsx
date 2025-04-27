import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, Image, StyleSheet, TextInput, TouchableOpacity, Keyboard, ActivityIndicator, FlatList, TouchableHighlight } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { API_BASE_URL } from '@/lib/config';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Plant {
  id: number;
  name: string;
  scientific_name: string | null;
  family: string | null;
  image_url: string | null;
}

interface BrowseApiResponse {
  success: boolean;
  message: string;
  plants?: Plant[];
  currentPage?: number;
  hasMorePages?: boolean;
  error?: string;
}

interface SearchApiResponse {
  success: boolean;
  message: string;
  plants?: Plant[];
  error?: string;
}

export default function SearchScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [displayedPlants, setDisplayedPlants] = useState<Plant[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMorePages, setHasMorePages] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    const fetchBrowsePage = useCallback(async (pageToFetch: number) => {
        if (loading || pageToFetch === 0) return;
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('page', pageToFetch.toString());

            const response = await fetch(`${API_BASE_URL}/api/browse`, {
                method: 'POST',
                body: formData,
            });

            const result: BrowseApiResponse = await response.json();

            if (response.ok && result.success && result.plants) {
                setDisplayedPlants(prevPlants =>
                    pageToFetch === 1 ? result.plants! : [...prevPlants, ...result.plants!]
                );
                setCurrentPage(result.currentPage ?? pageToFetch);
                setHasMorePages(result.hasMorePages ?? false);
            } else {
                setError(result.message || `Failed to fetch page ${pageToFetch}`);
                setHasMorePages(false);
                console.error("Browse API Error Response:", result);
            }
        } catch (err: any) {
            console.error('Browse fetch error:', err);
            setError(`Failed to load plants. ${err.message || ''}`);
            setHasMorePages(false);
        } finally {
            setLoading(false);
        }
    }, [loading]);


    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) return;
        Keyboard.dismiss();
        setLoading(true);
        setIsSearching(true);
        setError(null);
        setCurrentPage(0);
        setHasMorePages(true);

        try {
            const formData = new FormData();
            formData.append('query', query);

            const response = await fetch(`${API_BASE_URL}/api/search`, {
                method: 'POST',
                body: formData,
            });

            const result: SearchApiResponse = await response.json();

            if (response.ok && result.success && result.plants) {
                setDisplayedPlants(result.plants);
            } else {
                setError(result.message || `Search failed for "${query}"`);
                setDisplayedPlants([]);
                console.error("Search API Error Response:", result);
            }
        } catch (err: any) {
            console.error('Search fetch error:', err);
            setError(`Search failed. ${err.message || ''}`);
            setDisplayedPlants([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isSearching && currentPage === 0) {
             fetchBrowsePage(1);
        }
    }, [isSearching, fetchBrowsePage, currentPage]);

    const handleSearchSubmit = () => {
        performSearch(searchQuery);
    };
    
    const handleAddToGarden = (plant: Plant) => {
      AsyncStorage.setItem('triggerGardenRefresh', 'true')
        .then(() => {
          router.push({
            pathname: '/plant/AddPlant',
            params: {
              id: plant.id.toString(),
              name: plant.name,
              scientific_name: plant.scientific_name || '',
              family: plant.family || '',
              image_url: plant.image_url || '',
              source: '/search/Search'
            }
          });
        });
    };
    
    const handlePlantDetails = (plant: Plant) => {
      router.push({
        pathname: '/plant/PlantDetails',
        params: {
          id: plant.id.toString(),
          source: '/search/Search'
        }
      });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        Keyboard.dismiss();
        setError(null);
        setIsSearching(false);
        setDisplayedPlants([]);
        setCurrentPage(0);
        setHasMorePages(true);
    };

    const handleLoadMore = () => {
        if (!loading && !isSearching && hasMorePages) {
             fetchBrowsePage(currentPage + 1);
        }
    };
    const renderPlantItem = ({ item }: { item: Plant }) => (
        <TouchableOpacity style={searchStyles.plantItem} onPress={() => handlePlantDetails(item)}>
            <View style={searchStyles.flexSpace}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {item.image_url ? (
                      <Image 
                          source={{uri: item.image_url}} 
                          style={{ width: 48, height: 48, marginRight: 10, borderRadius: 4 }} 
                      />
                  ) : (
                      <View style={{ width: 48, height: 48, marginRight: 10, backgroundColor: '#eee', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="leaf-outline" size={24} color="#bbb" />
                      </View>
                  )}
                  <View>
                      <Text style={searchStyles.plantName}
                          >{item.name || 'N/A'}</Text>
                      <Text style={searchStyles.plantDetail}
                        numberOfLines={1}
                        ellipsizeMode="tail">{item.scientific_name || 'N/A'}</Text>
                      <Text style={searchStyles.plantDetail}>Family: {item.family || 'N/A'}</Text>
                  </View>
              </View>
              <TouchableHighlight style={searchStyles.addButton} onPress={() => handleAddToGarden(item)}>
                  <View style={searchStyles.flexSpace}>
                  <Svg width={24} height={24} viewBox="0 0 36 36">
                      <Path d="M32.1328 0.00390625C32.6158 0.036123 33.0734 0.243282 33.418 0.589844C33.7624 0.936493 33.9668 1.39582 33.9961 1.87891L33.998 2.08594C33.7954 6.74624 32.6108 9.78064 30.457 12.1484L30.0137 12.6133L29.8496 12.7617C27.6706 14.5049 24.8159 15.5592 21.2676 15.9062C20.81 16.9923 20.6886 18.123 20.75 19.3594C20.7897 20.1584 20.903 20.9792 21.043 21.8594C21.1776 22.7056 21.3489 23.6656 21.4609 24.582C21.6871 26.4311 21.748 28.5673 20.7656 30.6367C20.54 31.1118 20.2662 31.5651 19.9453 32H28C29.1046 32 30 32.8954 30 34C30 35.1046 29.1046 36 28 36H8C6.89543 36 6 35.1046 6 34C6 32.8954 6.89543 32 8 32H13.5371C15.7514 30.9295 16.7081 29.8557 17.1523 28.9199C17.6385 27.8957 17.689 26.6938 17.4902 25.0684C17.3898 24.2474 17.2443 23.4348 17.0937 22.4883C17.0855 22.4367 17.0785 22.3842 17.0703 22.332C13.3412 22.9882 10.0753 22.9656 7.10547 21.3867V21.3887C7.09687 21.3844 7.08866 21.3793 7.08008 21.375C7.0711 21.3702 7.06171 21.3662 7.05273 21.3613V21.3594C4.22989 19.9269 1.89443 17.0859 0.380857 12.6895L0.0859346 11.7832C-0.0805228 11.2363 -0.00357196 10.6438 0.294919 10.1562C0.593416 9.66871 1.08567 9.33096 1.64843 9.23047C7.64925 8.15893 11.4358 9.19085 14.1758 11.1836C15.498 12.1452 16.5457 13.4191 17.3926 14.8281C17.555 14.3817 17.7526 13.9339 17.9922 13.4863C18.0033 10.4543 18.877 7.48289 20.5156 4.92188L20.7129 4.66211L21.1133 4.23242C22.0803 3.2348 23.2844 2.27045 24.9023 1.51367C26.7409 0.653712 29.0138 0.109803 31.9258 0.00195312L32.1328 0.00390625ZM11.8242 14.418C10.4398 13.4111 8.39208 12.5724 4.73437 12.8594C5.85613 15.4146 7.23999 16.8659 8.5625 17.6328L8.89453 17.8105L8.94726 17.8398C10.4858 18.6683 12.2975 18.9131 14.8496 18.6172C14.0277 16.7637 13.0436 15.305 11.8242 14.418ZM29.7832 4.21289C28.4629 4.41942 27.429 4.74792 26.5977 5.13672C25.4084 5.69298 24.543 6.4103 23.8008 7.21289C22.9351 8.60609 22.3684 10.1553 22.1269 11.7637C24.3873 11.3891 26.0449 10.6517 27.2617 9.70508C28.4729 8.467 29.3738 6.89814 29.7832 4.21289Z" fill="black"/>
                  </Svg>
                  <Text style={{'fontSize': 16, 'marginLeft': 4}}>+</Text>
                  </View>
              </TouchableHighlight>
            </View>
        </TouchableOpacity>
    );

    const renderListFooter = () => {
        if (!isSearching && loading && currentPage > 0) {
            return <ActivityIndicator size="large" color="#333" style={searchStyles.footerLoading} />;
        }
        if (!isSearching && !hasMorePages && displayedPlants.length > 0) {
             return <Text style={searchStyles.endOfListText}>End of Plant List</Text>;
        }
        return null;
    };

    return (
        <View style={searchStyles.screenContainer}>
            <Text style={searchStyles.title}>Explore Plants</Text>
            <View style={searchStyles.searchBarContainer}>
                <Ionicons
                    name="search"
                    size={28}
                    color="#333"
                    style={searchStyles.searchIcon}
                />
                <TextInput
                    style={searchStyles.searchInput}
                    placeholder="Search by name"
                    placeholderTextColor="#555"
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        if (text.trim() === '' && isSearching) {
                             handleClearSearch();
                        }
                    }}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                    editable={!loading || (loading && isSearching)}
                />
                {searchQuery.length > 0 && (!loading || isSearching) && (
                    <TouchableOpacity onPress={handleClearSearch} style={searchStyles.clearIcon}>
                        <Ionicons name="close-circle" size={20} color="#888" />
                    </TouchableOpacity>
                )}
                {loading && isSearching && searchQuery.length > 0 && (
                    <ActivityIndicator size="small" color="#333" style={searchStyles.loadingIndicator} />
                )}
            </View>
            {error && <Text style={searchStyles.errorText}>{error}</Text>}
            <FlatList
                data={displayedPlants}
                renderItem={renderPlantItem}
                keyExtractor={(item) => item.id.toString()}
                style={searchStyles.resultsList}
                contentContainerStyle={searchStyles.resultsListContent}
                ListEmptyComponent={!loading ? <Text style={searchStyles.noResultsText}>{isSearching ? 'No results found.' : 'No plants to display.'}</Text> : null}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderListFooter}
            />
        </View>
    );
}

const searchStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 15, // Reduced horizontal padding slightly
    paddingTop: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3E51CC',
    marginTop: 60,
    textAlign: 'center'
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F0D7', // Lighter green for less intensity
    borderRadius: 25, // Slightly less rounded
    paddingHorizontal: 15,
    paddingVertical: 8, // Adjusted padding
    width: '100%',
    marginBottom: 16,
    marginTop: 16
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 5,
  },
  clearIcon: {
    marginLeft: 8,
    padding: 5,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  resultsList: {
    flex: 1,
    width: '100%',
  },
    resultsListContent: {
        paddingTop: 5,
        paddingBottom: 20, // Add padding at the bottom of the list
    },
  plantItem: {
    backgroundColor: '#F5F7FF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  plantName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5167F2',
    marginBottom: 2,
    maxWidth: 180
  },
  plantDetail: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#555',
    marginBottom: 0,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 16,
  },
  noResultsText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#777',
  },
  footerLoading: {
        marginVertical: 20,
    },
   endOfListText: {
      textAlign: 'center',
      paddingVertical: 15,
      color: '#888',
      fontSize: 14,
    },
    addButton: {
        backgroundColor: '#F1EB91',
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        right: 0,
        padding: 10,
        position: 'absolute'
    },
    buttonText: {
        fontSize: 16,
        textAlign: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    flexSpace: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    }
});
