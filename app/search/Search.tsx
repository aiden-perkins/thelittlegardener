import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, TextInput, TouchableOpacity, Keyboard, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
        console.log(`Fetching browse page: ${pageToFetch}`);
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('page', pageToFetch.toString());

            const response = await fetch('/api/browse', {
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
        console.log('Performing search for:', query);
        Keyboard.dismiss();
        setLoading(true);
        setIsSearching(true);
        setError(null);
        setCurrentPage(0);
        setHasMorePages(true);

        try {
            const formData = new FormData();
            formData.append('query', query);

            const response = await fetch('/api/search', {
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
        <View style={styles.plantItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.image_url ? (
                    <img 
                        src={item.image_url} 
                        style={{ width: 50, height: 50, marginRight: 10, borderRadius: 4 }} 
                    />
                ) : (
                    <View style={{ width: 50, height: 50, marginRight: 10, backgroundColor: '#eee', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="leaf-outline" size={24} color="#bbb" />
                    </View>
                )}
                <View>
                    <Text style={styles.plantName}>{item.name || 'N/A'}</Text>
                    <Text style={styles.plantDetail}>Scientific Name: {item.scientific_name || 'N/A'}</Text>
                    <Text style={styles.plantDetail}>Family: {item.family || 'N/A'}</Text>
                </View>
            </View>
        </View>
    );

    const renderListFooter = () => {
        if (!isSearching && loading && currentPage > 0) {
            return <ActivityIndicator size="large" color="#333" style={styles.footerLoading} />;
        }
        if (!isSearching && !hasMorePages && displayedPlants.length > 0) {
             return <Text style={styles.endOfListText}>End of Plant List</Text>;
        }
        return null;
    };

    return (
        <View style={styles.screenContainer}>
            <View style={styles.searchBarContainer}>
                <Ionicons
                    name="search"
                    size={28}
                    color="#333"
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search plants by name..."
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
                    <TouchableOpacity onPress={handleClearSearch} style={styles.clearIcon}>
                        <Ionicons name="close-circle" size={20} color="#888" />
                    </TouchableOpacity>
                )}
                {loading && isSearching && searchQuery.length > 0 && (
                    <ActivityIndicator size="small" color="#333" style={styles.loadingIndicator} />
                )}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <FlatList
                data={displayedPlants}
                renderItem={renderPlantItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.resultsList}
                contentContainerStyle={styles.resultsListContent}
                ListEmptyComponent={!loading ? <Text style={styles.noResultsText}>{isSearching ? 'No results found.' : 'No plants to display.'}</Text> : null}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderListFooter}
            />
        </View>
    );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 15, // Reduced horizontal padding slightly
    paddingTop: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F0D7', // Lighter green for less intensity
    borderRadius: 25, // Slightly less rounded
    paddingHorizontal: 15,
    paddingVertical: 8, // Adjusted padding
    width: '100%',
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 2,
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
        paddingBottom: 20, // Add padding at the bottom of the list
    },
  plantItem: {
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  plantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32', // Darker green for name
    marginBottom: 4,
  },
  plantDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
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
});
