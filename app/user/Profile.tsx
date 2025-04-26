import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, TouchableHighlight } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function ProfilePage() {
  const [mode, setMode] = useState<'initial' | 'login' | 'create'>('initial');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const user = await AsyncStorage.getItem('user');
    if (user) {
      setIsLoggedIn(true);
      setUsername(JSON.parse(user).username);
    }
  };

  const handleLogin = async () => {
    try {
      const formData = new FormData();
      
      formData.append('username', username);
      formData.append('password', password);
      
      const uploadResponse = await fetch('/api/login', {
        method: 'POST',
        body: formData
      });
      
      const response = await uploadResponse.json();
      
      if (response.success) {
        await AsyncStorage.setItem('user', JSON.stringify({ username }));
        setIsLoggedIn(true);
        setError(null);
      } else {
        setError(`Login failed: ${response.message}`);
      }
      
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  const handleCreateAccount = async () => {
    try {
      const formData = new FormData();
      
      formData.append('username', username);
      formData.append('password', password);
      
      const uploadResponse = await fetch('/api/createaccount', {
        method: 'POST',
        body: formData
      });
      
      const response = await uploadResponse.json();
      
      if (response.success) {
        await AsyncStorage.setItem('user', JSON.stringify({ username }));
        setIsLoggedIn(true);
        setError(null);
      } else {
        setError(`Account creation failed: ${response.message}`);
      }
      
    } catch (err) {
      setError('Account creation failed. Please try again.');
    }
  };
  
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setIsLoggedIn(false);
      setError(null);
      setMode('initial');
    } catch (err) {
      setError('Logout failed. Please try again.');
    }
  };

  if (isLoggedIn) {
    return (
      <View style={profileStyles.container}>
        <View style={profileStyles.profileWrapper}>
          <Image source={require('../../assets/images/defaultprofile.jpg')}
              style={profileStyles.profileImage}/>
          <View>
            <Text style={profileStyles.title}>{username}</Text>
            <Text>Plants: 0</Text>
          </View>
        </View>
        <View style={profileStyles.buttonContainer}>
          <TouchableHighlight style={profileStyles.buttonContainerGreen}  onPress={handleLogout}>
              <Text style={profileStyles.buttonText}>Log out</Text>
          </TouchableHighlight>
        </View>
      </View>
    );
  }

  return (
    <View style={profileStyles.container}>
      {mode === 'initial' ? (
        <View>
          <Text style={profileStyles.title}>Welcome to The Little Gardener!</Text>
          <View style={profileStyles.buttonContainer}>
            <TouchableHighlight onPress={() => setMode('login')} style={profileStyles.buttonContainerGreen}>
              <Text style={profileStyles.buttonText}>Log in</Text>
            </TouchableHighlight>
          </View>
          <View style={profileStyles.buttonContainer}>
            <TouchableHighlight onPress={() => setMode('create')} style={profileStyles.buttonContainerYellow}>
              <Text style={profileStyles.buttonText}>I'm a new gardener!</Text>
            </TouchableHighlight>
          </View>
        </View>
      ) : (
        <View>
          <View>
            <TextInput
              // style={profileStyles.placeholderText}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              style={profileStyles.inputField}
            />
          </View>
          <View>
            <TextInput
              // style={profileStyles.placeholderText}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={profileStyles.inputField}
            />
          </View>
          <View style={profileStyles.buttonContainerRow}>
            <TouchableHighlight onPress={() => setMode('initial')} style={profileStyles.buttonContainerGray}>
              <Ionicons
                name="arrow-back-outline"
                size={24}
                color={"black"}
                style={{'margin': 8}}
                />
            </TouchableHighlight>
            <TouchableHighlight onPress={mode === 'login' ? handleLogin : handleCreateAccount} style={profileStyles.buttonContainerGreen}>
              <Text style={profileStyles.buttonText}>{mode === 'login' ? 'Log in' : 'Create Account'}</Text>
            </TouchableHighlight>
          </View>
          {error && <Text style={profileStyles.errorText}>{error}</Text>}
        </View>
      )}
    </View>
  );
}

const profileStyles = StyleSheet.create({
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 100
  },
  buttonContainerYellow: {
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
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  inputField: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 12,
    borderColor: '#D9D9D9',
    borderWidth: 1,
    borderRadius: 100
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center', // Align items to the center
    paddingTop: 50, // Add padding at the top
    paddingLeft: 20,
    paddingRight: 20,
    backgroundColor: 'white',
  },
  profileWrapper: {
    flexDirection: 'row', // Horizontal layout
    alignItems: 'center',
    gap: 24, // Spacing between items (React Native doesn't support `gap`, so use `margin` or `padding` manually if needed)
    marginBottom: 20,
  },
  title: {
    color: '#5167F2',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 15,
    marginBottom: 15,
    flexDirection: 'column',
    gap: 10, // React Native doesn't support `gap`, so use `marginBottom` for spacing between buttons
  },
  buttonContainerRow: {
    marginTop: 15,
    marginBottom: 15,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10, // React Native doesn't support `gap`, so use `marginBottom` for spacing between buttons
  },
  image: {
    width: 300,
    height: 300,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
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
})