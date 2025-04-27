import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, Image, StyleSheet, TextInput, TouchableOpacity, Keyboard, ActivityIndicator, FlatList, TouchableHighlight } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { API_BASE_URL } from '@/lib/config';
import Svg, { Circle, Path } from 'react-native-svg';
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
                  <Svg width={24} height={24} viewBox="0 0 150 212">
                    <Path d="M43.2793 1.41739C49.6466 -0.588376 56.1307 0.925285 61.7197 4.28556C67.2619 7.61782 72.3805 12.9841 76.8564 19.8266C86.1511 34.0356 87.0864 45.9996 86.1484 56.7934C85.9243 59.3726 85.5955 61.8749 85.2803 64.2055C84.9579 66.5891 84.6549 68.7596 84.4268 70.9438C83.9765 75.2533 83.8737 79.179 84.5674 83.1899C84.6396 83.6073 84.7254 84.0252 84.8203 84.4438C86.1958 80.1391 88.1099 75.6542 91.0615 71.1928C95.2294 64.8929 101.202 59.0293 109.897 53.6859C118.537 48.3768 127.072 45.8859 134.666 47.8061C142.836 49.8721 147.453 56.3527 149.151 63.3774C152.369 76.6882 146.358 94.69 133.292 108.072C126.518 115.009 119.19 119.153 111.63 120.528C104.621 121.802 98.0146 120.582 92.2725 117.849C90.9538 120.735 89.2821 123.627 87.0967 126.459C88.9887 130.508 90.5608 134.687 91.8018 138.937C98.65 162.393 95.7042 188.924 80.3389 208.88L80.0791 209.201C77.3306 212.419 72.5105 212.95 69.1191 210.339C65.6183 207.644 64.9657 202.62 67.6611 199.12L68.2041 198.402C79.467 183.238 82.0314 162.561 76.4434 143.421C75.848 141.382 75.1614 139.371 74.3887 137.395C66.5964 141.71 57.6651 143.404 48.8984 142.878C35.1193 142.052 21.1573 135.761 11.1894 124.817C6.32128 119.472 2.79537 113.653 1.10839 107.863C-0.566437 102.114 -0.585647 95.6846 2.7705 90.2104C6.226 84.5742 12.2072 81.6491 18.9521 80.9486C25.5685 80.2615 33.4415 81.5985 42.3428 84.8168L43.5381 85.2602C57.7784 90.6745 69.2823 99.8501 77.792 111.035C78.2939 109.92 78.7376 108.769 79.1357 107.574C73.7519 101.262 70.1106 93.484 68.8018 85.9164C67.756 79.8697 67.9881 74.3115 68.5137 69.2807C68.7734 66.7946 69.118 64.3296 69.4248 62.0609C69.7388 59.7394 70.021 57.5712 70.209 55.4086C70.9193 47.2344 70.3332 39.0823 63.4668 28.5854C59.8622 23.0748 56.3482 19.7256 53.4756 17.9984C50.6498 16.2995 48.9352 16.4109 48.0869 16.6781C47.2214 16.9508 45.568 17.9189 43.9717 21.3529C42.3571 24.8262 41.0987 30.2833 40.999 38.102C40.8103 52.9056 46.0056 59.7163 50.1191 63.018C52.3391 64.7998 54.5757 65.8203 56.2383 66.3881C57.063 66.6698 57.7215 66.831 58.1269 66.9164C58.328 66.9588 58.4632 66.9824 58.5215 66.9916C58.5337 66.9935 58.5427 66.9948 58.5478 66.9955C58.5418 66.9947 58.5308 66.9936 58.5146 66.9916C58.5063 66.9906 58.4964 66.989 58.4853 66.9877C58.4799 66.9871 58.4739 66.9865 58.4678 66.9858C58.4648 66.9854 58.4598 66.985 58.458 66.9848H58.457C62.8424 67.4856 65.9938 71.4443 65.498 75.8315C65.0017 80.2216 61.0406 83.3784 56.6504 82.8822L57.5732 74.7192C57.5653 74.7897 57.5569 74.8612 57.5488 74.933C56.6505 82.8821 56.6451 82.8819 56.6396 82.8813C56.6376 82.881 56.6326 82.8797 56.6289 82.8793C56.6211 82.8784 56.6121 82.8774 56.6035 82.8764C56.5865 82.8744 56.568 82.872 56.5478 82.8695C56.5071 82.8645 56.4594 82.8591 56.4062 82.852C56.3 82.8376 56.1693 82.8187 56.0156 82.7943C55.708 82.7456 55.3068 82.674 54.8262 82.5727C53.8671 82.3705 52.5768 82.0446 51.0664 81.5287C48.0581 80.5012 44.0751 78.6842 40.1035 75.4965C31.8338 68.859 24.7548 57.2033 25.001 37.8979C25.1187 28.662 26.5942 20.779 29.4629 14.6078C32.3497 8.39789 36.9293 3.41786 43.2793 1.41739ZM36.9033 99.8637C29.2961 97.1132 23.9687 96.5133 20.6045 96.8627C17.3692 97.1988 16.5886 98.2842 16.4111 98.5736C16.1343 99.0255 15.6105 100.438 16.4697 103.387C17.317 106.296 19.3647 110.033 23.0176 114.043C30.092 121.811 40.1113 126.322 49.8564 126.907C56.097 127.281 61.9761 126.05 66.8906 123.246C59.8796 113.089 50.0641 104.858 37.8418 100.211L36.9033 99.8637ZM130.744 63.3178C129.205 62.9286 125.291 63.0065 118.274 67.3178C111.314 71.5949 107.134 75.8963 104.405 80.0209C101.655 84.1773 100.115 88.5482 98.9131 93.4115C98.3002 95.8906 97.8047 98.3624 97.2402 101.083C97.1631 101.455 97.0818 101.831 97.0019 102.21C97.4552 102.499 97.9149 102.77 98.3818 103.018C101.674 104.769 105.156 105.442 108.768 104.786C112.406 104.124 116.876 101.982 121.844 96.894C132.262 86.2242 135.165 73.614 133.6 67.1371C132.906 64.2687 131.707 63.5613 130.744 63.3178Z" fill="black"/>
                  </Svg>
                  <Text style={{'fontSize': 16, 'marginLeft': 4, 'marginRight': 2}}>+</Text>
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
            {/* stars */}
            <Svg width="50" height="50" viewBox="0 0 50 50" fill="none" style={searchStyles.star1}>
              <Path d="M23.1243 2.069C23.7686 0.327768 26.2314 0.327775 26.8757 2.06901L32.2434 16.575C32.446 17.1224 32.8776 17.554 33.425 17.7566L47.931 23.1243C49.6722 23.7686 49.6722 26.2314 47.931 26.8757L33.425 32.2434C32.8776 32.446 32.446 32.8776 32.2434 33.425L26.8757 47.931C26.2314 49.6722 23.7686 49.6722 23.1243 47.931L17.7566 33.425C17.554 32.8776 17.1224 32.446 16.575 32.2434L2.069 26.8757C0.327768 26.2314 0.327775 23.7686 2.06901 23.1243L16.575 17.7566C17.1224 17.554 17.554 17.1224 17.7566 16.575L23.1243 2.069Z"
                fill="#F6E54B"/>
            </Svg>
            <Svg width="33" height="33" viewBox="0 0 33 33" fill="none" style={searchStyles.star2}>
              <Path d="M14.5237 1.734C14.8741 -0.523696 18.1259 -0.523687 18.4763 1.734L19.9703 11.3601C20.1039 12.2208 20.7792 12.8961 21.6399 13.0297L31.266 14.5237C33.5237 14.8741 33.5237 18.1259 31.266 18.4763L21.6399 19.9703C20.7792 20.1039 20.1039 20.7792 19.9703 21.6399L18.4763 31.266C18.1259 33.5237 14.8741 33.5237 14.5237 31.266L13.0297 21.6399C12.8961 20.7792 12.2208 20.1039 11.3601 19.9703L1.734 18.4763C-0.523696 18.1259 -0.523687 14.8741 1.734 14.5237L11.3601 13.0297C12.2208 12.8961 12.8961 12.2208 13.0297 11.3601L14.5237 1.734Z"
                fill="#F6E54B"/>
            </Svg>
            {/* circles */}
            <Svg width="33" height="33" viewBox="0 0 33 33" fill="none" style={searchStyles.circle1}>
              <Circle cx={6} cy={6} r={6} fill="#F6E54B"/>
            </Svg>
            <Svg width="33" height="33" viewBox="0 0 33 33" fill="none" style={searchStyles.circle2}>
              <Circle cx={4} cy={4} r={4} fill="#F6E54B"/>
            </Svg>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3E51CC',
    marginTop: 60,
    textAlign: 'center'
  },
  
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F0D7', // Lighter green for less intensity
    borderRadius: 20, 
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 13,
  },
  flexSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5167F2',
    marginBottom: 2,
    maxWidth: 180
  },
  plantDetail: {
    fontSize: 12,
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
        backgroundColor: '#F3E886',
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

    star1: {
      position: 'absolute',
      right: '8%',
      top: '2%'
    },
    star2: {
      position: 'absolute',
      left: '7%',
      top: '4%'
    },
    circle1: {
      position: 'absolute',
      right: '30%',
      top: '8%'
    },
    circle2: {
      position: 'absolute',
      left: '30%',
      top: '3%'
    },
});
